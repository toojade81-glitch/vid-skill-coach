import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Trophy, FileText, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface AttemptData {
  id: string;
  date: string;
  skill: string;
  notes: string;
  autoScores: Record<string, number>;
  finalScores: Record<string, number>;
  metrics: any;
  confidence: number;
  rubricFrames?: Record<string, string>;
}

const History = () => {
  const [attempts, setAttempts] = useState<AttemptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = () => {
    try {
      const storedAttempts = localStorage.getItem('volleyball-attempts');
      if (storedAttempts) {
        setAttempts(JSON.parse(storedAttempts));
      }
    } catch (error) {
      console.error("Error loading attempts:", error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const deleteAttempt = (attemptId: string) => {
    try {
      const updatedAttempts = attempts.filter(attempt => attempt.id !== attemptId);
      setAttempts(updatedAttempts);
      localStorage.setItem('volleyball-attempts', JSON.stringify(updatedAttempts));
      toast.success("Assessment deleted");
    } catch (error) {
      console.error("Error deleting attempt:", error);
      toast.error("Failed to delete assessment");
    }
  };

  const clearAllHistory = () => {
    if (confirm("Are you sure you want to clear all assessment history? This cannot be undone.")) {
      localStorage.removeItem('volleyball-attempts');
      setAttempts([]);
      toast.success("All history cleared");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 2.5) return "bg-green-100 text-green-800";
    if (score >= 1.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const copyAssessmentToClipboard = async (attempt: AttemptData) => {
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

      const criteria = SKILL_CRITERIA[attempt.skill as keyof typeof SKILL_CRITERIA];
      const totalScore = Object.values(attempt.finalScores).reduce((sum, score) => sum + score, 0);
      const maxScore = Object.keys(attempt.finalScores).length * 3;
      
      let assessmentText = `=== VOLLEYBALL ${attempt.skill.toUpperCase()} ASSESSMENT ===\n\n`;
      assessmentText += `Assessment Date: ${new Date(attempt.date).toLocaleDateString()}\n`;
      assessmentText += `Overall Score: ${totalScore}/${maxScore} (${Math.round((totalScore / maxScore) * 100)}%)\n\n`;
      assessmentText += `DETAILED SCORES:\n`;
      
      Object.entries(attempt.finalScores).forEach(([key, score]) => {
        const criterion = criteria[key as keyof typeof criteria];
        if (criterion) {
          assessmentText += `\n${criterion.name}: ${score}/3\n`;
          assessmentText += `Description: ${criterion.descriptions[score as keyof typeof criterion.descriptions]}\n`;
        }
      });
      
      if (attempt.notes) {
        assessmentText += `\nNOTES: ${attempt.notes}\n`;
      }
      
      assessmentText += `\n=== ANALYSIS REQUEST ===\n`;
      assessmentText += `Please analyze this volleyball ${attempt.skill.toLowerCase()} assessment and provide:\n`;
      assessmentText += `1. Key strengths identified\n`;
      assessmentText += `2. Primary areas for improvement\n`;
      assessmentText += `3. Specific drills or exercises to address weaknesses\n`;
      assessmentText += `4. Progressive training plan suggestions\n`;
      assessmentText += `5. Tips for consistent performance improvement\n`;
      
      await navigator.clipboard.writeText(assessmentText);
      setCopiedId(attempt.id);
      toast.success("Assessment copied! Paste into ChatGPT for detailed feedback.");
      
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const calculateAverageScore = (scores: Record<string, number>) => {
    const values = Object.values(scores);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-primary">Assessment History</h1>
          </div>
          
          {attempts.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {attempts.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assessments Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start recording your volleyball technique to build your assessment history.
              </p>
              <Button asChild>
                <Link to="/new-attempt">
                  Record First Assessment
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Privacy Notice:</strong> All assessment data is stored locally on your device. 
                No data is sent to external servers, ensuring complete privacy.
              </p>
            </div>
            
            {attempts.map((attempt) => (
              <Card key={attempt.id} className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {new Date(attempt.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAttempt(attempt.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="font-medium">{attempt.skill}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-sm">Average Score:</span>
                      <Badge className={getScoreColor(calculateAverageScore(attempt.finalScores))}>
                        {calculateAverageScore(attempt.finalScores).toFixed(1)}/3.0
                      </Badge>
                    </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Confidence: {Math.round(attempt.confidence * 100)}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Final Scores:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(attempt.finalScores).map(([criterion, score]) => (
                          <div key={criterion} className="text-xs">
                            <span className="text-muted-foreground">{criterion}:</span>
                            <Badge variant="outline" className="ml-1">
                              {score}/3
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {attempt.notes && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Notes:</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{attempt.notes}</p>
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => copyAssessmentToClipboard(attempt)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {copiedId === attempt.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedId === attempt.id ? "Copied!" : "Copy for GPT"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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

export default History;