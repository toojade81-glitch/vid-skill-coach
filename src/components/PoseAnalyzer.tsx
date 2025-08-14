import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

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

interface PoseAnalyzerProps {
  videoFile: File | null;
  skill: "Setting" | "Digging";
  target: "Left" | "Center" | "Right";
  onAnalysisComplete: (metrics: PoseMetrics, scores: Record<string, number>, confidence: number) => void;
}

const PoseAnalyzer = ({ videoFile, skill, target, onAnalysisComplete }: PoseAnalyzerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);

  useEffect(() => {
    const initializePoseDetection = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };
        
        const poseDetector = await poseDetection.createDetector(model, detectorConfig);
        setDetector(poseDetector);
        toast.success("Pose detection model loaded!");
      } catch (error) {
        console.error("Failed to initialize pose detection:", error);
        toast.error("Failed to load pose detection model");
      }
    };

    initializePoseDetection();
  }, []);

  const analyzeVideo = async () => {
    if (!videoFile || !detector || !videoRef.current || !canvasRef.current) {
      toast.error("Missing required components for analysis");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // Set up video
      video.src = URL.createObjectURL(videoFile);
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const duration = video.duration;
      const frameRate = 10; // Analyze every 10th frame for performance
      const totalFrames = Math.floor(duration * frameRate);
      const poses: any[] = [];

      // Analyze frames
      for (let i = 0; i < totalFrames; i++) {
        const time = (i / frameRate);
        video.currentTime = time;
        
        await new Promise((resolve) => {
          video.onseeked = resolve;
        });

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const pose = await detector.estimatePoses(canvas);
          poses.push({ time, pose: pose[0] });
        } catch (error) {
          console.warn(`Failed to detect pose at frame ${i}:`, error);
        }

        setProgress((i / totalFrames) * 100);
      }

      // Calculate metrics
      const metrics = calculateMetrics(poses, skill, target);
      const scores = calculateScores(metrics, skill);
      const confidence = calculateConfidence(poses, metrics);

      onAnalysisComplete(metrics, scores, confidence);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const calculateMetrics = (poses: any[], skill: string, target: string): PoseMetrics => {
    // Find contact frame (frame with most action/movement)
    let contactFrame = Math.floor(poses.length / 2); // Default to middle
    
    // Calculate knee flex percentage
    const kneeFlex = poses.reduce((sum, frame) => {
      if (frame.pose?.keypoints) {
        const leftKnee = frame.pose.keypoints.find((kp: any) => kp.name === 'left_knee');
        const leftHip = frame.pose.keypoints.find((kp: any) => kp.name === 'left_hip');
        const leftAnkle = frame.pose.keypoints.find((kp: any) => kp.name === 'left_ankle');
        
        if (leftKnee && leftHip && leftAnkle && 
            leftKnee.score > 0.3 && leftHip.score > 0.3 && leftAnkle.score > 0.3) {
          const angle = calculateAngle(leftHip, leftKnee, leftAnkle);
          return sum + (180 - angle) / 180 * 100; // Convert to flex percentage
        }
      }
      return sum;
    }, 0) / poses.length;

    // Calculate elbow lock for digging
    const elbowLock = skill === "Digging" ? poses.some(frame => {
      if (frame.pose?.keypoints) {
        const leftShoulder = frame.pose.keypoints.find((kp: any) => kp.name === 'left_shoulder');
        const leftElbow = frame.pose.keypoints.find((kp: any) => kp.name === 'left_elbow');
        const leftWrist = frame.pose.keypoints.find((kp: any) => kp.name === 'left_wrist');
        
        if (leftShoulder && leftElbow && leftWrist &&
            leftShoulder.score > 0.3 && leftElbow.score > 0.3 && leftWrist.score > 0.3) {
          const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
          return angle > 160; // Nearly straight arm
        }
      }
      return false;
    }) : false;

    // Check if wrists are above forehead for setting
    const wristAboveForehead = skill === "Setting" ? poses.some(frame => {
      if (frame.pose?.keypoints) {
        const nose = frame.pose.keypoints.find((kp: any) => kp.name === 'nose');
        const leftWrist = frame.pose.keypoints.find((kp: any) => kp.name === 'left_wrist');
        
        if (nose && leftWrist && nose.score > 0.3 && leftWrist.score > 0.3) {
          return leftWrist.y < nose.y - 20; // Wrist above forehead area
        }
      }
      return false;
    }) : false;

    // Simple heuristics for other metrics
    const contactHeightRelTorso = 0.7; // Placeholder
    const platformFlatness = skill === "Digging" ? 15 : 0; // Degrees
    const extensionSequence = 0.6; // Placeholder score
    const facingTarget = 0.7; // Placeholder based on target
    const stability = 0.75; // Placeholder stability score

    return {
      kneeFlex,
      elbowLock,
      wristAboveForehead,
      contactHeightRelTorso,
      platformFlatness,
      extensionSequence,
      facingTarget,
      stability,
      contactFrame
    };
  };

  const calculateAngle = (a: any, b: any, c: any): number => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  };

  const calculateScores = (metrics: PoseMetrics, skill: string): Record<string, number> => {
    if (skill === "Setting") {
      return {
        readyFootwork: metrics.kneeFlex >= 15 && metrics.stability >= 0.6 ? (metrics.stability >= 0.8 ? 3 : 2) : (metrics.kneeFlex >= 10 ? 1 : 0),
        handShapeContact: metrics.wristAboveForehead ? (metrics.contactHeightRelTorso >= 0.9 ? 3 : 2) : (metrics.contactHeightRelTorso >= 0.7 ? 1 : 0),
        alignmentExtension: metrics.extensionSequence >= 0.7 && metrics.facingTarget >= 0.6 ? 3 : (metrics.extensionSequence >= 0.5 ? 2 : (metrics.extensionSequence >= 0.3 ? 1 : 0)),
        followThroughControl: metrics.stability >= 0.6 ? (metrics.stability >= 0.8 ? 3 : 2) : (metrics.stability >= 0.4 ? 1 : 0)
      };
    } else { // Digging
      return {
        readyPlatform: metrics.kneeFlex >= 15 && metrics.elbowLock ? (metrics.kneeFlex >= 25 ? 3 : 2) : (metrics.kneeFlex >= 10 ? 1 : 0),
        contactAngle: metrics.contactHeightRelTorso < 0.6 && metrics.platformFlatness <= 10 ? 3 : (metrics.platformFlatness <= 20 ? 2 : (metrics.platformFlatness <= 30 ? 1 : 0)),
        legDriveShoulder: metrics.stability >= 0.6 ? (metrics.stability >= 0.8 ? 3 : 2) : (metrics.stability >= 0.4 ? 1 : 0),
        followThroughControl: metrics.stability >= 0.6 ? (metrics.stability >= 0.8 ? 3 : 2) : (metrics.stability >= 0.4 ? 1 : 0)
      };
    }
  };

  const calculateConfidence = (poses: any[], metrics: PoseMetrics): number => {
    const validPoses = poses.filter(p => p.pose?.keypoints?.length > 0).length;
    const poseConfidence = validPoses / poses.length;
    
    // Factor in metric reliability
    const metricConfidence = (
      (metrics.kneeFlex > 0 ? 1 : 0) +
      (metrics.stability > 0 ? 1 : 0) +
      (metrics.facingTarget > 0 ? 1 : 0)
    ) / 3;

    return (poseConfidence + metricConfidence) / 2;
  };

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        className="hidden"
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="hidden"
      />
      
      {isAnalyzing && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Analyzing pose data...</p>
          <Progress value={progress} className="w-full" />
        </div>
      )}
      
      <Button
        onClick={analyzeVideo}
        disabled={!videoFile || !detector || isAnalyzing}
        className="w-full"
        size="lg"
      >
        {isAnalyzing ? "Analyzing..." : "Analyze Technique"}
      </Button>
    </div>
  );
};

export default PoseAnalyzer;