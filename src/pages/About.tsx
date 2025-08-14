import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Cpu, Target, BookOpen } from "lucide-react";

const About = () => {
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
          <h1 className="text-2xl font-bold text-primary">About</h1>
        </div>

        <div className="space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                This app uses AI-powered pose estimation to analyze your volleyball technique in real-time.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Record a 6-10 second video of your technique</li>
                <li>• AI analyzes your body position and movement</li>
                <li>• Get instant feedback on 4 key skill criteria</li>
                <li>• Adjust scores manually if needed</li>
                <li>• Track your progress over time</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="font-medium text-green-900 mb-2">100% Private Analysis</p>
                <ul className="space-y-1 text-green-800">
                  <li>• All video processing happens on your device</li>
                  <li>• Videos never leave your phone/computer</li>
                  <li>• No cloud uploads or external servers</li>
                  <li>• Only assessment scores are saved</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Technology
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Powered by TensorFlow.js and Google's MoveNet model for accurate pose detection.
              </p>
              <div className="text-muted-foreground">
                <p className="mb-2">What the AI measures:</p>
                <ul className="space-y-1">
                  <li>• Joint angles and body positioning</li>
                  <li>• Movement timing and sequence</li>
                  <li>• Contact points and technique form</li>
                  <li>• Stability and control metrics</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Scoring Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-red-50 p-2 rounded border">
                  <div className="font-bold text-red-700">0</div>
                  <div className="text-red-600">Not demonstrated</div>
                </div>
                <div className="bg-orange-50 p-2 rounded border">
                  <div className="font-bold text-orange-700">1</div>
                  <div className="text-orange-600">Needs work</div>
                </div>
                <div className="bg-yellow-50 p-2 rounded border">
                  <div className="font-bold text-yellow-700">2</div>
                  <div className="text-yellow-600">Mostly correct</div>
                </div>
                <div className="bg-green-50 p-2 rounded border">
                  <div className="font-bold text-green-700">3</div>
                  <div className="text-green-600">Excellent</div>
                </div>
              </div>
              <p className="text-muted-foreground mt-3">
                Remember: These are formative assessments to help you improve. Use the manual adjustment if you feel the AI scored something incorrectly.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Tips for Best Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Record in good lighting conditions</li>
                <li>• Frame your full body in the video</li>
                <li>• Stand at a slight angle to the camera</li>
                <li>• Keep movements clear and deliberate</li>
                <li>• Use the manual adjustment for edge cases</li>
              </ul>
            </CardContent>
          </Card>
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

export default About;