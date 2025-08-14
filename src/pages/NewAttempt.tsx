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
import ReferenceVideoAnalyzer from "@/components/ReferenceVideoAnalyzer";
import ScoreAdjustment from "@/components/ScoreAdjustment";
import { getSkillOptions } from '@/data/referenceVideos';

const NewAttempt = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    skill: "Setting",
    notes: ""
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [step, setStep] = useState<"form" | "analyze" | "review">("form");
  const [autoScores, setAutoScores] = useState<Record<string, number>>({});
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<any>(null);
  const [confidence, setConfidence] = useState(0);
  const [rubricFrames, setRubricFrames] = useState<Record<string, string>>({});
  const [capturedFrame, setCapturedFrame] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

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

  const handleAnalysisComplete = (results: any) => {
    console.log("📊 Analysis complete with results:", results);
    
    setAnalysisResults(results);
    setMetrics(results.metrics);
    setAutoScores(results.scores);
    setFinalScores(results.scores);
    setConfidence(results.metrics?.confidence || 0.8);
    setRubricFrames(results.rubricFrames || {});
    
    setStep("review");
  };

  const handleScoreAdjustment = (adjustedScores: Record<string, number>) => {
    setFinalScores(adjustedScores);
  };

  const copyToClipboard = async () => {
    try {
      const SKILL_CRITERIA = {
        Serve: {
          technique: { name: "Serving Technique", descriptions: { 0: "Poor ball toss; inconsistent contact point; minimal follow-through.", 1: "Inconsistent toss; contact point varies; limited follow-through.", 2: "Good toss placement; consistent contact; adequate follow-through.", 3: "Perfect toss; optimal contact point; smooth, controlled follow-through." }},
          timing: { name: "Timing & Rhythm", descriptions: { 0: "No consistent rhythm; rushed or delayed movements.", 1: "Basic rhythm; some timing inconsistencies.", 2: "Good timing; minor rhythm variations.", 3: "Perfect timing; smooth, rhythmic motion throughout." }},
          power: { name: "Power Generation", descriptions: { 0: "Minimal body rotation; arm-only motion; low ball speed.", 1: "Limited body involvement; inconsistent power.", 2: "Good body rotation; consistent power generation.", 3: "Full body coordination; maximum power with control." }},
          accuracy: { name: "Accuracy & Control", descriptions: { 0: "Serves frequently out of bounds or into net.", 1: "Basic accuracy; occasional successful serves.", 2: "Good accuracy; most serves in target area.", 3: "Excellent accuracy; consistent placement and control." }}
        },
        Spike: {
          technique: { name: "Spiking Technique", descriptions: { 0: "Poor approach; incorrect arm swing; minimal jump.", 1: "Basic approach; inconsistent arm motion; limited elevation.", 2: "Good approach timing; proper arm swing; adequate jump.", 3: "Perfect approach; explosive jump; optimal arm swing and contact." }},
          timing: { name: "Timing & Approach", descriptions: { 0: "Poor timing with set; rushed or late approach.", 1: "Basic timing; some coordination with setter.", 2: "Good timing; well-coordinated with set.", 3: "Perfect timing; seamless coordination with setter." }},
          power: { name: "Power & Explosion", descriptions: { 0: "Weak attack; minimal downward angle.", 1: "Basic power; limited explosive movement.", 2: "Good power generation; consistent attack strength.", 3: "Maximum power; explosive jump and swing." }},
          accuracy: { name: "Accuracy & Placement", descriptions: { 0: "Attacks frequently out or blocked.", 1: "Basic accuracy; occasional successful attacks.", 2: "Good placement; strategic shot selection.", 3: "Excellent accuracy; consistent court placement." }}
        },
        Block: {
          technique: { name: "Blocking Technique", descriptions: { 0: "Poor hand position; minimal penetration over net.", 1: "Basic hand position; limited net penetration.", 2: "Good hand positioning; adequate penetration.", 3: "Perfect hand position; maximum penetration and coverage." }},
          timing: { name: "Timing & Jump", descriptions: { 0: "Poor timing with attacker; early or late jump.", 1: "Basic timing; some coordination with attack.", 2: "Good timing; well-coordinated with attacker.", 3: "Perfect timing; synchronized with attack timing." }},
          power: { name: "Jump & Elevation", descriptions: { 0: "Minimal jump height; poor takeoff.", 1: "Basic elevation; inconsistent takeoff.", 2: "Good jump height; consistent elevation.", 3: "Maximum elevation; explosive vertical jump." }},
          accuracy: { name: "Positioning & Angle", descriptions: { 0: "Poor court position; hands angled incorrectly.", 1: "Basic positioning; limited hand control.", 2: "Good positioning; hands direct ball appropriately.", 3: "Perfect positioning; optimal hand angle for defense." }}
        },
        Pass: {
          technique: { name: "Passing Technique", descriptions: { 0: "Poor platform; inconsistent arm position.", 1: "Basic platform formation; some consistency.", 2: "Good platform; consistent arm positioning.", 3: "Perfect platform; optimal arm angle and control." }},
          timing: { name: "Timing & Movement", descriptions: { 0: "Late to ball; poor movement to position.", 1: "Basic movement; some positioning issues.", 2: "Good movement; usually in correct position.", 3: "Excellent movement; always in optimal position." }},
          power: { name: "Control & Touch", descriptions: { 0: "Inconsistent ball control; erratic passes.", 1: "Basic control; occasional accurate passes.", 2: "Good control; consistent pass quality.", 3: "Excellent touch; perfect pass placement." }},
          accuracy: { name: "Pass Accuracy", descriptions: { 0: "Passes rarely reach target area.", 1: "Basic accuracy; occasionally on target.", 2: "Good accuracy; most passes to target.", 3: "Perfect accuracy; consistent setter placement." }}
        },
        Set: {
          technique: { name: "Setting Technique", descriptions: { 0: "Poor hand position; inconsistent ball contact.", 1: "Basic hand shape; some contact consistency.", 2: "Good hand position; consistent ball control.", 3: "Perfect hand technique; optimal ball contact." }},
          timing: { name: "Timing & Decision", descriptions: { 0: "Poor timing; limited court awareness.", 1: "Basic timing; simple set selection.", 2: "Good timing; appropriate set choices.", 3: "Perfect timing; strategic set distribution." }},
          power: { name: "Set Height & Speed", descriptions: { 0: "Inconsistent set height; poor ball speed control.", 1: "Basic set control; limited height variation.", 2: "Good set variety; appropriate height and speed.", 3: "Perfect set control; optimal height and timing." }},
          accuracy: { name: "Set Accuracy", descriptions: { 0: "Sets rarely reach intended target.", 1: "Basic accuracy; occasional good sets.", 2: "Good accuracy; consistent target placement.", 3: "Perfect accuracy; precise hitter placement." }}
        }
      };

      const criteria = SKILL_CRITERIA[formData.skill as keyof typeof SKILL_CRITERIA] || SKILL_CRITERIA.Serve;
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
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {getSkillOptions().map(skill => (
                    <Button
                      key={skill}
                      variant={formData.skill === skill ? "default" : "outline"}
                      onClick={() => setFormData(prev => ({ ...prev, skill }))}
                      className="text-sm"
                    >
                      {skill}
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
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">🎯 AI Movement Analysis</h4>
                    <p className="text-sm text-green-800">
                      Your video will be analyzed using AI pose detection to provide 
                      scoring based on volleyball technique and movement quality.
                    </p>
                  </div>
                  
                  <RealMoveNetAnalyzer
                    videoFile={videoFile}
                    skill={formData.skill as "Setting" | "Digging"}
                    onAnalysisComplete={(metrics, scores, confidence, frames) => {
                      handleAnalysisComplete({
                        metrics, scores, confidence, rubricFrames: frames
                      });
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "review" && (
          <div className="space-y-4">
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
                />
                
                {analysisResults?.comparison && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">🎯 Reference Comparison Results</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Overall Similarity:</span>
                        <div className="text-xl font-bold text-blue-600">
                          {Math.round(analysisResults.comparison.overallSimilarity * 100)}%
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Phase Breakdown:</span>
                        <div className="space-y-1 text-xs">
                          <div>Prep: {Math.round(analysisResults.comparison.phaseScores.preparation * 100)}%</div>
                          <div>Exec: {Math.round(analysisResults.comparison.phaseScores.execution * 100)}%</div>
                          <div>Follow: {Math.round(analysisResults.comparison.phaseScores.followThrough * 100)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
