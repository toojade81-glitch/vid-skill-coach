import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Camera, Upload, Square, Play, RotateCcw } from "lucide-react";
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
  const [capturedFrame, setCapturedFrame] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startCamera = async (facingMode: "user" | "environment" = cameraFacing) => {
    try {
      console.log(`🎥 Starting camera with facing: ${facingMode}...`);
      
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      // Try the requested camera first, then fallback
      const constraints = [
        { video: { facingMode: facingMode }, audio: false },
        { video: { facingMode: { exact: facingMode } }, audio: false },
        { video: true, audio: false } // Ultimate fallback
      ];

      let mediaStream = null;
      let lastError = null;

      for (const constraint of constraints) {
        try {
          console.log("🔄 Trying camera constraint:", constraint);
          mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log("✅ Camera stream obtained successfully!");
          break;
        } catch (err) {
          console.log("❌ Failed with constraint:", constraint, err);
          lastError = err;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error("No camera access available");
      }

      console.log("📹 Video tracks:", mediaStream.getVideoTracks());
      setStream(mediaStream);
      setCameraFacing(facingMode);
      
      // Wait a moment for state to update
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          console.log("🔗 Connecting stream to video element...");
          videoRef.current.srcObject = mediaStream;
          
          videoRef.current.onloadedmetadata = () => {
            console.log("📊 Video metadata loaded, attempting to play...");
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => console.log("▶️ Video playing successfully!"))
                .catch(err => {
                  console.error("❌ Video play failed:", err);
                  toast.error("Failed to start video playback");
                });
            }
          };

          videoRef.current.onerror = (e) => {
            console.error("❌ Video element error:", e);
            toast.error("Video display error");
          };
        } else {
          console.error("❌ Video ref or stream not available");
        }
      }, 100);

    } catch (error) {
      console.error("❌ Camera error:", error);
      toast.error(`Camera failed: ${error.message}`);
    }
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === "user" ? "environment" : "user";
    console.log(`🔄 Switching camera from ${cameraFacing} to ${newFacing}`);
    await startCamera(newFacing);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    console.log("🔴 startRecording called");
    console.log("📹 Stream available:", !!stream);
    console.log("🎥 Video ref available:", !!videoRef.current);
    console.log("📱 Video ref playing:", !videoRef.current?.paused);
    
    if (!stream) {
      console.error("❌ No stream available for recording");
      toast.error("Camera not available for recording");
      return;
    }

    console.log("🔴 Starting recording...");
    console.log("📹 Stream active tracks:", stream.getVideoTracks().map(t => ({ 
      id: t.id, 
      readyState: t.readyState,
      enabled: t.enabled 
    })));
    
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      console.log("📦 Recording data chunk received, size:", e.data.size);
      chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      console.log("⏹️ Recording stopped, creating video file...");
      console.log("📦 Total chunks:", chunks.length);
      const blob = new Blob(chunks, { type: 'video/webm' });
      console.log("📁 Blob created, size:", blob.size);
      const file = new File([blob], 'recording.webm', { type: 'video/webm' });
      console.log("📄 File created:", file.name, file.size);
      setVideoFile(file);
      setIsRecording(false);
      // Keep camera stream active for continued viewfinder
      console.log("✅ Video file created, moving to analysis");
      console.log("📹 Stream still active:", stream.getVideoTracks().map(t => t.readyState));
      setStep("analyze");
    };

    mediaRecorder.onerror = (e) => {
      console.error("❌ MediaRecorder error:", e);
      toast.error("Recording failed");
      setIsRecording(false);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    
    try {
      mediaRecorder.start();
      console.log("▶️ MediaRecorder started successfully");
      console.log("📹 Video element playing state:", !videoRef.current?.paused);
      console.log("🎬 Video element srcObject:", !!videoRef.current?.srcObject);
      
      // Stop recording after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          console.log("⏰ Auto-stopping recording after 10 seconds");
          mediaRecorder.stop();
        }
      }, 10000);
      
      toast.success("Recording started! Will stop automatically after 10 seconds.");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      toast.error("Failed to start recording");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log("⏹️ Manually stopping recording...");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      console.log("❌ No active recording to stop");
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

  const handleAnalysisComplete = (analysisMetrics: any, scores: Record<string, number>, conf: number, frame?: string) => {
    setMetrics(analysisMetrics);
    setAutoScores(scores);
    setFinalScores(scores);
    setConfidence(conf);
    setCapturedFrame(frame || "");
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
                <div className="space-y-4">
                  <Button
                    onClick={() => startCamera()}
                    className="w-full"
                    size="lg"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera Viewfinder
                  </Button>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Click above to start the camera and see the viewfinder</p>
                  </div>
                </div>
              )}

              {stream && !isRecording && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden border-2 border-dashed border-white/30">
                    {/* Camera Controls */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-black/70 px-2 py-1 rounded text-white text-xs">
                        <div className={`w-2 h-2 rounded-full ${stream ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                        {stream ? 'Camera Active' : 'Camera Inactive'}
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        onClick={switchCamera}
                        variant="secondary"
                        size="sm"
                        className="bg-black/70 hover:bg-black/80 text-white border-white/20"
                        disabled={!stream}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {cameraFacing === "user" ? "Rear" : "Front"}
                      </Button>
                    </div>
                    
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-64 object-cover bg-gray-900"
                      style={{ 
                        transform: cameraFacing === "user" ? 'scaleX(-1)' : 'none' 
                      }}
                      onLoadStart={() => console.log("📱 Video load started")}
                      onCanPlay={() => console.log("🎬 Video can play")}
                      onPlaying={() => console.log("▶️ Video is playing")}
                      onError={(e) => {
                        console.error("❌ Video element error:", e);
                        toast.error("Video display error");
                      }}
                    />
                    
                    {/* Camera info overlay */}
                    <div className="absolute bottom-2 left-2 z-10">
                      <div className="bg-black/70 px-2 py-1 rounded text-white text-xs">
                        {cameraFacing === "user" ? "📱 Front Camera" : "📹 Rear Camera"}
                      </div>
                    </div>
                    
                    {/* Overlay when no stream */}
                    {!stream && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="text-center text-white">
                          <div className="text-4xl mb-2">📹</div>
                          <p className="text-sm">Camera not started</p>
                        </div>
                      </div>
                    )}
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
                  <div className="relative bg-black rounded-lg overflow-hidden border-2 border-red-500/50">
                    {/* Recording indicator */}
                    <div className="absolute top-2 left-2 z-10">
                      <div className="flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded text-white text-sm font-medium animate-pulse">
                        <div className="w-3 h-3 bg-red-200 rounded-full animate-ping" />
                        RECORDING
                      </div>
                    </div>
                    
                    {/* Camera switch during recording */}
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        onClick={switchCamera}
                        variant="secondary"
                        size="sm"
                        className="bg-black/70 hover:bg-black/80 text-white border-white/20"
                        disabled={!stream || isRecording}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {cameraFacing === "user" ? "Rear" : "Front"}
                      </Button>
                    </div>
                    
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-64 object-cover bg-gray-900"
                      style={{ 
                        transform: cameraFacing === "user" ? 'scaleX(-1)' : 'none' 
                      }}
                      onError={(e) => {
                        console.error("❌ Video error during recording:", e);
                      }}
                      onPlay={() => {
                        console.log("▶️ Video playing during recording");
                      }}
                      onPause={() => {
                        console.log("⏸️ Video paused during recording");
                      }}
                    />
                    
                    {/* Recording info */}
                    <div className="absolute bottom-2 left-2 right-2 z-10 flex justify-between items-center">
                      <div className="bg-black/70 px-2 py-1 rounded text-white text-xs">
                        {cameraFacing === "user" ? "📱 Front Camera" : "📹 Rear Camera"}
                      </div>
                      <div className="bg-red-600/90 px-2 py-1 rounded text-white text-xs">
                        Recording in progress...
                      </div>
                    </div>
                    
                    {/* Debug info */}
                    <div className="absolute bottom-2 right-2 z-10">
                      <div className="bg-blue-600/90 px-2 py-1 rounded text-white text-xs">
                        Stream: {stream ? '✅' : '❌'} | Recording: {isRecording ? '🔴' : '⚫'}
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
                  capturedFrame={capturedFrame}
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