import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BarChart3, Video, Users, Shield } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Volleyball Skill Assessor</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-primary mb-4">
              AI-Powered Volleyball Assessment
            </h2>
            <p className="text-xl text-muted-foreground mb-6">
              Record your technique, get instant feedback, and track your progress with on-device AI analysis
            </p>
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm">
              <Shield className="h-4 w-4" />
              100% Private - No data stored on servers, everything stays on your device
            </div>
          </div>

          {/* Main Action Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  New Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Record your volleyball technique and get instant AI-powered feedback on your form.
                </p>
                <Button asChild className="w-full">
                  <Link to="/new-attempt">
                    Start Recording
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  View History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Review your past assessments stored locally on your device.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/history">
                    View History
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info Cards */}
          <div className="grid gap-6 md:grid-cols-2 mt-12">
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Shield className="h-5 w-5" />
                  Complete Privacy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-green-800">
                  <li>• All video analysis happens on your device</li>
                  <li>• No video data is sent to external servers</li>
                  <li>• No account required - completely anonymous</li>
                  <li>• Assessment history stored locally in your browser</li>
                  <li>• No personal information collected</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  About This App
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  This app uses on-device AI to analyze volleyball techniques for Setting and Digging skills. 
                  Get instant feedback and track your progress with complete privacy.
                </p>
                <Button asChild variant="link" className="p-0 mt-2">
                  <Link to="/about">Learn More</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;