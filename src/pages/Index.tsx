import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Users, Target, Plus, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">PE Skill Video Assessor</h1>
          <p className="text-xl text-muted-foreground">
            Comprehensive assessment tool for PE teachers
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto mb-2 text-primary" />
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-center">
                Manage student roster and import from CSV
              </p>
              <Button asChild className="w-full">
                <Link to="/students">Manage Students</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Target className="h-12 w-12 mx-auto mb-2 text-primary" />
              <CardTitle>Skills & Rubrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-center">
                Configure skills and assessment rubrics
              </p>
              <Button asChild className="w-full">
                <Link to="/skills">Manage Skills</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Plus className="h-12 w-12 mx-auto mb-2 text-primary" />
              <CardTitle>New Attempt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-center">
                Record new video assessment
              </p>
              <Button asChild className="w-full">
                <Link to="/new-attempt">Start Assessment</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-primary" />
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-center">
                View assessments and export data
              </p>
              <Button asChild className="w-full">
                <Link to="/reports">View Reports</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
