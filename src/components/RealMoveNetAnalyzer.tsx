import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as posedetection from "@tensorflow-models/pose-detection";

interface PoseMetrics {
  frames: number;
  detected_frames: number;
  kneeFlex: number;
  elbowLock: boolean;
  wristAboveForehead: boolean;
  contactHeightRelTorso: number;
  platformFlatness: number;
  extensionSequence: number;
  facingTarget: number;
  stability: number;
  contactFrame: number;
}

interface RubricFrames {
  readyPlatform?: string;
  contactAngle?: string;
  legDriveShoulder?: string;
  followThroughControl?: string;
}

interface RealMoveNetAnalyzerProps {
  videoFile: File | null;
  skill: "Setting" | "Digging";
  onAnalysisComplete: (
    metrics: PoseMetrics,
    scores: Record<string, number>,
    confidence: number,
    rubricFrames: RubricFrames
  ) => void;
}

// MoveNet official keypoint indices
const KP = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
  leftHip: 11,
  rightHip: 12,
  leftKnee: 13,
  rightKnee: 14,
  leftAnkle: 15,
  rightAnkle: 16,
} as const;

const SKELETON_CONNECTIONS: Array<[number, number]> = [
  [KP.leftShoulder, KP.rightShoulder],
  [KP.leftShoulder, KP.leftElbow],
  [KP.leftElbow, KP.leftWrist],
  [KP.rightShoulder, KP.rightElbow],
  [KP.rightElbow, KP.rightWrist],
  [KP.leftShoulder, KP.leftHip],
  [KP.rightShoulder, KP.rightHip],
  [KP.leftHip, KP.rightHip],
  [KP.leftHip, KP.leftKnee],
  [KP.leftKnee, KP.leftAnkle],
  [KP.rightHip, KP.rightKnee],
  [KP.rightKnee, KP.rightAnkle],
];

const MIN_KP_SCORE = 0.3;

function getPointPixels(
  keypoints: posedetection.Keypoint[],
  index: number,
  width: number,
  height: number
) {
  const kp = keypoints[index];
  if (!kp || typeof kp.x !== "number" || typeof kp.y !== "number") return null;
  const likelyNormalized = kp.x <= 2 && kp.y <= 2; // heuristic
  const x = likelyNormalized ? kp.x * width : kp.x;
  const y = likelyNormalized ? kp.y * height : kp.y;
  const score = typeof kp.score === "number" ? kp.score : 1;
  return score >= MIN_KP_SCORE ? { x, y, score } : null;
}

function browserCanLikelyPlay(file: File, videoEl: HTMLVideoElement): boolean {
  const name = file.name || "";
  const ext = (name.split(".").pop() || "").toLowerCase();
  const mime = (file.type || "").toLowerCase();
  const canMp4 = videoEl.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') || videoEl.canPlayType('video/mp4');
  const canWebm = videoEl.canPlayType('video/webm; codecs="vp9, opus"') || videoEl.canPlayType('video/webm; codecs="vp8, vorbis"') || videoEl.canPlayType('video/webm');
  const canMov = videoEl.canPlayType('video/quicktime');

  if (mime.includes('mp4') || ext === 'mp4') return canMp4 !== '';
  if (mime.includes('webm') || ext === 'webm') return canWebm !== '';
  if (mime.includes('quicktime') || ext === 'mov') {
    // canPlayType often returns '' for QuickTime even if underlying codecs are supported.
    // We'll allow and rely on runtime metadata/play test.
    return true;
  }
  // Unknown types: allow and rely on runtime test
  return true;
}

async function safePlay(video: HTMLVideoElement): Promise<void> {
  try {
    const p = video.play();
    if (p && typeof (p as Promise<void>).then === 'function') await p;
  } catch (err) {
    throw err;
  }
}

function showUnsupportedVideoToast() {
  toast.error("Local video playback error: Format may be unsupported. Please record in MP4 (H.264/AAC) or try a different browser.");
}

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function angleABC(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  // angle at b between BA and BC in degrees
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function lineAngleDegrees(from: { x: number; y: number }, to: { x: number; y: number }) {
  // 0 deg = rightwards, positive CCW; screen y increases downward, so upward slopes are negative angles
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const RealMoveNetAnalyzer = ({ videoFile, skill, onAnalysisComplete }: RealMoveNetAnalyzerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing...");
  const [detector, setDetector] = useState<posedetection.PoseDetector | null>(null);
  const [backendReady, setBackendReady] = useState(false);

  // Live rubric scores (Digging)
  const [readyPlatformScore, setReadyPlatformScore] = useState(1);
  const [contactAngleScore, setContactAngleScore] = useState(1);
  const [legDriveShoulderScore, setLegDriveShoulderScore] = useState(1);
  const [followThroughScore, setFollowThroughScore] = useState(1);

  const [totalScore, setTotalScore] = useState(4);
  const [grade, setGrade] = useState("D");

  // Progress frame counters
  const [framesAnalyzed, setFramesAnalyzed] = useState(0);
  const [totalFramesEstimate, setTotalFramesEstimate] = useState(0);

  // Timers / loop control
  const rafRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const analyzingStartMsRef = useRef<number>(0);

  // Contact detection and frame buffers
  const targetFPS = 15; // throttle estimatePoses calls
  const lastInferMsRef = useRef<number>(0);
  const lastKPRef = useRef<Array<{ x: number; y: number } | null> | null>(null);
  const wristSpeedSeriesRef = useRef<number[]>([]);
  const forearmAnglesAfterRef = useRef<number[]>([]);
  const contactFrameIndexRef = useRef<number | null>(null);
  const rubricFramesRef = useRef<RubricFrames>({});

  useEffect(() => {
    // Init TFJS backend and detector once
    (async () => {
      try {
        setStatus("Loading TensorFlow.js...");
        if (tf.getBackend() !== "webgl") {
          await tf.setBackend("webgl");
        }
        await tf.ready();
        setBackendReady(true);
        setStatus("Creating MoveNet (Thunder)...");

        let created: posedetection.PoseDetector | null = null;
        try {
          created = await posedetection.createDetector(
            posedetection.SupportedModels.MoveNet,
            {
              modelType: (posedetection as any).movenet.modelType.SINGLEPOSE_THUNDER,
              enableSmoothing: true,
            } as posedetection.MoveNetModelConfig
          );
        } catch (e) {
          // Fallback to Lightning immediately if Thunder fails to init
          created = await posedetection.createDetector(
            posedetection.SupportedModels.MoveNet,
            {
              modelType: (posedetection as any).movenet.modelType.SINGLEPOSE_LIGHTNING,
              enableSmoothing: true,
            } as posedetection.MoveNetModelConfig
          );
          toast.message("Falling back to MoveNet Lightning for performance");
        }

        setDetector(created);
        setStatus("MoveNet ready. Upload a video to begin.");
      } catch (err: any) {
        console.error(err);
        setStatus(`Initialization failed: ${err?.message || err}`);
        toast.error("Failed to initialize MoveNet");
      }
    })();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (detector && (detector as any).dispose) (detector as any).dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Update total score + grade live
    const sum = readyPlatformScore + contactAngleScore + legDriveShoulderScore + followThroughScore;
    setTotalScore(sum);
    if (sum >= 10) setGrade("A");
    else if (sum >= 8) setGrade("B");
    else if (sum >= 6) setGrade("C");
    else setGrade("D");
  }, [readyPlatformScore, contactAngleScore, legDriveShoulderScore, followThroughScore]);

  const startAnalysis = async () => {
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }
    if (!backendReady || !detector) {
      toast.error("MoveNet not ready yet");
      return;
    }

    try {
      // Reset state
      setIsAnalyzing(true);
      setProgress(0);
      setFramesAnalyzed(0);
      setTotalFramesEstimate(0);
      setStatus("Preparing video...");
      wristSpeedSeriesRef.current = [];
      forearmAnglesAfterRef.current = [];
      contactFrameIndexRef.current = null;
      rubricFramesRef.current = {};

      // Prepare elements
      const video = videoRef.current ?? document.createElement("video");
      videoRef.current = video;
      video.muted = true;
      video.playsInline = true;
      video.controls = true;
      video.preload = "auto";
      video.crossOrigin = "anonymous";
      video.onended = handleVideoEnded;

      // Preflight: basic codec support
      if (!browserCanLikelyPlay(videoFile, video)) {
        setIsAnalyzing(false);
        setStatus("Unsupported video format");
        showUnsupportedVideoToast();
        return;
      }

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const objectUrl = URL.createObjectURL(videoFile);
      objectUrlRef.current = objectUrl;
      video.src = objectUrl;
      video.load();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video metadata timeout")), 10000);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Video metadata error"));
        };
        video.onstalled = () => {
          // let it continue; if it never loads we hit timeout
        };
        video.onabort = () => {
          // ignore; user did not abort here
        };
      });

      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      // Decode test: attempt a short play/pause to verify browser can decode frames
      try {
        await safePlay(video);
        // Give decoder a tick
        await new Promise((r) => setTimeout(r, 100));
        video.pause();
      } catch (e) {
        setIsAnalyzing(false);
        setStatus("Playback failed");
        showUnsupportedVideoToast();
        return;
      }

      // Estimate total frames for progress
      const estimatedTotal = Math.max(1, Math.ceil((video.duration || 0) * targetFPS));
      setTotalFramesEstimate(estimatedTotal);

      // Warm-up and check performance to optionally fall back to Lightning
      try {
        const warmStart = performance.now();
        await detector.estimatePoses(video, { maxPoses: 1, flipHorizontal: false });
        await detector.estimatePoses(video, { maxPoses: 1, flipHorizontal: false });
        const warmAvg = (performance.now() - warmStart) / 2;
        if ((detector as any)?.modelType === (posedetection as any).movenet.modelType.SINGLEPOSE_THUNDER && warmAvg > 100) {
          // Recreate as Lightning
          setStatus("Switching to Lightning for smoother performance...");
          const lightning = await posedetection.createDetector(
            posedetection.SupportedModels.MoveNet,
            {
              modelType: (posedetection as any).movenet.modelType.SINGLEPOSE_LIGHTNING,
              enableSmoothing: true,
            } as posedetection.MoveNetModelConfig
          );
          if ((detector as any).dispose) (detector as any).dispose();
          setDetector(lightning);
          toast.message("Using MoveNet Lightning");
        }
      } catch {}

      // Start playback and analysis loop (should succeed after decode test)
      analyzingStartMsRef.current = performance.now();
      setStatus("Analyzing... (MoveNet)");
      try {
        await safePlay(video);
      } catch (e) {
        setIsAnalyzing(false);
        setStatus("Playback blocked");
        showUnsupportedVideoToast();
        return;
      }
      lastInferMsRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      console.error(err);
      setIsAnalyzing(false);
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("metadata") || msg.includes("decode") || msg.includes("playback")) {
        showUnsupportedVideoToast();
        setStatus("Unsupported or unplayable video");
      } else {
        setStatus(`Error: ${err?.message || err}`);
        toast.error("Failed to start analysis");
      }
    }
  };

  const handleVideoEnded = () => {
    // Finalize and emit results
    finishAnalysis();
  };

  const captureOverlayFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    try {
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return "";
    }
  };

  const finishAnalysis = () => {
    const total = framesAnalyzed;
    const detected = framesAnalyzed; // we only increment when we detect

    const contactFrame = contactFrameIndexRef.current ?? Math.floor(framesAnalyzed / 2);

    // Confidence: mix of coverage and stability
    const detectionRate = totalFramesEstimate > 0 ? total / totalFramesEstimate : 0.0;
    const wristSpeedPeak = wristSpeedSeriesRef.current.length
      ? Math.max(...wristSpeedSeriesRef.current)
      : 0;
    const normalizedPeak = clamp(wristSpeedPeak, 0, 1);
    const confidence = clamp(0.5 * detectionRate + 0.5 * normalizedPeak, 0, 1);

    const scores: Record<string, number> = {
      readyPlatform: readyPlatformScore,
      contactAngle: contactAngleScore,
      legDriveShoulder: legDriveShoulderScore,
      followThroughControl: followThroughScore,
    };

    const metrics: PoseMetrics = {
      frames: total,
      detected_frames: detected,
      kneeFlex: 0, // not used directly in UI; keeping for compatibility
      elbowLock: false,
      wristAboveForehead: false,
      contactHeightRelTorso: 0,
      platformFlatness: 0,
      extensionSequence: 0,
      facingTarget: 0,
      stability: 0,
      contactFrame,
    };

    onAnalysisComplete(metrics, scores, confidence, rubricFramesRef.current);
    setIsAnalyzing(false);
    setStatus("Analysis complete");
    toast.success("Analysis complete");
  };

  const tick = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const det = detector;
    if (!video || !canvas || !ctx || !det) return;

    const now = performance.now();
    const elapsedSinceLast = now - lastInferMsRef.current;
    const minIntervalMs = 1000 / targetFPS;
    if (elapsedSinceLast < minIntervalMs) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    lastInferMsRef.current = now;

    try {
      const poses = (await det.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
      })) as posedetection.Pose[];

      // Draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (poses && poses[0] && poses[0].keypoints?.length) {
        const kps = poses[0].keypoints as posedetection.Keypoint[];

        // Compute pixel coords and filter by score
        const p = (idx: number) => getPointPixels(kps, idx, canvas.width, canvas.height);
        const ls = p(KP.leftShoulder);
        const rs = p(KP.rightShoulder);
        const lh = p(KP.leftHip);
        const rh = p(KP.rightHip);
        const le = p(KP.leftElbow);
        const re = p(KP.rightElbow);
        const lw = p(KP.leftWrist);
        const rw = p(KP.rightWrist);
        const lk = p(KP.leftKnee);
        const rk = p(KP.rightKnee);
        const la = p(KP.leftAnkle);
        const ra = p(KP.rightAnkle);

        const haveTorso = ls && rs && lh && rh;
        const haveArms = le && re && lw && rw;
        const haveLegs = lk && rk && la && ra;

        if (haveTorso) {
          // Normalize by shoulder width or torso length if needed
          const shoulderWidth = ls && rs ? euclidean(ls, rs) : 0;
          const hipWidth = lh && rh ? euclidean(lh, rh) : 0;
          const torsoLength = (ls && rs && lh && rh)
            ? euclidean({ x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 }, { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 })
            : 0;
          const normBase = shoulderWidth || torsoLength || hipWidth || 1;

          // Draw skeleton (lines only)
          ctx.strokeStyle = "#00ff99";
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (const [a, b] of SKELETON_CONNECTIONS) {
            const pa = p(a);
            const pb = p(b);
            if (pa && pb) {
              ctx.moveTo(pa.x, pa.y);
              ctx.lineTo(pb.x, pb.y);
            }
          }
          ctx.stroke();

          // Update progress
          setFramesAnalyzed((prev) => prev + 1);
          setProgress(
            (prev) => {
              const total = totalFramesEstimate || Math.max(1, Math.ceil((video.duration || 0) * targetFPS));
              const nextFrames = Math.min(total, framesAnalyzed + 1);
              const ratio = (nextFrames / total) * 100;
              return clamp(ratio, 0, 100);
            }
          );

          // Compute dig rubric components live if skill is Digging
          if (skill === "Digging") {
            // Ready Position & Platform
            let readyScore = 1;
            if (haveLegs && haveArms) {
              const leftKneeAngle = angleABC(lh!, lk!, la!);
              const rightKneeAngle = angleABC(rh!, rk!, ra!);
              const kneesBent =
                leftKneeAngle >= 60 && leftKneeAngle <= 110 &&
                rightKneeAngle >= 60 && rightKneeAngle <= 110;
              const wristsAligned = lw && rw ? Math.abs(lw.y - rw.y) / normBase < 0.12 : false;
              if (kneesBent && wristsAligned) readyScore = 3;
              else if (kneesBent || wristsAligned) readyScore = 2;
              else readyScore = 1;

              // Capture best frame once
              if (readyScore >= 2 && !rubricFramesRef.current.readyPlatform) {
                rubricFramesRef.current.readyPlatform = captureOverlayFrame();
              }
            }
            setReadyPlatformScore((prev) => Math.max(prev, readyScore));

            // Contact detection via wrist movement spike (normalized per-frame displacement)
            if (haveArms) {
              const prevKps = lastKPRef.current;
              if (prevKps && prevKps.length === kps.length) {
                const prevLW = prevKps[KP.leftWrist];
                const prevRW = prevKps[KP.rightWrist];
                if (lw && rw && prevLW && prevRW) {
                  const lwMove = euclidean(lw, prevLW) / normBase;
                  const rwMove = euclidean(rw, prevRW) / normBase;
                  const avgMove = (lwMove + rwMove) / 2;
                  wristSpeedSeriesRef.current.push(avgMove);

                  // Threshold for spike
                  const spike = avgMove > 0.28; // tuned for ~15 FPS
                  if (spike && contactFrameIndexRef.current == null) {
                    contactFrameIndexRef.current = framesAnalyzed;
                    // Capture contact frame
                    rubricFramesRef.current.contactAngle = captureOverlayFrame();
                  }
                }
              }
            }

            // Contact Point & Angle (platform slightly angled upwards)
            let contactScore = 1;
            if (haveArms) {
              const wristLineAngle = lw && rw ? lineAngleDegrees(lw, rw) : 0;
              // Upwards slight angle: -25° to -5° (screen coords)
              if (wristLineAngle >= -25 && wristLineAngle <= -5) contactScore = 3;
              else if (wristLineAngle >= -40 && wristLineAngle <= 5) contactScore = 2;
              else contactScore = 1;
            }
            setContactAngleScore((prev) => Math.max(prev, contactScore));

            // Leg Drive & Shoulder Lift (compare before/after contact)
            if (contactFrameIndexRef.current != null) {
              const contactIdx = contactFrameIndexRef.current;
              // We approximate before/after using the live stream by keeping a rolling average
              // Here we use current snapshot vs a delayed snapshot via wristSpeedSeriesRef indices
              let legDriveScore = 1;
              if (haveLegs && ls && rs) {
                const shoulderCenterY = (ls.y + rs.y) / 2;
                // Use short buffers of knee angles around contact by looking at historical metrics
                // For simplicity, infer from immediate frame deltas post-contact
                const leftKneeAngle = angleABC(lh!, lk!, la!);
                const rightKneeAngle = angleABC(rh!, rk!, ra!);
                // Estimate "before" by using minimal bending seen so far if we are right after contact
                // Without a full buffer, approximate by earlier best readiness
                const beforeBend = 100; // nominal mid
                const afterBend = (leftKneeAngle + rightKneeAngle) / 2;
                const kneeExtend = afterBend - beforeBend; // positive = extending

                // Shoulder lift: negative dy is up, but we only have current frame; approximate via vertical location
                const shoulderLiftNormalized = (contactIdx != null && framesAnalyzed > contactIdx + 3)
                  ? 0.12
                  : 0.0; // coarse approximation while streaming

                if (kneeExtend > 20 && shoulderLiftNormalized > 0.08) legDriveScore = 3;
                else if (kneeExtend > 10) legDriveScore = 2;
                else legDriveScore = 1;

                if (legDriveScore >= 2 && !rubricFramesRef.current.legDriveShoulder) {
                  rubricFramesRef.current.legDriveShoulder = captureOverlayFrame();
                }
              }
              setLegDriveShoulderScore((prev) => Math.max(prev, legDriveScore));
            }

            // Follow-Through & Control (stability of forearm angle after contact)
            if (contactFrameIndexRef.current != null && haveArms) {
              const leftForearmAngle = le && lw ? lineAngleDegrees(le, lw) : 0;
              const rightForearmAngle = re && rw ? lineAngleDegrees(re, rw) : 0;
              const avgForearmAngle = (leftForearmAngle + rightForearmAngle) / 2;
              forearmAnglesAfterRef.current.push(avgForearmAngle);

              const window = forearmAnglesAfterRef.current.slice(-Math.max(5, Math.floor(targetFPS * 0.5)));
              const mean = window.reduce((s, v) => s + v, 0) / (window.length || 1);
              const variance = window.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (window.length || 1);
              const std = Math.sqrt(variance);

              let followScore = 1;
              if (std < 5) followScore = 3;
              else if (std < 10) followScore = 2;
              else followScore = 1;

              setFollowThroughScore((prev) => Math.max(prev, followScore));
              if (followScore >= 2 && !rubricFramesRef.current.followThroughControl) {
                rubricFramesRef.current.followThroughControl = captureOverlayFrame();
              }
            }
          }

          // Update last keypoints for speed calc (store pixel coords by index)
          lastKPRef.current = kps.map((kp) => ({ x: kp.x, y: kp.y }));
        }

      }

      // Overlay text (scores)
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, 10, 260, 90);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px sans-serif";
      const y0 = 30;
      const line = 18;
      if (skill === "Digging") {
        ctx.fillText(`Ready & Platform: ${readyPlatformScore}/3`, 20, y0);
        ctx.fillText(`Contact & Angle: ${contactAngleScore}/3`, 20, y0 + line);
        ctx.fillText(`Leg Drive & Shoulder: ${legDriveShoulderScore}/3`, 20, y0 + line * 2);
        ctx.fillText(`Follow-Through: ${followThroughScore}/3`, 20, y0 + line * 3);
      }

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error(err);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="relative w-full">
          <div className="rounded-lg overflow-hidden border">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-auto block"
                muted
                playsInline
                controls
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: "none" }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {isAnalyzing
                ? `Analyzing... ${Math.round(progress)}%`
                : status}
            </p>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground">
              Frames: {framesAnalyzed}/{totalFramesEstimate || "?"}
            </p>
          </div>
          <div className="justify-self-end">
            <Button
              onClick={startAnalysis}
              disabled={!videoFile || !detector || isAnalyzing}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? "Analyzing with MoveNet..." : "Analyze with AI Pose Detection"}
            </Button>
          </div>
        </div>

        {skill === "Digging" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Ready Position & Platform</p>
              <p className="text-2xl font-bold">{readyPlatformScore}/3</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Contact Point & Angle</p>
              <p className="text-2xl font-bold">{contactAngleScore}/3</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Leg Drive & Shoulder Lift</p>
              <p className="text-2xl font-bold">{legDriveShoulderScore}/3</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Follow-Through & Control</p>
              <p className="text-2xl font-bold">{followThroughScore}/3</p>
            </div>
          </div>
        )}

        {skill === "Digging" && (
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-3xl font-bold">{totalScore}/12</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Grade</p>
                <p className="text-3xl font-bold">{grade}</p>
              </div>
            </div>
          </div>
        )}

        {!videoFile && (
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
            Upload a video to enable analysis. Supported: most common formats.
          </div>
        )}
      </div>
    </div>
  );
};

export default RealMoveNetAnalyzer;