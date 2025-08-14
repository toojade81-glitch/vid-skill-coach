import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Calendar, Target, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Attempt {
  attempt_id: string;
  timestamp: string;
  student_id: string;
  session_id: string;
  skill_id: string;
  ratings: any;
  notes?: string | null;
  auto_metrics?: any;
  overall_score?: number | null;
}

const History = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('attempts')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Student ID", 
      "Session ID",
      "Skill ID",
      "Ratings",
      "Confidence",
      "Notes"
    ];

    const csvData = attempts.map(attempt => [
      new Date(attempt.timestamp).toLocaleDateString(),
      attempt.student_id,
      attempt.session_id,
      attempt.skill_id,
      JSON.stringify(attempt.ratings || {}),
      Math.round((attempt.overall_score || 0) * 100) + "%",
      attempt.notes || ""
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volleyball-assessments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("History exported to CSV");
  };

  const calculateAverage = (scores: Record<string, number> | null) => {
    if (!scores) return 0;
    const values = Object.values(scores);
    if (values.length === 0) return 0;
    return values.reduce((sum, score) => sum + score, 0) / values.length;
  };

  if (loading) {
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
            <h1 className="text-2xl font-bold text-primary">Assessment History</h1>
          </div>
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-primary">Assessment History</h1>
        </div>

        {attempts.length > 0 && (
          <div className="mb-4">
            <Button 
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {attempts.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No assessments recorded yet</p>
                <Button asChild>
                  <Link to="/new-attempt">Create First Assessment</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            attempts.map((attempt) => (
              <Card key={attempt.attempt_id} className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Assessment
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      Avg: {calculateAverage(attempt.ratings).toFixed(1)}/3
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {new Date(attempt.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium">Student: {attempt.student_id.substring(0, 8)}...</div>
                    <div className="text-muted-foreground">Session: {attempt.session_id.substring(0, 8)}...</div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm font-medium mb-2">Criterion Scores</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {attempt.ratings && Object.entries(attempt.ratings).map(([criterion, score]) => (
                        <div key={criterion} className="flex justify-between">
                          <span className="capitalize">
                            {criterion.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="font-medium">{String(score)}/3</span>
                        </div>
                      ))}
                      {(!attempt.ratings || Object.keys(attempt.ratings).length === 0) && (
                        <div className="text-muted-foreground col-span-2">No scores available</div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Score: {Math.round((attempt.overall_score || 0) * 100)}%</span>
                    {attempt.notes && (
                      <span className="italic">"{attempt.notes.substring(0, 30)}..."</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

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