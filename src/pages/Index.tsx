import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Video, BarChart3, Plus, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">PE Skills Assessment Tool</h1>
          <p className="text-lg text-muted-foreground">Assess, track, and improve student performance</p>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/students">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="text-center">
                <Users className="w-12 h-12 mx-auto text-primary mb-2" />
                <CardTitle>Students</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Manage student roster and import from CSV
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/skills">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="text-center">
                <Target className="w-12 h-12 mx-auto text-primary mb-2" />
                <CardTitle>Skills & Rubrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Define skills and assessment criteria
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/new-attempt">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="text-center">
                <Video className="w-12 h-12 mx-auto text-primary mb-2" />
                <CardTitle>New Attempt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Record or upload video assessments
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/reports">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-primary mb-2" />
                <CardTitle>Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  View analytics and export data
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start">
                <Link to="/new-attempt">
                  <Video className="w-4 h-4 mr-2" />
                  Start New Assessment
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start">
                <Link to="/students/import">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Students
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No recent assessments. Get started by creating a new attempt or importing your student roster.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;