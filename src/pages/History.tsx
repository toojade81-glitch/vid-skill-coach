import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Trophy, Target, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AttemptData {
  id: string;
  date: string;
  skill: string;
  target: string;
  notes: string;
  autoScores: Record<string, number>;
  finalScores: Record<string, number>;
  metrics: any;
  confidence: number;
}

const History = () => {
  const [attempts, setAttempts] = useState<AttemptData[]>([]);
  const [loading, setLoading] = useState(true);

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
                        <Target className="h-4 w-4 text-primary" />
                        <span className="font-medium">{attempt.skill}</span>
                        <Badge variant="outline">{attempt.target} Target</Badge>
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