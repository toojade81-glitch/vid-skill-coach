import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface VideoSliderProps {
  videoFile: File;
  onFrameCapture?: (frame: string) => void;
  className?: string;
  initialTime?: number;
}

const VideoSlider = ({ videoFile, onFrameCapture, className = "", initialTime = 0 }: VideoSliderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Create video URL when component mounts or videoFile changes
  useEffect(() => {
    if (!videoFile) {
      setError("No video file provided");
      setIsLoading(false);
      return;
    }

    console.log("📁 Loading video file:", videoFile.name);
    setError("");
    setIsLoading(true);

    // Create object URL for the video file
    const videoUrl = URL.createObjectURL(videoFile);
    console.log("🔗 Created video URL:", videoUrl);

    const video = videoRef.current;
    if (video) {
      video.src = videoUrl;
      video.load(); // Force reload
    }

    // Cleanup function
    return () => {
      URL.revokeObjectURL(videoUrl);
      console.log("🧹 Cleaned up video URL");
    };
  }, [videoFile]);

  const handleVideoLoaded = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      console.log("✅ Video loaded successfully:", {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
      
      setDuration(video.duration);
      setIsLoading(false);
      
      // Set initial time if provided
      if (initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    }
  };

  const handleVideoError = (e: any) => {
    console.error("❌ Video loading error:", e);
    setError("Failed to load video. Please check the file format.");
    setIsLoading(false);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      captureCurrentFrame();
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
    }
  };

  const captureCurrentFrame = () => {
    if (videoRef.current && canvasRef.current && onFrameCapture) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx && video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const frameData = canvas.toDataURL('image/jpeg', 0.8);
        onFrameCapture(frameData);
      }
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch(err => {
          console.error("Play failed:", err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center ${className}`}>
        <div className="text-sm text-destructive mb-2">{error}</div>
        <div className="text-xs text-muted-foreground">
          File: {videoFile?.name} ({videoFile ? (videoFile.size / 1024 / 1024).toFixed(1) : 0}MB)
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-muted rounded-lg p-4 text-center ${className}`}>
        <div className="animate-pulse">
          <div className="w-full h-32 bg-muted-foreground/20 rounded mb-2"></div>
          <div className="text-sm text-muted-foreground">Loading video...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-32 object-cover rounded-lg border border-border"
          onLoadedMetadata={handleVideoLoaded}
          onError={handleVideoError}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          muted
          playsInline
          preload="metadata"
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        <Button
          onClick={togglePlayPause}
          size="sm"
          variant="secondary"
          className="absolute bottom-2 right-2"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Slider
          value={[currentTime]}
          onValueChange={handleSliderChange}
          max={duration}
          min={0}
          step={0.1}
          className="w-full"
        />
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        Scrub to select the best frame for assessment
      </div>
    </div>
  );
};

export default VideoSlider;