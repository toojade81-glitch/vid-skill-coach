import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ScoreAdjustmentProps {
  skill: "Setting" | "Digging";
  autoScores: Record<string, number>;
  onScoreChange: (scores: Record<string, number>) => void;
  rubricFrames?: Record<string, string>;
}

const SKILL_CRITERIA = {
  Setting: {
    readyFootwork: {
      name: "Ready Position & Footwork",
      descriptions: {
        0: "No ready stance; feet stationary; poor positioning under ball.",
        1: "Ready stance inconsistent; slow or incomplete movement to get under ball.",
        2: "Consistent low stance; some movement to adjust, minor positioning errors.",
        3: "Consistently low, balanced stance; quick, small steps to get perfectly under ball."
      }
    },
    handShapeContact: {
      name: "Hand Shape & Contact Zone",
      descriptions: {
        0: "Hands apart or flat; contact well below chin/neck.",
        1: "Hands form partial shape; contact at chin/neck level.",
        2: "Triangle/window formed; contact just above forehead but slightly low.",
        3: "Perfect triangle/window; contact above forehead in correct \"setting zone.\""
      }
    },
    alignmentExtension: {
      name: "Body Alignment & Extension", 
      descriptions: {
        0: "Shoulders/hips misaligned to target; no upward extension.",
        1: "Minor alignment; limited knee/hip/arm extension.",
        2: "Mostly square to target; good upward extension but minor sequencing errors.",
        3: "Fully square to target; smooth knees→hips→arms extension in correct order."
      }
    },
    followThroughControl: {
      name: "Follow-Through & Ball Control",
      descriptions: {
        0: "Arms/wrists drop immediately; ball control inconsistent.",
        1: "Short or abrupt follow-through; ball occasionally off target.",
        2: "Controlled follow-through to target; ball mostly accurate.",
        3: "Smooth follow-through to target; consistent arc, height, and accuracy."
      }
    }
  },
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
    legDriveShoulder: {
      name: "Leg Drive & Shoulder Lift",
      descriptions: {
        0: "No upward drive; swing arms instead of using legs.",
        1: "Minimal leg extension; uneven shoulder motion.",
        2: "Legs provide most power; subtle shoulder lift assists control.",
        3: "Smooth, powerful leg drive with coordinated shoulder lift for perfect control."
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
  const [scores, setScores] = useState(autoScores);
  const criteria = SKILL_CRITERIA[skill];

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
      
      <div className="text-sm text-muted-foreground">
        The AI has analyzed your technique. Adjust any scores that don't seem accurate.
      </div>
      
      {Object.entries(criteria).map(([key, criterion]) => (
        <Card key={key} className="p-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base leading-tight">
              {criterion.name} — Score: {scores[key] || 0} — {criterion.descriptions[scores[key] as keyof typeof criterion.descriptions] || criterion.descriptions[0]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Adjust Score</Label>
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