import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BarChart3, Video, Users, Shield, LogIn, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Volleyball Skill Assessor</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  {user.email}
                </div>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button asChild>
                <Link to="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
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
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm">
              <Shield className="h-4 w-4" />
              100% Private - All analysis happens on your device
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
                <Button asChild className="w-full" disabled={!user}>
                  <Link to="/new-attempt">
                    Start Recording
                  </Link>
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Sign in required
                  </p>
                )}
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
                  Review your past assessments and track your progress over time.
                </p>
                <Button asChild variant="outline" className="w-full" disabled={!user}>
                  <Link to="/history">
                    View History
                  </Link>
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Sign in required
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Cards */}
          <div className="grid gap-6 md:grid-cols-2 mt-12">
            <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• All video analysis happens on your device</li>
                  <li>• No video data is sent to external servers</li>
                  <li>• Student information is now protected with authentication</li>
                  <li>• Your assessments are private and secure</li>
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
                  Get instant feedback and track your progress securely.
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