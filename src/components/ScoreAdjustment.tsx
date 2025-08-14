import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ScoreAdjustmentProps {
  skill: "Setting" | "Digging";
  autoScores: Record<string, number>;
  onScoreChange: (scores: Record<string, number>) => void;
}

const SKILL_CRITERIA = {
  Setting: {
    readyFootwork: {
      name: "Ready Position & Footwork",
      descriptions: {
        0: "Not demonstrated - poor stance, no knee flex",
        1: "Inconsistent - minimal knee flex, unstable base", 
        2: "Mostly correct - good knee flex, minor stability issues",
        3: "Consistent & correct - neutral stance, proper knee flex, stable movement"
      }
    },
    handShapeContact: {
      name: "Hand Shape & Contact Zone",
      descriptions: {
        0: "Not demonstrated - poor hand position, contact too low",
        1: "Inconsistent - contact below optimal zone",
        2: "Mostly correct - good hand shape, contact near forehead",
        3: "Consistent & correct - perfect triangle shape, contact above forehead"
      }
    },
    alignmentExtension: {
      name: "Body Alignment & Extension", 
      descriptions: {
        0: "Not demonstrated - poor body alignment",
        1: "Inconsistent - limited extension sequence",
        2: "Mostly correct - good alignment, minor extension issues",
        3: "Consistent & correct - perfect sequence and target alignment"
      }
    },
    followThroughControl: {
      name: "Follow-Through & Ball Control",
      descriptions: {
        0: "Not demonstrated - no follow-through",
        1: "Inconsistent - limited follow-through direction",
        2: "Mostly correct - good follow-through, minor control issues", 
        3: "Consistent & correct - perfect follow-through to target"
      }
    }
  },
  Digging: {
    readyPlatform: {
      name: "Ready Position & Platform",
      descriptions: {
        0: "Not demonstrated - poor ready position, bent arms",
        1: "Inconsistent - minimal knee flex, inconsistent platform",
        2: "Mostly correct - good ready position, mostly straight arms",
        3: "Consistent & correct - low base, locked elbows, flat platform"
      }
    },
    contactAngle: {
      name: "Contact Point & Angle",
      descriptions: {
        0: "Not demonstrated - contact too high or poor angle",
        1: "Inconsistent - contact point needs work",
        2: "Mostly correct - good contact point, minor angle issues",
        3: "Consistent & correct - perfect mid-forearm contact below waist"
      }
    },
    legDriveShoulder: {
      name: "Leg Drive & Shoulder Lift",
      descriptions: {
        0: "Not demonstrated - no leg drive",
        1: "Inconsistent - minimal leg involvement", 
        2: "Mostly correct - good leg drive, minor shoulder issues",
        3: "Consistent & correct - power from legs, controlled shoulder lift"
      }
    },
    followThroughControl: {
      name: "Follow-Through & Control",
      descriptions: {
        0: "Not demonstrated - no platform maintenance",
        1: "Inconsistent - platform breaks down quickly",
        2: "Mostly correct - maintains platform, minor control issues",
        3: "Consistent & correct - stable platform throughout"
      }
    }
  }
};

const ScoreAdjustment = ({ skill, autoScores, onScoreChange }: ScoreAdjustmentProps) => {
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
      <div className="text-sm text-muted-foreground">
        The AI has analyzed your technique. Adjust any scores that don't seem accurate.
      </div>
      
      {Object.entries(criteria).map(([key, criterion]) => (
        <Card key={key} className="p-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{criterion.name}</CardTitle>
            <div className="text-sm font-medium text-primary">
              Score: {scores[key] || 0}/3
            </div>
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
            
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Score {scores[key] || 0}:</strong> {criterion.descriptions[scores[key] as keyof typeof criterion.descriptions] || criterion.descriptions[0]}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ScoreAdjustment;