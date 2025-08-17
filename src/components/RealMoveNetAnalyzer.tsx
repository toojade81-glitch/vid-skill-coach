import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as posedetection from "@tensorflow-models/pose-detection";
import { isBrowserLikelyToPlay } from "@/lib/videoCompatibility";

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

type FrameFeatures = {
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  stanceWidthNorm: number | null; // ankle distance / shoulder width
  faceWidth: number | null; // eye/ear distance or fallback
  wristSepToFaceNorm: number | null; // wrist distance / faceWidth
  wristsAboveShoulder: boolean;
  wristsAboveForehead: boolean;
  shoulderLevelDevNorm: number | null; // |ls.y - rs.y| / shoulderWidth
  hipLevelDevNorm: number | null; // |lh.y - rh.y| / shoulderWidth
  torsoAngleFromHorizontalDeg: number | null; // angle of hip->shoulder center
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  noseY: number | null;
  shoulderCenterY: number | null;
  lwY: number | null;
  rwY: number | null;
  torsoLength: number | null;
  shoulderWidth: number | null;
};

function getPointPixels(
  keypoints: posedetection.Keypoint[],
  index: number,
  width: number,
  height: number
) {
  const kp = keypoints[index];
  if (!kp || typeof kp.x !== "number" || typeof kp.y !== "number") return null;
  const score = typeof kp.score === "number" ? kp.score : 1;
  // MoveNet returns pixel coordinates already; do not normalize by canvas
  return score >= MIN_KP_SCORE ? { x: kp.x, y: kp.y, score } : null;
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

  // Live rubric scores (Setting)
  const [readyFootworkScore, setReadyFootworkScore] = useState(1);
  const [handShapeContactScore, setHandShapeContactScore] = useState(1);
  const [alignmentExtensionScore, setAlignmentExtensionScore] = useState(1);
  const [followThroughSettingScore, setFollowThroughSettingScore] = useState(1);

  const [totalScore, setTotalScore] = useState(4);
  const [grade, setGrade] = useState("D");
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [jsonExport, setJsonExport] = useState("");

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
  const frameSeriesRef = useRef<FrameFeatures[]>([]);

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
    // Update total score + grade live for the active skill
    if (skill === "Digging") {
      const sum = readyPlatformScore + contactAngleScore + legDriveShoulderScore + followThroughScore;
      setTotalScore(sum);
      if (sum >= 10) setGrade("A");
      else if (sum >= 8) setGrade("B");
      else if (sum >= 6) setGrade("C");
      else setGrade("D");
    } else {
      const sum = readyFootworkScore + handShapeContactScore + alignmentExtensionScore + followThroughSettingScore;
      setTotalScore(sum);
      if (sum >= 10) setGrade("A");
      else if (sum >= 8) setGrade("B");
      else if (sum >= 6) setGrade("C");
      else setGrade("D");
    }
  }, [skill, readyPlatformScore, contactAngleScore, legDriveShoulderScore, followThroughScore, readyFootworkScore, handShapeContactScore, alignmentExtensionScore, followThroughSettingScore]);

  const startAnalysis = async () => {
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }
    if (!backendReady || !detector) {
      toast.error("MoveNet not ready yet");
      return;
    }

    // New: verify local playback support before analysis
    try {
      const compat = await isBrowserLikelyToPlay(videoFile);
      if (!compat.playable) {
        toast.error(
          compat.details === "HEVC/H.265 not supported by this browser"
            ? "Local video playback error: Format may be unsupported (HEVC/H.265). Please record in MP4 (H.264/AAC) or try a different browser."
            : `Local video playback error: ${compat.details}. Please record in MP4 (H.264/AAC) or try a different browser.`
        );
        return;
      }
    } catch {}

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
      frameSeriesRef.current = [];
      setReadyPlatformScore(1);
      setContactAngleScore(1);
      setLegDriveShoulderScore(1);
      setFollowThroughScore(1);
      setReadyFootworkScore(1);
      setHandShapeContactScore(1);
      setAlignmentExtensionScore(1);
      setFollowThroughSettingScore(1);
      setCurrentConfidence(0);
      setJsonExport("");

      // Prepare elements
      const video = videoRef.current ?? document.createElement("video");
      videoRef.current = video;
      video.muted = true;
      video.setAttribute("muted", "");
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.controls = true;
      video.preload = "metadata";
      video.onended = handleVideoEnded;

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const objectUrl = URL.createObjectURL(videoFile);
      objectUrlRef.current = objectUrl;
      video.src = objectUrl;
      // Ensure the browser starts fetching metadata immediately
      try { video.load(); } catch {}

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Video metadata timeout")), 15000);
        const onLoaded = () => {
          clearTimeout(timer);
          cleanup();
          resolve();
        };
        const onError = (ev: any) => {
          clearTimeout(timer);
          console.error("❌ Local video load error:", { error: (video as any)?.error, event: ev });
          cleanup();
          reject(new Error("Failed to load video"));
        };
        const cleanup = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("canplay", onLoaded);
          video.removeEventListener("error", onError);
        };
        video.addEventListener("loadedmetadata", onLoaded, { once: true });
        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener("canplay", onLoaded, { once: true });
        video.addEventListener("error", onError, { once: true });
      });

      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

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

      // Start playback and analysis loop
      analyzingStartMsRef.current = performance.now();
      setStatus("Analyzing... (MoveNet)");
      try {
        await video.play();
      } catch (err) {
        console.warn("Autoplay failed, continuing without playback:", err);
      }
      lastInferMsRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      console.error(err);
      setIsAnalyzing(false);
      setStatus(`Error: ${err?.message || err}`);
      toast.error("Failed to start analysis");
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
    setCurrentConfidence(confidence);

    if (confidence < 0.4) {
      toast.message("Low confidence — please re-record.");
    }

    let scores: Record<string, number> = {};

    // Default metrics structure; some fields are reused loosely across skills
    let metrics: PoseMetrics = {
      frames: total,
      detected_frames: detected,
      kneeFlex: 0,
      elbowLock: false,
      wristAboveForehead: false,
      contactHeightRelTorso: 0,
      platformFlatness: 0,
      extensionSequence: 0,
      facingTarget: 0,
      stability: 0,
      contactFrame,
    };

    if (skill === "Digging") {
      scores = {
        readyPlatform: readyPlatformScore,
        contactAngle: contactAngleScore,
        legDriveShoulder: legDriveShoulderScore,
        followThroughControl: followThroughScore,
      };
    } else {
      // Compute Setting subscores using pre/contact/post windows
      const series = frameSeriesRef.current;
      const N = series.length;
      const c = clamp(contactFrame, 0, Math.max(0, N - 1));
      const PRE = Math.max(3, Math.floor(targetFPS * 0.6));
      const POST = Math.max(4, Math.floor(targetFPS * 0.8));
      const preStart = Math.max(0, c - PRE);
      const postEnd = Math.min(N, c + POST);
      const contactStart = Math.max(0, c - 1);
      const contactEnd = Math.min(N, c + 2);

      const pre = series.slice(preStart, c);
      const contactWin = series.slice(contactStart, contactEnd);
      const post = series.slice(c + 1, postEnd);

      // Ready Footwork & Base
      const preKneeFrames = pre.filter(f => f.leftKneeAngle != null && f.rightKneeAngle != null);
      const kneesBentCount = preKneeFrames.filter(f => (f.leftKneeAngle! >= 70 && f.leftKneeAngle! <= 110) && (f.rightKneeAngle! >= 70 && f.rightKneeAngle! <= 110)).length;
      const kneesBentRatio = preKneeFrames.length ? kneesBentCount / preKneeFrames.length : 0;
      const preStanceFrames = pre.filter(f => f.stanceWidthNorm != null);
      const stanceWideCount = preStanceFrames.filter(f => (f.stanceWidthNorm! > 1.0)).length;
      const stanceWideRatio = preStanceFrames.length ? stanceWideCount / preStanceFrames.length : 0;
      let rfScore = 1;
      if (kneesBentRatio >= 0.6 && stanceWideRatio >= 0.6) rfScore = 3;
      else if (kneesBentRatio >= 0.4 || stanceWideRatio >= 0.4) rfScore = 2;
      setReadyFootworkScore(rfScore);

      // Hand Shape & Contact Window
      const contactHas = contactWin.filter(f => f.faceWidth && f.wristSepToFaceNorm != null && f.shoulderCenterY != null).length > 0;
      const wristsAboveShoulderRatio = contactWin.length ? contactWin.filter(f => f.wristsAboveShoulder).length / contactWin.length : 0;
      const sepOkRatio = contactWin.length ? contactWin.filter(f => f.faceWidth && f.wristSepToFaceNorm! >= 0.6 && f.wristSepToFaceNorm! <= 1.2).length / contactWin.length : 0;
      const wristsAboveForeheadRatio = contactWin.length ? contactWin.filter(f => f.wristsAboveForehead).length / contactWin.length : 0;
      let hsScore = 1;
      if (contactHas) {
        const okCount = (wristsAboveShoulderRatio >= 0.6 ? 1 : 0) + (sepOkRatio >= 0.6 ? 1 : 0) + (wristsAboveForeheadRatio >= 0.6 ? 1 : 0);
        if (okCount >= 3) hsScore = 3;
        else if (okCount >= 2) hsScore = 2;
        else hsScore = 1;
      }
      setHandShapeContactScore(hsScore);

      // Alignment & Extension
      // Levelness at contact
      const levelFrames = contactWin.filter(f => f.shoulderLevelDevNorm != null && f.hipLevelDevNorm != null);
      const meanShoulderDev = levelFrames.reduce((s, f) => s + (f.shoulderLevelDevNorm || 0), 0) / (levelFrames.length || 1);
      const meanHipDev = levelFrames.reduce((s, f) => s + (f.hipLevelDevNorm || 0), 0) / (levelFrames.length || 1);
      let levelnessScore = 1;
      if (meanShoulderDev < 0.06 && meanHipDev < 0.06) levelnessScore = 3;
      else if (meanShoulderDev < 0.1 && meanHipDev < 0.1) levelnessScore = 2;

      // Upright alignment at contact
      const uprightFrames = contactWin.filter(f => f.torsoAngleFromHorizontalDeg != null);
      const meanTorsoAngle = uprightFrames.reduce((s, f) => s + Math.abs(90 - Math.abs(f.torsoAngleFromHorizontalDeg || 0)), 0) / (uprightFrames.length || 1);
      let uprightScore = 1;
      if (meanTorsoAngle <= 12) uprightScore = 3;
      else if (meanTorsoAngle <= 20) uprightScore = 2;

      // Arm extension delta from pre to post (elbow angle increase)
      const preElbows = pre.filter(f => f.leftElbowAngle != null && f.rightElbowAngle != null);
      const postElbows = post.filter(f => f.leftElbowAngle != null && f.rightElbowAngle != null);
      const preElbowMean = preElbows.length ? preElbows.reduce((s, f) => s + ((f.leftElbowAngle! + f.rightElbowAngle!) / 2), 0) / preElbows.length : 0;
      const postElbowMean = postElbows.length ? postElbows.reduce((s, f) => s + ((f.leftElbowAngle! + f.rightElbowAngle!) / 2), 0) / postElbows.length : 0;
      const elbowDelta = postElbowMean - preElbowMean;
      let extensionScore = 1;
      if (elbowDelta > 25) extensionScore = 3;
      else if (elbowDelta > 12) extensionScore = 2;

      const aeScore = clamp(Math.round((levelnessScore + uprightScore + extensionScore) / 3), 1, 3);
      setAlignmentExtensionScore(aeScore);

      // Follow-Through & Control (post contact): wrists above forehead, low variance
      const postFrames = post.filter(f => f.lwY != null && f.rwY != null && f.noseY != null && f.torsoLength != null);
      const aboveForeheadCount = postFrames.filter(f => (f.noseY! - (f.lwY || 0)) / (f.torsoLength || 1) > 0.05 && (f.noseY! - (f.rwY || 0)) / (f.torsoLength || 1) > 0.05).length;
      const aboveRatio = postFrames.length ? aboveForeheadCount / postFrames.length : 0;
      // stability via wrist y std normalized by torso length
      const wristYNorms = postFrames.map(f => ((f.lwY! + f.rwY!) / 2) / (f.torsoLength || 1));
      const wMean = wristYNorms.reduce((s, v) => s + v, 0) / (wristYNorms.length || 1);
      const wVar = wristYNorms.reduce((s, v) => s + (v - wMean) * (v - wMean), 0) / (wristYNorms.length || 1);
      const wStd = Math.sqrt(wVar);
      let ftScore = 1;
      if (aboveRatio >= 0.6 && wStd < 0.05) ftScore = 3;
      else if (aboveRatio >= 0.4 && wStd < 0.08) ftScore = 2;
      setFollowThroughSettingScore(ftScore);

      scores = {
        readyFootwork: rfScore,
        handShapeContact: hsScore,
        alignmentExtension: aeScore,
        followThroughControl: ftScore,
      };

      // Populate a few metrics for export/debug
      metrics.kneeFlex = Math.round(((preKneeFrames.reduce((s, f) => s + (f.leftKneeAngle || 0), 0) / (preKneeFrames.length || 1)) + (preKneeFrames.reduce((s, f) => s + (f.rightKneeAngle || 0), 0) / (preKneeFrames.length || 1))) / 2);
      metrics.wristAboveForehead = aboveRatio >= 0.5;
      metrics.contactHeightRelTorso = contactWin.length ? (contactWin.reduce((s, f) => s + (((f.noseY || 0) - ((f.lwY || 0) + (f.rwY || 0)) / 2) / ((f.torsoLength || 1))), 0) / contactWin.length) : 0;
      metrics.platformFlatness = 0; // not used here
      metrics.extensionSequence = elbowDelta;
      metrics.stability = wStd;
    }

    onAnalysisComplete(metrics, scores, confidence, rubricFramesRef.current);
    setIsAnalyzing(false);
    setStatus("Analysis complete");
    toast.success("Analysis complete");

    // Prepare JSON export for quick copy
    try {
      const exportObj = { scores, metrics, grade, confidence };
      setJsonExport(JSON.stringify(exportObj, null, 2));
    } catch {}
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
        const nose = p(KP.nose);
        const lEye = p(KP.leftEye);
        const rEye = p(KP.rightEye);
        const lEar = p(KP.leftEar);
        const rEar = p(KP.rightEar);

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

          // Draw keypoints
          ctx.fillStyle = "#00ff99";
          for (let i = 0; i <= 16; i++) {
            const kp = p(i);
            if (kp) {
              ctx.beginPath();
              ctx.arc(kp.x, kp.y, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }

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

          // Contact detection also for Setting (wrist velocity spike)
          if (skill === "Setting" && haveArms) {
            const prevKps = lastKPRef.current;
            if (prevKps && prevKps.length === kps.length) {
              const prevLW = prevKps[KP.leftWrist];
              const prevRW = prevKps[KP.rightWrist];
              if (lw && rw && prevLW && prevRW) {
                const lwMove = euclidean(lw, prevLW) / normBase;
                const rwMove = euclidean(rw, prevRW) / normBase;
                const avgMove = (lwMove + rwMove) / 2;
                wristSpeedSeriesRef.current.push(avgMove);
                const spike = avgMove > 0.28;
                if (spike && contactFrameIndexRef.current == null) {
                  contactFrameIndexRef.current = framesAnalyzed;
                }
              }
            }
          }

          // Update last keypoints for speed calc (store pixel coords by index)
          lastKPRef.current = kps.map((kp) => ({ x: kp.x, y: kp.y }));

          // Frame feature capture for Setting analysis
          if (skill === "Setting") {
            const shoulderCenterY = (ls.y + rs.y) / 2;
            let faceWidth: number | null = null;
            if (lEye && rEye) faceWidth = euclidean(lEye, rEye);
            else if (lEar && rEar) faceWidth = euclidean(lEar, rEar);
            else if (shoulderWidth > 0) faceWidth = shoulderWidth * 0.35; // fallback

            const stanceWidth = la && ra ? euclidean(la, ra) : null;
            const stanceWidthNorm = stanceWidth && shoulderWidth ? stanceWidth / shoulderWidth : null;

            const leftKneeAngle = haveLegs ? angleABC(lh!, lk!, la!) : null;
            const rightKneeAngle = haveLegs ? angleABC(rh!, rk!, ra!) : null;

            const leftElbowAngle = haveArms ? angleABC(ls!, le!, lw!) : null;
            const rightElbowAngle = haveArms ? angleABC(rs!, re!, rw!) : null;

            const wristSep = lw && rw ? euclidean(lw, rw) : null;
            const wristSepToFaceNorm = wristSep && faceWidth ? wristSep / faceWidth : null;

            const wristsAboveShoulder = !!(lw && rw && shoulderCenterY && lw.y < shoulderCenterY && rw.y < shoulderCenterY);
            const wristsAboveForehead = !!(lw && rw && nose && torsoLength && (nose.y - lw.y) / (torsoLength || 1) > 0.05 && (nose.y - rw.y) / (torsoLength || 1) > 0.05);

            const shoulderLevelDevNorm = shoulderWidth ? Math.abs(ls.y - rs.y) / shoulderWidth : null;
            const hipLevelDevNorm = shoulderWidth ? Math.abs(lh!.y - rh!.y) / shoulderWidth : null;

            const shoulderCenter = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
            const hipCenter = { x: (lh!.x + rh!.x) / 2, y: (lh!.y + rh!.y) / 2 };
            const torsoAngleFromHorizontalDeg = lineAngleDegrees(hipCenter, shoulderCenter);

            frameSeriesRef.current.push({
              leftKneeAngle,
              rightKneeAngle,
              stanceWidthNorm,
              faceWidth,
              wristSepToFaceNorm,
              wristsAboveShoulder,
              wristsAboveForehead,
              shoulderLevelDevNorm,
              hipLevelDevNorm,
              torsoAngleFromHorizontalDeg,
              leftElbowAngle,
              rightElbowAngle,
              noseY: nose ? nose.y : null,
              shoulderCenterY,
              lwY: lw ? lw.y : null,
              rwY: rw ? rw.y : null,
              torsoLength,
              shoulderWidth,
            });
          }
        }

      }

      // Overlay text (scores)
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, 10, 320, 110);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px sans-serif";
      const y0 = 30;
      const line = 18;
      if (skill === "Digging") {
        ctx.fillText(`Ready & Platform: ${readyPlatformScore}/3`, 20, y0);
        ctx.fillText(`Contact & Angle: ${contactAngleScore}/3`, 20, y0 + line);
        ctx.fillText(`Leg Drive & Shoulder: ${legDriveShoulderScore}/3`, 20, y0 + line * 2);
        ctx.fillText(`Follow-Through: ${followThroughScore}/3`, 20, y0 + line * 3);
        ctx.fillText(`Total: ${readyPlatformScore + contactAngleScore + legDriveShoulderScore + followThroughScore}/12  Grade: ${grade}`, 20, y0 + line * 4);
      } else {
        ctx.fillText(`Ready Footwork & Base: ${readyFootworkScore}/3`, 20, y0);
        ctx.fillText(`Hand Shape & Window: ${handShapeContactScore}/3`, 20, y0 + line);
        ctx.fillText(`Alignment & Extension: ${alignmentExtensionScore}/3`, 20, y0 + line * 2);
        ctx.fillText(`Follow-Through & Control: ${followThroughSettingScore}/3`, 20, y0 + line * 3);
        ctx.fillText(`Total: ${readyFootworkScore + handShapeContactScore + alignmentExtensionScore + followThroughSettingScore}/12  Grade: ${grade}  Conf: ${Math.round(currentConfidence * 100)}%`, 20, y0 + line * 4);
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

        {skill === "Setting" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Ready Footwork & Base</p>
              <p className="text-2xl font-bold">{readyFootworkScore}/3</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Hand Shape & Contact Window</p>
              <p className="text-2xl font-bold">{handShapeContactScore}/3</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Alignment & Extension</p>
              <p className="text-2xl font-bold">{alignmentExtensionScore}/3</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Follow-Through & Control</p>
              <p className="text-2xl font-bold">{followThroughSettingScore}/3</p>
            </div>
          </div>
        )}

        {(skill === "Digging") && (
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

        {(skill === "Setting") && (
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-3xl font-bold">{totalScore}/12</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Grade</p>
                <p className="text-3xl font-bold">{grade}</p>
                <p className="text-xs text-muted-foreground">Confidence: {Math.round(currentConfidence * 100)}%</p>
              </div>
            </div>
          </div>
        )}

        {!isAnalyzing && jsonExport && (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-sm font-medium mb-2">JSON Export</p>
            <pre className="text-xs overflow-auto whitespace-pre-wrap">{jsonExport}</pre>
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