import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

interface PoseMetrics {
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
  readyPosition?: string;
  contactPoint?: string;
  followThrough?: string;
  legDrive?: string;
}

interface RealMoveNetAnalyzerProps {
  videoFile: File | null;
  skill: "Setting" | "Digging";
  target?: "Left" | "Center" | "Right";
  onAnalysisComplete: (metrics: PoseMetrics, scores: Record<string, number>, confidence: number, capturedFrame?: string, rubricFrames?: RubricFrames) => void;
}

const RealMoveNetAnalyzer = ({ videoFile, skill, target = "Center", onAnalysisComplete }: RealMoveNetAnalyzerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    initializeMoveNet();
  }, []);

  const initializeMoveNet = async () => {
    try {
      console.log("🔧 Initializing TensorFlow.js and MoveNet...");
      
      // Wait for TensorFlow.js to be ready with timeout
      const tfTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TensorFlow.js loading timeout")), 15000)
      );
      
      await Promise.race([tf.ready(), tfTimeout]);
      console.log("✅ TensorFlow.js backend ready");

      // Create MoveNet detector
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      };
      
      const moveNetDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );
      
      setDetector(moveNetDetector);
      setIsReady(true);
      setRetryCount(0);
      toast.success("MoveNet pose detection ready!");
      console.log("✅ MoveNet detector initialized");
    } catch (error) {
      console.error("❌ Failed to initialize MoveNet:", error);
      
      if (retryCount < 3) {
        console.log(`🔄 Retrying initialization (${retryCount + 1}/3)...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => initializeMoveNet(), 2000);
      } else {
        toast.error("Failed to initialize pose detection after 3 attempts");
      }
    }
  };

  const analyzeVolleyballPose = (keypoints: any[], timePercentage: number): string | null => {
    if (!keypoints || keypoints.length === 0) return null;

    // Key volleyball pose analysis based on keypoint positions
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const nose = keypoints[0];

    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return null;

    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgKneeY = (leftKnee?.y || 0 + rightKnee?.y || 0) / 2;

    // Identify volleyball-specific poses based on time and position
    if (timePercentage < 0.3) {
      // Early phase - ready position analysis
      if (avgKneeY > avgShoulderY && leftKnee?.y && rightKnee?.y) {
        return 'readyFootwork';
      }
    } else if (timePercentage >= 0.3 && timePercentage <= 0.7) {
      // Contact phase
      if (skill === "Setting" && avgWristY < nose?.y) {
        return 'handShapeContact';
      } else if (skill === "Digging" && avgWristY > avgShoulderY) {
        return 'contactAngle';
      }
    } else {
      // Follow-through phase
      return 'followThroughControl';
    }

    return null;
  };

  const analyzePoseQuality = (keypoints: any[], poseType: string, skill: string): number => {
    if (!keypoints || keypoints.length === 0) return 0;

    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];

    if (skill === "Setting") {
      switch (poseType) {
        case 'readyFootwork':
          // Check knee bend and stability
          if (leftKnee && rightKnee && leftShoulder && rightShoulder) {
            const kneeFlexion = Math.abs(leftKnee.y - leftShoulder.y) / Math.abs(rightKnee.y - rightShoulder.y);
            return kneeFlexion > 0.3 ? 3 : kneeFlexion > 0.2 ? 2 : kneeFlexion > 0.1 ? 1 : 0;
          }
          break;
        case 'handShapeContact':
          // Check hand position above head
          if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
            const avgWristY = (leftWrist.y + rightWrist.y) / 2;
            const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const heightRatio = (avgShoulderY - avgWristY) / avgShoulderY;
            return heightRatio > 0.3 ? 3 : heightRatio > 0.2 ? 2 : heightRatio > 0.1 ? 1 : 0;
          }
          break;
        case 'followThroughControl':
          // Check arm extension and symmetry
          if (leftElbow && rightElbow && leftWrist && rightWrist) {
            const leftArmLength = Math.sqrt(Math.pow(leftWrist.x - leftElbow.x, 2) + Math.pow(leftWrist.y - leftElbow.y, 2));
            const rightArmLength = Math.sqrt(Math.pow(rightWrist.x - rightElbow.x, 2) + Math.pow(rightWrist.y - rightElbow.y, 2));
            const symmetry = 1 - Math.abs(leftArmLength - rightArmLength) / Math.max(leftArmLength, rightArmLength);
            return symmetry > 0.8 ? 3 : symmetry > 0.6 ? 2 : symmetry > 0.4 ? 1 : 0;
          }
          break;
      }
    } else { // Digging
      switch (poseType) {
        case 'readyFootwork':
          // Check wide stance and knee bend
          if (leftKnee && rightKnee) {
            const stanceWidth = Math.abs(leftKnee.x - rightKnee.x);
            return stanceWidth > 0.2 ? 3 : stanceWidth > 0.15 ? 2 : stanceWidth > 0.1 ? 1 : 0;
          }
          break;
        case 'contactAngle':
          // Check platform angle and contact point
          if (leftWrist && rightWrist && leftElbow && rightElbow) {
            const wristDistance = Math.abs(leftWrist.x - rightWrist.x);
            const elbowDistance = Math.abs(leftElbow.x - rightElbow.x);
            const platformQuality = wristDistance / (elbowDistance + 0.01);
            return platformQuality < 0.5 ? 3 : platformQuality < 0.7 ? 2 : platformQuality < 0.9 ? 1 : 0;
          }
          break;
        case 'followThroughControl':
          // Check follow-through direction
          if (leftShoulder && rightShoulder && leftWrist && rightWrist) {
            const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
            const wristCenter = (leftWrist.x + rightWrist.x) / 2;
            const followThrough = Math.abs(wristCenter - shoulderCenter);
            return followThrough < 0.1 ? 3 : followThrough < 0.15 ? 2 : followThrough < 0.2 ? 1 : 0;
          }
          break;
      }
    }

    return 0;
  };

  const drawKeypoints = (ctx: CanvasRenderingContext2D, keypoints: any[], width: number, height: number) => {
    // Draw pose skeleton
    const connections = [
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
      [5, 11], [6, 12], [11, 12], // Torso
      [11, 13], [13, 15], [12, 14], [14, 16] // Legs
    ];

    // Draw connections
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    connections.forEach(([from, to]) => {
      const fromKp = keypoints[from];
      const toKp = keypoints[to];
      if (fromKp && toKp && fromKp.score > 0.3 && toKp.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(fromKp.x * width, fromKp.y * height);
        ctx.lineTo(toKp.x * width, toKp.y * height);
        ctx.stroke();
      }
    });

    // Draw keypoints
    keypoints.forEach((kp: any, i: number) => {
      if (kp.score > 0.3) {
        ctx.fillStyle = i < 5 ? '#ff0000' : '#00ff00'; // Red for face, green for body
        ctx.beginPath();
        ctx.arc(kp.x * width, kp.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  const captureVideoFrame = (video: HTMLVideoElement, withKeypoints = false, keypoints?: any[]): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      if (withKeypoints && keypoints) {
        drawKeypoints(ctx, keypoints, canvas.width, canvas.height);
      }
      
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    
    return '';
  };

  const analyzeVideo = async () => {
    if (!videoFile || !videoRef.current || !detector) {
      toast.error("Missing video file or pose detector not ready");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    try {
      const video = videoRef.current;
      video.src = URL.createObjectURL(videoFile);
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        setTimeout(() => reject(new Error("Video loading timeout")), 10000);
      });

      const duration = video.duration;
      const frameInterval = 0.2; // Analyze every 0.2 seconds for better performance
      const totalFrames = Math.floor(duration / frameInterval);
      
      const poseScores: Record<string, number[]> = {
        readyFootwork: [],
        handShapeContact: [],
        contactAngle: [],
        followThroughControl: [],
        alignmentExtension: [],
        legDriveShoulder: [],
        readyPlatform: []
      };

      const rubricFrames: RubricFrames = {};
      let bestContactFrame = '';
      let totalConfidence = 0;
      let frameCount = 0;

      // Analyze frames
      for (let frame = 0; frame < totalFrames; frame++) {
        const currentTime = frame * frameInterval;
        const timePercentage = currentTime / duration;
        
        video.currentTime = currentTime;
        await new Promise((resolve) => {
          video.onseeked = resolve;
          setTimeout(resolve, 100); // Fallback timeout
        });

        try {
          const poses = await detector.estimatePoses(video);
          
          if (poses.length > 0) {
            const pose = poses[0];
            const keypoints = pose.keypoints;
            frameCount++;

            // Calculate confidence
            const avgConfidence = keypoints.reduce((sum: number, kp: any) => sum + kp.score, 0) / keypoints.length;
            totalConfidence += avgConfidence;

            // Analyze volleyball-specific pose
            const poseType = analyzeVolleyballPose(keypoints, timePercentage);
            if (poseType) {
              const quality = analyzePoseQuality(keypoints, poseType, skill);
              if (poseScores[poseType]) {
                poseScores[poseType].push(quality);
              }

              // Capture reference frames for rubric
              if (timePercentage < 0.3 && !rubricFrames.readyPosition) {
                rubricFrames.readyPosition = captureVideoFrame(video, true, keypoints);
              } else if (timePercentage >= 0.3 && timePercentage <= 0.7 && !rubricFrames.contactPoint) {
                rubricFrames.contactPoint = captureVideoFrame(video, true, keypoints);
                bestContactFrame = captureVideoFrame(video, false);
              } else if (timePercentage > 0.7 && !rubricFrames.followThrough) {
                rubricFrames.followThrough = captureVideoFrame(video, true, keypoints);
              }
            }
          }
        } catch (frameError) {
          console.warn(`Frame ${frame} analysis failed:`, frameError);
        }

        setProgress((frame / totalFrames) * 100);
      }

      // Calculate final scores and metrics
      const finalScores: Record<string, number> = {};
      const metrics: PoseMetrics = {
        kneeFlex: 0,
        elbowLock: false,
        wristAboveForehead: false,
        contactHeightRelTorso: 0,
        platformFlatness: 0,
        extensionSequence: 0,
        facingTarget: 0,
        stability: 0,
        contactFrame: Math.floor(totalFrames * 0.5)
      };

      // Calculate scores based on pose analysis with stricter criteria
      if (skill === "Setting") {
        finalScores.readyFootwork = poseScores.readyFootwork.length > 0 ? 
          Math.max(0, Math.round(poseScores.readyFootwork.reduce((a, b) => a + b, 0) / poseScores.readyFootwork.length) - 1) : 0;
        finalScores.handShapeContact = poseScores.handShapeContact.length > 0 ? 
          Math.max(0, Math.round(poseScores.handShapeContact.reduce((a, b) => a + b, 0) / poseScores.handShapeContact.length) - 1) : 0;
        finalScores.alignmentExtension = poseScores.followThroughControl.length > 0 ? 
          Math.max(0, Math.round(poseScores.followThroughControl.reduce((a, b) => a + b, 0) / poseScores.followThroughControl.length) - 1) : 0;
        finalScores.followThroughControl = finalScores.alignmentExtension;
      } else {
        finalScores.readyPlatform = poseScores.readyFootwork.length > 0 ? 
          Math.max(0, Math.round(poseScores.readyFootwork.reduce((a, b) => a + b, 0) / poseScores.readyFootwork.length) - 1) : 0;
        finalScores.contactAngle = poseScores.contactAngle.length > 0 ? 
          Math.max(0, Math.round(poseScores.contactAngle.reduce((a, b) => a + b, 0) / poseScores.contactAngle.length) - 1) : 0;
        finalScores.legDriveShoulder = poseScores.followThroughControl.length > 0 ? 
          Math.max(0, Math.round(poseScores.followThroughControl.reduce((a, b) => a + b, 0) / poseScores.followThroughControl.length) - 1) : 0;
        finalScores.followThroughControl = finalScores.legDriveShoulder;
      }

      const confidence = frameCount > 0 ? totalConfidence / frameCount : 0;

      // Convert pose analysis to legacy metrics for compatibility
      metrics.kneeFlex = finalScores.readyFootwork * 10;
      metrics.stability = confidence;
      metrics.facingTarget = confidence;
      metrics.extensionSequence = confidence;

      // Validate results before passing to callback
      if (!metrics || !finalScores || typeof confidence !== 'number') {
        throw new Error("Analysis completed but results are invalid");
      }
      
      onAnalysisComplete(metrics, finalScores, confidence, bestContactFrame, rubricFrames);
      toast.success("Real-time pose analysis complete!");

    } catch (error) {
      console.error("❌ Analysis failed:", error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      
      {isAnalyzing && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Analyzing poses with MoveNet...</p>
          <Progress value={progress} className="w-full" />
        </div>
      )}
      
      <Button
        onClick={analyzeVideo}
        disabled={!videoFile || !isReady || isAnalyzing}
        className="w-full"
        size="lg"
      >
        {isAnalyzing ? "Analyzing..." : "Analyze Technique with AI"}
      </Button>
      
      <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
        <p className="font-medium text-blue-900 mb-1">
          {isReady ? "MoveNet Pose Detection Ready" : "Loading MoveNet..."}
        </p>
        <p className="text-blue-800">
          Using TensorFlow.js MoveNet for real-time pose analysis of volleyball techniques with keypoint visualization.
        </p>
      </div>
    </div>
  );
};

export default RealMoveNetAnalyzer;