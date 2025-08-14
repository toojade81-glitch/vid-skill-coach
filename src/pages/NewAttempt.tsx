import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import PoseAnalyzer from "@/components/PoseAnalyzer";
import ScoreAdjustment from "@/components/ScoreAdjustment";
import { supabase } from "@/integrations/supabase/client";

const NewAttempt = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    studentId: "",
    class: "",
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

  const handleVideoCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" },
        audio: false 
      });
      
      // Create a simple video recorder
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], 'recording.webm', { type: 'video/webm' });
        setVideoFile(file);
        setStep("analyze");
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
      // Stop recording after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 10000);
      
      toast.success("Recording started! Recording will stop automatically after 10 seconds.");
    } catch (error) {
      toast.error("Failed to access camera. Please try uploading a video instead.");
    }
  };

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
      // For demo purposes, using placeholder IDs - in real app these would be proper references
      const { error } = await supabase
        .from('attempts')
        .insert({
          student_id: crypto.randomUUID(), // Placeholder student reference
          session_id: crypto.randomUUID(), // Placeholder session reference  
          skill_id: crypto.randomUUID(), // Placeholder skill reference
          notes: formData.notes,
          auto_metrics: metrics,
          ratings: finalScores,
          overall_score: confidence
        });

      if (error) throw error;

      toast.success("Attempt saved successfully!");
      navigate("/history");
    } catch (error) {
      console.error("Error saving attempt:", error);
      toast.error("Failed to save attempt");
    }
  };

  const canProceed = formData.studentId.trim() && formData.class.trim();

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
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                  placeholder="Enter your student ID"
                />
              </div>

              <div>
                <Label htmlFor="class">Class</Label>
                <Input
                  id="class"
                  value={formData.class}
                  onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                  placeholder="Enter your class"
                />
              </div>

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

              <div className="space-y-3">
                <Button
                  onClick={handleVideoCapture}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Record with Camera
                </Button>

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
              </div>
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