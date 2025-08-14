import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
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
  const [step, setStep] = useState<"form" | "analyze" | "review">("form");
  const [autoScores, setAutoScores] = useState<Record<string, number>>({});
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<any>(null);
  const [confidence, setConfidence] = useState(0);
  const [capturedFrame, setCapturedFrame] = useState<string>("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("📁 File selected:", file.name, file.size, file.type);
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error("Video file too large. Please keep under 50MB.");
        return;
      }
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file.");
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
                onClick={() => setStep("analyze")}
                disabled={!canProceed}
                className="w-full"
                size="lg"
              >
                Continue to Upload Video
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "analyze" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Your Video
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Video Requirements:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Keep videos under 10 seconds for best results</li>
                  <li>• Frame your full body in view</li>
                  <li>• Face slightly towards the camera</li>
                  <li>• Ensure good lighting</li>
                  <li>• Maximum file size: 50MB</li>
                </ul>
              </div>

              <div className="space-y-4">
                <Label htmlFor="video-upload" className="text-sm font-medium">
                  Select Video File
                </Label>
                <Input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
                
                {videoFile && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                    ✅ Video selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)
                  </div>
                )}
              </div>

              {videoFile && (
                <PoseAnalyzer
                  videoFile={videoFile}
                  skill={formData.skill}
                  target={formData.target}
                  onAnalysisComplete={handleAnalysisComplete}
                />
              )}
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
                onClick={() => setStep("analyze")}
                className="flex-1"
              >
                Upload New Video
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
