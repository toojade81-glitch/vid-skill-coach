import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import { getReferenceVideo } from '@/data/referenceVideos';
import { compareKeypointSequences, KeypointFrame, ComparisonResult } from '@/utils/keypointComparison';

interface ReferenceVideoAnalyzerProps {
  selectedFile: File | null;
  skill: string;
  referenceVideoUrl: string | null;
  onAnalysisComplete: (results: any) => void;
}

// Global types for MoveNet
declare global {
  interface Window {
    tf: any;
    poseDetection: any;
  }
}

const ReferenceVideoAnalyzer: React.FC<ReferenceVideoAnalyzerProps> = ({ 
  selectedFile, 
  skill,
  referenceVideoUrl, 
  onAnalysisComplete 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const referenceVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [detector, setDetector] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisPhase, setAnalysisPhase] = useState<'loading' | 'analyzing' | 'complete' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [userKeyframes, setUserKeyframes] = useState<KeypointFrame[]>([]);
  const [referenceKeyframes, setReferenceKeyframes] = useState<KeypointFrame[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  // Initialize MoveNet detector
  useEffect(() => {
    initializeMoveNet();
  }, []);

  const initializeMoveNet = async () => {
    try {
      console.log("🔧 Initializing MoveNet for reference comparison...");
      
      if (!window.tf || !window.poseDetection) {
        setError("MoveNet libraries not loaded");
        setAnalysisPhase('error');
        return;
      }

      // Initialize TensorFlow backend
      if (!window.tf.getBackend()) {
        await window.tf.setBackend('webgl');
        await window.tf.ready();
      }

      // Create MoveNet detector
      const moveNetDetector = await window.poseDetection.createDetector(
        window.poseDetection.SupportedModels.MoveNet,
        {
          modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        }
      );

      setDetector(moveNetDetector);
      console.log("✅ MoveNet initialized for reference comparison");

    } catch (err) {
      console.error("❌ MoveNet initialization failed:", err);
      setError(err instanceof Error ? err.message : 'MoveNet initialization failed');
      setAnalysisPhase('error');
    }
  };

  const analyzeVideoFrames = async (video: HTMLVideoElement): Promise<KeypointFrame[]> => {
    if (!detector) return [];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const duration = video.duration;
    const frameCount = Math.floor(duration * 10); // 10 FPS sampling
    const frameInterval = duration / frameCount;
    const frames: KeypointFrame[] = [];

    for (let i = 0; i < frameCount; i++) {
      const time = i * frameInterval;
      
      video.currentTime = time;
      
      await new Promise(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(void 0);
        };
        video.addEventListener('seeked', onSeeked);
      });

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        // Get pose estimation for this frame
        const poses = await detector.estimatePoses(canvas);
        
        if (poses && poses.length > 0) {
          const pose = poses[0];
          const keypoints = pose.keypoints.map((kp: any) => [
            kp.x / canvas.width,  // Normalize x
            kp.y / canvas.height, // Normalize y
            kp.score || 0         // Confidence score
          ]);

          frames.push({
            keypoints,
            timestamp: time,
            confidence: calculateFrameConfidence(keypoints)
          });
        }
      } catch (frameError) {
        console.warn("Frame analysis failed:", frameError);
      }
    }

    return frames;
  };

  const calculateFrameConfidence = (keypoints: number[][]): number => {
    let totalConfidence = 0;
    let validPoints = 0;
    
    keypoints.forEach(kp => {
      if (kp && kp[2] > 0.3) {
        totalConfidence += kp[2];
        validPoints++;
      }
    });
    
    return validPoints > 0 ? totalConfidence / validPoints : 0;
  };

  const calculateScores = (userFrames: KeypointFrame[], comparison?: ComparisonResult | null) => {
    const scores = {
      technique: 70,
      timing: 75,
      power: 70,
      accuracy: 75,
      overall: 70
    };

    if (userFrames.length === 0) return scores;

    // Base movement analysis
    let movementQuality = 0;
    let consistencyScore = 0;

    for (let i = 1; i < userFrames.length; i++) {
      const current = userFrames[i].keypoints;
      const previous = userFrames[i - 1].keypoints;
      
      let frameMovement = 0;
      let validPoints = 0;
      
      for (let j = 0; j < current.length && j < previous.length; j++) {
        if (current[j][2] > 0.3 && previous[j][2] > 0.3) {
          const movement = Math.sqrt(
            Math.pow(current[j][0] - previous[j][0], 2) +
            Math.pow(current[j][1] - previous[j][1], 2)
          );
          frameMovement += movement;
          validPoints++;
        }
      }
      
      if (validPoints > 0) {
        movementQuality += frameMovement / validPoints;
      }
    }

    // Calculate confidence-based technique score
    const avgConfidence = userFrames.reduce((sum, frame) => sum + frame.confidence, 0) / userFrames.length;
    let techniqueScore = Math.min(100, avgConfidence * 150);

    // Enhance scores with reference comparison if available
    if (comparison) {
      console.log("Enhancing scores with reference comparison:", comparison);
      
      // Technique score based on similarity to reference
      techniqueScore = Math.min(100, 30 + comparison.overallSimilarity * 70);
      
      // Timing score based on sequence similarity
      const timingScore = Math.min(100, 40 + comparison.timingScore * 60);
      
      // Power and accuracy based on phase execution
      const powerScore = Math.min(100, 35 + comparison.phaseScores.execution * 65);
      const accuracyScore = Math.min(100, 30 + comparison.overallSimilarity * 70);
      
      scores.technique = Math.round(techniqueScore);
      scores.timing = Math.round(timingScore);
      scores.power = Math.round(powerScore);
      scores.accuracy = Math.round(accuracyScore);
      scores.overall = Math.round((techniqueScore + timingScore + powerScore + accuracyScore) / 4);
    } else {
      // Fallback to basic movement analysis
      scores.technique = Math.round(techniqueScore);
      scores.timing = Math.min(100, 60 + Math.min(40, userFrames.length * 2));
      scores.power = Math.min(100, 50 + Math.min(50, movementQuality * 100));
      scores.accuracy = Math.round(techniqueScore * 0.9);
      scores.overall = Math.round((scores.technique + scores.timing + scores.power + scores.accuracy) / 4);
    }

    return scores;
  };

  const analyzeVideo = useCallback(async () => {
    if (!detector || !selectedFile || !videoRef.current || !referenceVideoUrl) return;

    setIsLoading(true);
    setAnalysisPhase('analyzing');
    setProgress(0);
    setError(null);

    try {
      console.log("🔍 Starting reference comparison analysis...");
      
      // Setup user video
      const url = URL.createObjectURL(selectedFile);
      videoRef.current.src = url;
      
      await new Promise(resolve => {
        const onLoadedMetadata = () => {
          videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve(void 0);
        };
        videoRef.current?.addEventListener('loadedmetadata', onLoadedMetadata);
      });

      setProgress(10);

      // Analyze user video
      console.log("Analyzing user video...");
      const userFrames = await analyzeVideoFrames(videoRef.current);
      setUserKeyframes(userFrames);
      setProgress(50);

      // Load and analyze reference video if available
      let comparison: ComparisonResult | null = null;

      if (referenceVideoUrl && referenceVideoRef.current) {
        console.log("Loading reference video for comparison...");
        
        referenceVideoRef.current.src = referenceVideoUrl;
        
        await new Promise(resolve => {
          const onLoadedMetadata = () => {
            referenceVideoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve(void 0);
          };
          referenceVideoRef.current?.addEventListener('loadedmetadata', onLoadedMetadata);
        });

        // Analyze reference video
        const referenceFrames = await analyzeVideoFrames(referenceVideoRef.current);
        setReferenceKeyframes(referenceFrames);
        
        if (referenceFrames.length > 0 && userFrames.length > 0) {
          comparison = compareKeypointSequences(userFrames, referenceFrames);
          setComparisonResult(comparison);
          console.log("Comparison result:", comparison);
        }
      }

      setProgress(90);

      // Calculate final scores
      const scores = calculateScores(userFrames, comparison);
      
      const results = {
        scores,
        comparison,
        userFrames: userFrames.length,
        referenceFrames: referenceKeyframes.length,
        metrics: {
          similarity: comparison?.overallSimilarity || 0,
          timing: comparison?.timingScore || 0,
          confidence: userFrames.reduce((sum, f) => sum + f.confidence, 0) / userFrames.length
        }
      };

      setProgress(100);
      setAnalysisResults(results);
      setAnalysisPhase('complete');
      onAnalysisComplete(results);

      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalysisPhase('error');
    } finally {
      setIsLoading(false);
    }
  }, [detector, selectedFile, skill, onAnalysisComplete]);

  // Mock reference frames for demonstration
  const generateMockReferenceFrames = (skill: string): KeypointFrame[] => {
    const mockFrames: KeypointFrame[] = [];
    const frameCount = 30; // 3 seconds at 10 FPS
    
    for (let i = 0; i < frameCount; i++) {
      const t = i / frameCount; // Time progression 0 to 1
      
      // Generate idealized keypoints for volleyball skills
      const keypoints = generateIdealVolleyballPose(skill, t);
      
      mockFrames.push({
        keypoints,
        timestamp: t * 3, // 3 second duration
        confidence: 0.85 + Math.random() * 0.1
      });
    }
    
    return mockFrames;
  };

  const generateIdealVolleyballPose = (skill: string, timeProgress: number): number[][] => {
    // Generate 17 keypoints for COCO pose format
    const keypoints: number[][] = [];
    
    // Basic body structure (normalized coordinates)
    const centerX = 0.5;
    const headY = 0.15;
    const shoulderY = 0.25;
    const hipY = 0.55;
    const kneeY = 0.75;
    const ankleY = 0.95;
    
    if (skill === 'Serve') {
      // Serving motion progression
      const armHeight = 0.1 + Math.sin(timeProgress * Math.PI) * 0.15; // Arm swing
      const bodyLean = Math.sin(timeProgress * Math.PI * 0.5) * 0.05;
      
      keypoints.push(
        [centerX, headY, 0.9], // nose
        [centerX - 0.02, headY - 0.02, 0.9], // left_eye  
        [centerX + 0.02, headY - 0.02, 0.9], // right_eye
        [centerX - 0.03, headY, 0.8], // left_ear
        [centerX + 0.03, headY, 0.8], // right_ear
        [centerX - 0.12 + bodyLean, shoulderY, 0.9], // left_shoulder
        [centerX + 0.12 + bodyLean, shoulderY, 0.9], // right_shoulder
        [centerX - 0.08, shoulderY + 0.15, 0.8], // left_elbow
        [centerX + 0.15, shoulderY + armHeight, 0.9], // right_elbow (serving arm)
        [centerX - 0.05, shoulderY + 0.25, 0.8], // left_wrist
        [centerX + 0.18, shoulderY + armHeight + 0.1, 0.9], // right_wrist
        [centerX - 0.08, hipY, 0.9], // left_hip
        [centerX + 0.08, hipY, 0.9], // right_hip
        [centerX - 0.08, kneeY - timeProgress * 0.05, 0.8], // left_knee
        [centerX + 0.08, kneeY - timeProgress * 0.05, 0.8], // right_knee
        [centerX - 0.08, ankleY, 0.8], // left_ankle
        [centerX + 0.08, ankleY, 0.8]  // right_ankle
      );
    } else {
      // Default pose for other skills
      keypoints.push(
        [centerX, headY, 0.9],
        [centerX - 0.02, headY - 0.02, 0.9],
        [centerX + 0.02, headY - 0.02, 0.9],
        [centerX - 0.03, headY, 0.8],
        [centerX + 0.03, headY, 0.8],
        [centerX - 0.12, shoulderY, 0.9],
        [centerX + 0.12, shoulderY, 0.9],
        [centerX - 0.15, shoulderY + 0.15, 0.8],
        [centerX + 0.15, shoulderY + 0.15, 0.8],
        [centerX - 0.18, shoulderY + 0.25, 0.8],
        [centerX + 0.18, shoulderY + 0.25, 0.8],
        [centerX - 0.08, hipY, 0.9],
        [centerX + 0.08, hipY, 0.9],
        [centerX - 0.08, kneeY, 0.8],
        [centerX + 0.08, kneeY, 0.8],
        [centerX - 0.08, ankleY, 0.8],
        [centerX + 0.08, ankleY, 0.8]
      );
    }
    
    return keypoints;
  };

  // Load video when file changes
  useEffect(() => {
    if (selectedFile && detector && referenceVideoUrl) {
      analyzeVideo();
    }
  }, [selectedFile, detector, referenceVideoUrl, analyzeVideo]);

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        className="w-full max-w-md mx-auto rounded-lg border hidden"
        muted
        playsInline
      />
      
      <video
        ref={referenceVideoRef}
        className="hidden"
        muted
        playsInline
      />
      
      <canvas
        ref={canvasRef}
        className="hidden"
      />
      
      {analysisPhase === 'loading' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading AI model for reference comparison...</p>
        </div>
      )}

      {analysisPhase === 'analyzing' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="animate-pulse text-primary font-medium mb-2">
              {progress < 25 ? 'Analyzing your video...' : 
               progress < 75 ? 'Comparing with reference technique...' : 
               'Calculating similarity scores...'}
            </div>
            <Progress value={progress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
          </div>
        </div>
      )}

      {analysisPhase === 'error' && error && (
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {analysisPhase === 'complete' && analysisResults && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Reference Comparison Complete!</span>
          </div>
          
          {comparisonResult && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Similarity to Expert Technique</p>
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {Math.round(comparisonResult.overallSimilarity * 100)}%
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="font-medium">Preparation</div>
                  <div>{Math.round(comparisonResult.phaseScores.preparation * 100)}%</div>
                </div>
                <div>
                  <div className="font-medium">Execution</div>
                  <div>{Math.round(comparisonResult.phaseScores.execution * 100)}%</div>
                </div>
                <div>
                  <div className="font-medium">Follow-through</div>
                  <div>{Math.round(comparisonResult.phaseScores.followThrough * 100)}%</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analysisResults.scores.technique}</div>
              <div className="text-sm text-muted-foreground">Technique</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analysisResults.scores.timing}</div>
              <div className="text-sm text-muted-foreground">Timing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analysisResults.scores.power}</div>
              <div className="text-sm text-muted-foreground">Power</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analysisResults.scores.accuracy}</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>

          <div className="mt-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Overall Score: {analysisResults.scores.overall}/100
            </Badge>
          </div>

          {comparisonResult && comparisonResult.keyPointDeviations.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-900 mb-2">Areas for Improvement</p>
              <div className="space-y-1">
                {comparisonResult.keyPointDeviations.slice(0, 3).map((deviation, index) => (
                  <p key={index} className="text-xs text-orange-700">
                    <strong>{deviation.point.replace('_', ' ')}:</strong> Focus on better positioning relative to expert technique
                  </p>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={() => {
              setAnalysisPhase('loading');
              setAnalysisResults(null);
              setComparisonResult(null);
              setProgress(0);
              analyzeVideo();
            }}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Re-analyze with Reference
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReferenceVideoAnalyzer;