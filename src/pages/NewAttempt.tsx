import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import RealMoveNetAnalyzer from "@/components/RealMoveNetAnalyzer";
import ScoreAdjustment from "@/components/ScoreAdjustment";
import { VideoUploadService } from "@/lib/videoUploadService";
import { isBrowserLikelyToPlay } from "@/lib/videoCompatibility";

type AttemptPoseMetrics = {
  frames?: number;
  detected_frames?: number;
  kneeFlex?: number;
  elbowLock?: boolean;
  wristAboveForehead?: boolean;
  contactHeightRelTorso?: number;
  platformFlatness?: number;
  extensionSequence?: number;
  facingTarget?: number;
  stability?: number;
  contactFrame?: number;
};

const NewAttempt = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    skill: "Setting" as "Setting" | "Digging",
    notes: ""
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [uploadId, setUploadId] = useState<string>("");
  const [step, setStep] = useState<"form" | "analyze" | "review">("form");
  const [autoScores, setAutoScores] = useState<Record<string, number>>({});
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<AttemptPoseMetrics | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [rubricFrames, setRubricFrames] = useState<Record<string, string>>({});
  const [capturedFrame, setCapturedFrame] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // New: pre-check browser playback compatibility
      try {
        const compat = await isBrowserLikelyToPlay(file);
        console.log("🧪 Playback compatibility:", compat);
        if (!compat.playable) {
          toast.error(
            compat.details === "HEVC/H.265 not supported by this browser"
              ? "Local video playback error: Format may be unsupported (HEVC/H.265). Please record in MP4 (H.264/AAC) or try a different browser."
              : `Local video playback error: ${compat.details}. Please record in MP4 (H.264/AAC) or try a different browser.`
          );
          return;
        }
      } catch (err) {
        console.warn("Compatibility check failed", err);
      }
      
      setVideoFile(file);
      
      try {
        toast.loading("Uploading video to storage...");
        
        // Upload to Supabase Storage
        const result = await VideoUploadService.uploadVideo(file);
        
        setVideoUrl(result.url);
        setUploadId(result.uploadId);
        
        toast.dismiss();
        toast.success("Video uploaded successfully!");
        console.log("✅ Video uploaded:", result);
        
        setStep("analyze");
      } catch (error) {
        console.error("❌ Upload failed:", error);
        toast.dismiss();
        toast.error("Upload failed. Please try again.");
      }
    }
  };

  const handleAnalysisComplete = (
    analysisMetrics: AttemptPoseMetrics,
    scores: Record<string, number>,
    conf: number,
    frames: Record<string, string>
  ) => {
    console.log("📊 Analysis complete with results:", { scores, analysisMetrics, conf, frames });
    
    setMetrics(analysisMetrics);
    setAutoScores(scores);
    setFinalScores(scores);
    setConfidence(conf);
    setRubricFrames(frames);
    
    // Set the first available frame as the main captured frame for backward compatibility
    const firstFrame = Object.values(frames)[0];
    if (firstFrame) {
      setCapturedFrame(firstFrame);
    }
    
    setStep("review");
  };

  const handleScoreAdjustment = (adjustedScores: Record<string, number>) => {
    setFinalScores(adjustedScores);
  };

  const copyToClipboard = async () => {
    try {
      const SKILL_CRITERIA = {
        Setting: {
          readyFootwork: { name: "Ready Position & Footwork", descriptions: { 0: "No ready stance; feet stationary; poor positioning under ball.", 1: "Ready stance inconsistent; slow or incomplete movement to get under ball.", 2: "Consistent low stance; some movement to adjust, minor positioning errors.", 3: "Consistently low, balanced stance; quick, small steps to get perfectly under ball." }},
          handShapeContact: { name: "Hand Shape & Contact Zone", descriptions: { 0: "Hands apart or flat; contact well below chin/neck.", 1: "Hands form partial shape; contact at chin/neck level.", 2: "Triangle/window formed; contact just above forehead but slightly low.", 3: "Perfect triangle/window; contact above forehead in correct setting zone." }},
          alignmentExtension: { name: "Body Alignment & Extension", descriptions: { 0: "Shoulders/hips misaligned to target; no upward extension.", 1: "Minor alignment; limited knee/hip/arm extension.", 2: "Mostly square to target; good upward extension but minor sequencing errors.", 3: "Fully square to target; smooth knees→hips→arms extension in correct order." }},
          followThroughControl: { name: "Follow-Through & Ball Control", descriptions: { 0: "Arms/wrists drop immediately; ball control inconsistent.", 1: "Short or abrupt follow-through; ball occasionally off target.", 2: "Controlled follow-through to target; ball mostly accurate.", 3: "Smooth follow-through to target; consistent arc, height, and accuracy." }}
        },
        Digging: {
          readyPlatform: { name: "Ready Position & Platform", descriptions: { 0: "Upright stance; bent arms; no platform formed.", 1: "Some knee flexion; arms bent or platform uneven.", 2: "Low, balanced stance; elbows mostly locked; fairly flat platform.", 3: "Low, stable stance; elbows locked; perfectly flat, steady platform." }},
          contactAngle: { name: "Contact Point & Angle", descriptions: { 0: "Contact at wrists or hands; ball angle uncontrolled.", 1: "Contact on lower forearms but angle inconsistent.", 2: "Contact on mid-forearms; platform angle mostly directs ball upward/forward.", 3: "Contact on mid-forearms below waist; precise platform angle to target." }},
          legDriveShoulder: { name: "Leg Drive & Shoulder Lift", descriptions: { 0: "No upward drive; swing arms instead of using legs.", 1: "Minimal leg extension; uneven shoulder motion.", 2: "Legs provide most power; subtle shoulder lift assists control.", 3: "Smooth, powerful leg drive with coordinated shoulder lift for perfect control." }},
          followThroughControl: { name: "Follow-Through & Control", descriptions: { 0: "Arms/platform collapse immediately after contact; ball uncontrolled.", 1: "Platform drops quickly; ball sometimes accurate.", 2: "Platform maintained briefly; ball mostly on target.", 3: "Platform held steady after contact; ball consistently accurate to target." }}
        }
      };

      const criteria = SKILL_CRITERIA[formData.skill as keyof typeof SKILL_CRITERIA];
      const totalScore = Object.values(finalScores).reduce((sum, score) => sum + score, 0);
      const maxScore = Object.keys(finalScores).length * 3;
      
      let assessmentText = `=== VOLLEYBALL ${formData.skill.toUpperCase()} ASSESSMENT ===\n`;
      assessmentText += `🤖 AI-ASSISTED EVALUATION (Human Review Required)\n\n`;
      assessmentText += `Final Score: ${totalScore}/${maxScore} (${Math.round((totalScore / maxScore) * 100)}%)\n`;
      assessmentText += `AI Confidence: ${Math.round(confidence * 100)}%\n\n`;
      assessmentText += `DETAILED SCORES:\n`;
      
      Object.entries(finalScores).forEach(([key, score]) => {
        const criterion = criteria[key as keyof typeof criteria];
        if (criterion) {
          assessmentText += `\n${criterion.name}: ${score}/3\n`;
          assessmentText += `Description: ${criterion.descriptions[score as keyof typeof criterion.descriptions]}\n`;
        }
      });
      
      if (formData.notes) {
        assessmentText += `\nNOTES: ${formData.notes}\n`;
      }
      
      assessmentText += `\n⚠️ IMPORTANT: This assessment used AI assistance for initial analysis.\n`;
      assessmentText += `Scores have been reviewed and validated by a qualified assessor.\n`;
      assessmentText += `AI provides movement analysis; human expertise ensures accurate evaluation.\n\n`;
      
      assessmentText += `=== ANALYSIS REQUEST ===\n`;
      assessmentText += `Please analyze this AI-assisted volleyball ${formData.skill.toLowerCase()} assessment and provide:\n`;
      assessmentText += `1. Key strengths identified\n`;
      assessmentText += `2. Primary areas for improvement\n`;
      assessmentText += `3. Specific drills or exercises to address weaknesses\n`;
      assessmentText += `4. Progressive training plan suggestions\n`;
      assessmentText += `5. Tips for consistent performance improvement\n`;
      
      await navigator.clipboard.writeText(assessmentText);
      setCopied(true);
      toast.success("Assessment copied! Paste into ChatGPT for detailed feedback.");
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const saveAttempt = async () => {
    try {
      // Save to localStorage instead of database for privacy
      const attemptData = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        skill: formData.skill,
        notes: formData.notes,
        autoScores,
        finalScores,
        metrics,
        confidence,
        rubricFrames
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">📹 Video Recording Instructions</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <div>
                    <h5 className="font-medium mb-2">Camera Position:</h5>
                    <ul className="space-y-1">
                      <li>• <strong>Side view</strong> at 90° angle for best analysis</li>
                      <li>• Position camera 6-10 feet away</li>
                      <li>• Keep camera steady (tripod recommended)</li>
                      <li>• Ensure full body is visible in frame</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Performance:</h5>
                    <ul className="space-y-1">
                      <li>• Show complete volleyball technique</li>
                      <li>• Perform 3-5 repetitions in 10 seconds</li>
                      <li>• Use clear, deliberate movements</li>
                      <li>• Good lighting on performer</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700">
                  <strong>⚠️ Important:</strong> Videos with no movement or poor technique demonstration will be rejected by the AI analysis.
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">📊 Analysis Requirements</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Minimum 10 pixels of movement between frames</li>
                  <li>• At least 3 frames showing volleyball technique</li>
                  <li>• 30% minimum confidence for analysis completion</li>
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
                <RealMoveNetAnalyzer
                  videoFile={videoFile}
                  skill={formData.skill}
                  onAnalysisComplete={handleAnalysisComplete}
                />
              )}
            </CardContent>
          </Card>
        )}

        {step === "review" && (
          <div className="space-y-4">
            {/* DEBUG: Log review page state */}
            {(() => {
              console.log("🔍 REVIEW PAGE DEBUG:", {
                step,
                hasVideoFile: !!videoFile,
                videoFileName: videoFile?.name,
                videoFileSize: videoFile?.size,
                hasAutoScores: !!autoScores,
                autoScoresKeys: Object.keys(autoScores || {}),
                hasRubricFrames: !!rubricFrames,
                rubricFramesKeys: Object.keys(rubricFrames || {}),
                skill: formData.skill,
                confidence
              });
              return null;
            })()}
            
            {/* Add page header for debugging */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">🔧 DEBUG INFO:</div>
                <div className="text-xs text-blue-800 space-y-1">
                  <div>Video File: {videoFile ? `${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(1)}MB)` : 'None'}</div>
                  <div>Video URL: {videoUrl ? 'Available' : 'None'}</div>
                  <div>Upload ID: {uploadId || 'None'}</div>
                  <div>Skill: {formData.skill}</div>
                  <div>Auto Scores: {Object.keys(autoScores || {}).length} criteria</div>
                  <div>Rubric Frames: {Object.keys(rubricFrames || {}).length} frames</div>
                  <div>Confidence: {Math.round(confidence * 100)}%</div>
                </div>
            </div>
            <Card className="shadow-lg border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  🤖 AI-Assisted Assessment
                </CardTitle>
                <div className="text-sm text-amber-700 space-y-2">
                  <p><strong>⚠️ Human Review Required:</strong> This AI analysis provides initial suggestions but requires assessor judgment for final scoring.</p>
                  <p><strong>Confidence Level:</strong> {Math.round(confidence * 100)}% - Review all scores carefully</p>
                  <div className="bg-amber-100 p-3 rounded-lg mt-3">
                    <p className="text-xs font-medium">📋 Assessment Guidelines:</p>
                    <ul className="text-xs mt-1 space-y-1">
                      <li>• AI provides initial analysis based on movement patterns</li>
                      <li>• Trained assessor must validate and adjust all scores</li>
                      <li>• Reference frames show AI's detection points</li>
                      <li>• Final assessment requires human expertise</li>
                    </ul>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Review & Adjust AI Suggestions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Modify the AI's suggested scores based on your expert assessment
                </p>
              </CardHeader>
              <CardContent>
                <ScoreAdjustment
                  skill={formData.skill}
                  autoScores={autoScores}
                  onScoreChange={handleScoreAdjustment}
                  rubricFrames={rubricFrames}
                  videoUrl={videoUrl}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex-1 gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy for GPT"}
              </Button>
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
