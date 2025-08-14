import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ScoreAdjustmentProps {
  skill: string;
  autoScores: Record<string, number>;
  onScoreChange: (scores: Record<string, number>) => void;
  rubricFrames?: Record<string, string>;
}

const SKILL_CRITERIA = {
  Digging: {
    readyPlatform: {
      name: "Ready Position & Platform",
      descriptions: {
        0: "Upright stance; bent arms; no platform formed.",
        1: "Some knee flexion; arms bent or platform uneven.",
        2: "Low, balanced stance; elbows mostly locked; fairly flat platform.",
        3: "Low, stable stance; elbows locked; perfectly flat, steady platform."
      }
    },
    contactAngle: {
      name: "Contact Point & Angle",
      descriptions: {
        0: "Contact at wrists or hands; ball angle uncontrolled.",
        1: "Contact on lower forearms but angle inconsistent.",
        2: "Contact on mid-forearms; platform angle mostly directs ball upward/forward.",
        3: "Contact on mid-forearms below waist; precise platform angle to target."
      }
    },
    followThroughControl: {
      name: "Follow-Through & Control",
      descriptions: {
        0: "Arms/platform collapse immediately after contact; ball uncontrolled.",
        1: "Platform drops quickly; ball sometimes accurate.",
        2: "Platform maintained briefly; ball mostly on target.",
        3: "Platform held steady after contact; ball consistently accurate to target."
      }
    }
  }
};

const ScoreAdjustment = ({ skill, autoScores, onScoreChange, rubricFrames = {} }: ScoreAdjustmentProps) => {
  const [scores, setScores] = useState<Record<string, number>>(autoScores);
  const [copied, setCopied] = useState(false);

  const criteria = SKILL_CRITERIA[skill as keyof typeof SKILL_CRITERIA];
  
  if (!criteria) {
    return <div>Skill "{skill}" not supported yet.</div>;
  }

  useEffect(() => {
    setScores(autoScores);
  }, [autoScores]);

  useEffect(() => {
    onScoreChange(scores);
  }, [scores, onScoreChange]);

  const handleScoreChange = (criterion: string, value: number[]) => {
    const newScores = { ...scores, [criterion]: value[0] };
    setScores(newScores);
  };

  const copyToClipboard = async () => {
    try {
      // Calculate total score
      const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
      const maxScore = Object.keys(scores).length * 3;
      
      // Generate formatted assessment text
      let assessmentText = `=== VOLLEYBALL ${skill.toUpperCase()} ASSESSMENT ===\n\n`;
      assessmentText += `Overall Score: ${totalScore}/${maxScore} (${Math.round((totalScore / maxScore) * 100)}%)\n\n`;
      assessmentText += `DETAILED SCORES:\n`;
      
      Object.entries(scores).forEach(([key, score]) => {
        const criterion = criteria[key as keyof typeof criteria];
        if (criterion) {
          assessmentText += `\n${criterion.name}: ${score}/3\n`;
          assessmentText += `Description: ${criterion.descriptions[score as keyof typeof criterion.descriptions]}\n`;
        }
      });
      
      assessmentText += `\n=== ANALYSIS REQUEST ===\n`;
      assessmentText += `Please analyze this volleyball ${skill.toLowerCase()} assessment and provide:\n`;
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

  return (
    <div className="space-y-6">
      {Object.keys(rubricFrames).length > 0 && (
        <Card className="p-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Captured Reference Frames</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(rubricFrames).map(([componentKey, frameData]) => {
                const componentName = criteria[componentKey as keyof typeof criteria]?.name || componentKey;
                return (
                  <div key={componentKey} className="relative">
                    <img 
                      src={frameData} 
                      alt={`${componentName} reference frame`} 
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {componentName}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-2xl">🧠</div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">AI-Assisted Scoring</h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              The AI has provided initial suggestions based on pose detection and movement analysis. 
              <strong> These are recommendations only.</strong> Please review each score carefully using your coaching expertise and adjust as needed.
            </p>
            <div className="mt-2 text-xs text-blue-700 bg-blue-100 rounded px-2 py-1">
              <strong>Note:</strong> AI cannot assess technique quality, ball contact, or timing - human judgment is essential.
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-foreground">
          Adjust AI suggestions to reflect actual performance:
        </div>
        <Button 
          onClick={copyToClipboard}
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy for GPT"}
        </Button>
      </div>
      
      {Object.entries(criteria).map(([key, criterion]) => (
        <Card key={key} className="p-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base leading-tight">
              {criterion.name} — <span className="text-amber-600">AI Suggestion: {scores[key] || 0}</span> — {criterion.descriptions[scores[key] as keyof typeof criterion.descriptions] || criterion.descriptions[0]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Your Final Score (Override AI Suggestion)</Label>
              <Slider
                value={[scores[key] || 0]}
                onValueChange={(value) => handleScoreChange(key, value)}
                max={3}
                min={0}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
              </div>
            </div>
            
            {/* Show specific reference frame for this component if available */}
            {rubricFrames[key] && (
              <div className="mb-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">Reference Frame:</div>
                <div className="relative">
                  <img 
                    src={rubricFrames[key]} 
                    alt={`${criterion.name} reference`} 
                    className="w-full h-24 object-cover rounded border border-border"
                  />
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white px-1 py-0.5 rounded text-xs">
                    AI captured
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Score Descriptions:</div>
              <div className="space-y-1 text-xs">
                {Object.entries(criterion.descriptions).map(([score, description]) => (
                  <div 
                    key={score} 
                    className={`p-2 rounded ${
                      parseInt(score) === (scores[key] || 0) 
                        ? 'bg-primary/10 border border-primary/20 text-primary' 
                        : 'bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <span className="font-medium">{score}:</span> {description}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ScoreAdjustment;