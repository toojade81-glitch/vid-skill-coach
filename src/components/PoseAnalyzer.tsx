import { useEffect, useRef, useState } from "react";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(true); // Simplified - always ready

  useEffect(() => {
    // Simulate model loading
    const timer = setTimeout(() => {
      setIsReady(true);
      toast.success("Pose analysis ready!");
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const analyzeVideo = async () => {
    if (!videoFile || !videoRef.current) {
      toast.error("Missing video file for analysis");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    try {
      const video = videoRef.current;
      
      // Set up video
      video.src = URL.createObjectURL(videoFile);
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Simulate analysis progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Generate simulated but realistic metrics based on skill type
      const metrics = generateSimulatedMetrics(skill, target);
      const scores = calculateScores(metrics, skill);
      const confidence = generateRealisticConfidence(skill);

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

  const generateSimulatedMetrics = (skill: string, target: string): PoseMetrics => {
    // Generate realistic but simulated metrics based on skill type
    const baseMetrics = {
      kneeFlex: 20 + Math.random() * 15, // 20-35% knee flex
      elbowLock: Math.random() > 0.3, // 70% chance of good elbow lock
      wristAboveForehead: skill === "Setting" ? Math.random() > 0.2 : false,
      contactHeightRelTorso: skill === "Setting" ? 0.85 + Math.random() * 0.1 : 0.4 + Math.random() * 0.2,
      platformFlatness: skill === "Digging" ? 5 + Math.random() * 20 : 0,
      extensionSequence: 0.5 + Math.random() * 0.4, // 0.5-0.9 score
      facingTarget: target === "Center" ? 0.8 + Math.random() * 0.2 : 0.6 + Math.random() * 0.3,
      stability: 0.6 + Math.random() * 0.3, // 0.6-0.9 stability
      contactFrame: Math.floor(Math.random() * 20) + 10 // Frame 10-30
    };

    return baseMetrics;
  };

  const generateRealisticConfidence = (skill: string): number => {
    // Simulate confidence based on skill complexity
    const baseConfidence = skill === "Setting" ? 0.75 : 0.80; // Digging slightly easier to analyze
    return Math.min(0.95, baseConfidence + (Math.random() * 0.2 - 0.1));
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

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        className="hidden"
        muted
        playsInline
      />
      
      {isAnalyzing && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Analyzing pose data...</p>
          <Progress value={progress} className="w-full" />
        </div>
      )}
      
      <Button
        onClick={analyzeVideo}
        disabled={!videoFile || !isReady || isAnalyzing}
        className="w-full"
        size="lg"
      >
        {isAnalyzing ? "Analyzing..." : "Analyze Technique"}
      </Button>
      
      <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
        <p className="font-medium text-blue-900 mb-1">Demo Mode</p>
        <p className="text-blue-800">
          This demo uses simulated pose analysis. In production, this would use real AI pose detection to analyze your volleyball technique.
        </p>
      </div>
    </div>
  );
};

export default PoseAnalyzer;