import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Download } from "lucide-react";

const Students = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Student Management</h1>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Upload a CSV file with columns: name, class, sex, DOB (YYYY-MM-DD format)
              </p>
              <Button>Choose CSV File</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student Roster</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No students found. Import a CSV file to get started.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Students;