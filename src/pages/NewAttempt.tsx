import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Camera, Upload, Square, Play } from "lucide-react";
import { toast } from "sonner";
import PoseAnalyzer from "@/components/PoseAnalyzer";
import ScoreAdjustment from "@/components/ScoreAdjustment";

const NewAttempt = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    skill: "Setting" as "Setting" | "Digging",
    target: "Center" as "Left" | "Center" | "Right",
    notes: ""
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [step, setStep] = useState<"form" | "record" | "analyze" | "review">("form");
  const [autoScores, setAutoScores] = useState<Record<string, number>>({});
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<any>(null);
  const [confidence, setConfidence] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startCamera = async () => {
    try {
      console.log("Starting camera...");
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment", // Use back camera for better framing
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      
      console.log("Camera stream obtained:", mediaStream);
      console.log("Video tracks:", mediaStream.getVideoTracks());
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        console.log("Setting video source...");
        videoRef.current.srcObject = mediaStream;
        
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          videoRef.current?.play().catch(err => {
            console.error("Error playing video:", err);
          });
        };
      } else {
        console.error("Video ref not found");
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error(`Failed to access camera: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], 'recording.webm', { type: 'video/webm' });
      setVideoFile(file);
      setIsRecording(false);
      stopCamera();
      setStep("analyze");
    };
    
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    mediaRecorder.start();
    
    // Stop recording after 10 seconds
    setTimeout(() => {
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }, 10000);
    
    toast.success("Recording started! Will stop automatically after 10 seconds.");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error("Video file too large. Please keep under 50MB.");
        return;
      }
      setVideoFile(file);
      setStep("analyze");
    }
  };

  const handleAnalysisComplete = (analysisMetrics: any, scores: Record<string, number>, conf: number) => {
    setMetrics(analysisMetrics);
    setAutoScores(scores);
    setFinalScores(scores);
    setConfidence(conf);
    setStep("review");
  };

  const handleScoreAdjustment = (adjustedScores: Record<string, number>) => {
    setFinalScores(adjustedScores);
  };

  const saveAttempt = async () => {
    try {
      // Save to localStorage instead of database for privacy
      const attemptData = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        skill: formData.skill,
        target: formData.target,
        notes: formData.notes,
        autoScores,
        finalScores,
        metrics,
        confidence
      };

      // Get existing attempts from localStorage
      const existingAttempts = JSON.parse(localStorage.getItem('volleyball-attempts') || '[]');
      
      // Add new attempt
      existingAttempts.unshift(attemptData);
      
      // Keep only last 50 attempts to prevent excessive storage
      const trimmedAttempts = existingAttempts.slice(0, 50);
      
      // Save back to localStorage
      localStorage.setItem('volleyball-attempts', JSON.stringify(trimmedAttempts));

      toast.success("Assessment saved locally on your device!");
      navigate("/history");
    } catch (error) {
      console.error("Error saving attempt:", error);
      toast.error("Failed to save attempt");
    }
  };

  const canProceed = true; // No longer need student ID and class

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">New Assessment</h1>
        </div>

        {step === "form" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Skill</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={formData.skill === "Setting" ? "default" : "outline"}
                    onClick={() => setFormData(prev => ({ ...prev, skill: "Setting" }))}
                    className="flex-1"
                  >
                    Setting
                  </Button>
                  <Button
                    variant={formData.skill === "Digging" ? "default" : "outline"}
                    onClick={() => setFormData(prev => ({ ...prev, skill: "Digging" }))}
                    className="flex-1"
                  >
                    Digging
                  </Button>
                </div>
              </div>

              <div>
                <Label>Target Direction</Label>
                <div className="flex gap-2 mt-2">
                  {(["Left", "Center", "Right"] as const).map((target) => (
                    <Button
                      key={target}
                      variant={formData.target === target ? "default" : "outline"}
                      onClick={() => setFormData(prev => ({ ...prev, target }))}
                      className="flex-1"
                      size="sm"
                    >
                      {target}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              <Button
                onClick={() => setStep("record")}
                disabled={!canProceed}
                className="w-full"
                size="lg"
              >
                Continue to Recording
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "record" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Record Your Technique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Recording Tips:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Keep clips under 10 seconds</li>
                  <li>• Frame your full body in view</li>
                  <li>• Face slightly towards the camera</li>
                  <li>• Ensure good lighting</li>
                </ul>
              </div>

              {!stream && !isRecording && (
                <Button
                  onClick={startCamera}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              )}

              {stream && !isRecording && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-64 object-cover"
                      style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
                      onError={(e) => {
                        console.error("Video element error:", e);
                        toast.error("Video display error");
                      }}
                      onCanPlay={() => {
                        console.log("Video can play");
                      }}
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-white/50 m-4 rounded-lg pointer-events-none" />
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                      <p className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                        Position yourself within the frame
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={startRecording}
                      className="flex-1"
                      size="lg"
                      disabled={!stream}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Recording
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-64 object-cover"
                      style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
                    />
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                          RECORDING
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </Button>
                </div>
              )}

              {!isRecording && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="video-upload" className="block w-full">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload video file
                        </p>
                      </div>
                    </Label>
                    <Input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === "analyze" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Analyze Technique</CardTitle>
            </CardHeader>
            <CardContent>
              <PoseAnalyzer
                videoFile={videoFile}
                skill={formData.skill}
                target={formData.target}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </CardContent>
          </Card>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Review & Adjust Scores</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Confidence: {Math.round(confidence * 100)}%
                </p>
              </CardHeader>
              <CardContent>
                <ScoreAdjustment
                  skill={formData.skill}
                  autoScores={autoScores}
                  onScoreChange={handleScoreAdjustment}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("record")}
                className="flex-1"
              >
                Re-record
              </Button>
              <Button
                onClick={saveAttempt}
                className="flex-1"
              >
                Save Assessment
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button asChild variant="link" className="text-primary">
            <a 
              href="https://chatgpt.com/g/g-689db4d8cc888191b746cde65c6bedfe-pe-skills-assessment-coach" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              🏐 Chat with Coach GPT
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewAttempt;