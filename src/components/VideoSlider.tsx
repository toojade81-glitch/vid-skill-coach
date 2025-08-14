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
    console.log("🎬 VideoSlider useEffect triggered", {
      hasVideoFile: !!videoFile,
      fileName: videoFile?.name,
      fileSize: videoFile?.size,
      fileType: videoFile?.type
    });

    if (!videoFile) {
      console.log("❌ No video file provided to VideoSlider");
      setError("No video file provided");
      setIsLoading(false);
      return;
    }

    console.log("📁 Processing video file:", {
      name: videoFile.name,
      type: videoFile.type,
      size: `${(videoFile.size / 1024 / 1024).toFixed(2)}MB`,
      lastModified: new Date(videoFile.lastModified).toISOString()
    });
    
    setError("");
    setIsLoading(true);

    try {
      // Create object URL for the video file
      const videoUrl = URL.createObjectURL(videoFile);
      console.log("🔗 Created video URL successfully:", videoUrl);

      const video = videoRef.current;
      if (video) {
        console.log("📺 Setting video src and loading...");
        video.src = videoUrl;
        video.load(); // Force reload
        console.log("✅ Video element configured with src:", video.src);
      } else {
        console.error("❌ Video ref is null!");
        setError("Video element not available");
        setIsLoading(false);
      }

      // Cleanup function
      return () => {
        URL.revokeObjectURL(videoUrl);
        console.log("🧹 Cleaned up video URL:", videoUrl);
      };
    } catch (error) {
      console.error("❌ Error creating video URL:", error);
      setError(`Failed to create video URL: ${error}`);
      setIsLoading(false);
    }
  }, [videoFile]);

  const handleVideoLoaded = () => {
    const video = videoRef.current;
    console.log("🎉 handleVideoLoaded called", {
      hasVideo: !!video,
      duration: video?.duration,
      readyState: video?.readyState,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      src: video?.src
    });
    
    if (video && video.duration && video.duration > 0) {
      console.log("✅ Video loaded successfully:", {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState
      });
      
      setDuration(video.duration);
      setIsLoading(false);
      
      // Set initial time if provided
      if (initialTime > 0 && initialTime < video.duration) {
        console.log("⏰ Setting initial time:", initialTime);
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    } else {
      console.warn("⚠️ Video loaded but duration not available yet", {
        duration: video?.duration,
        readyState: video?.readyState
      });
    }
  };

  const handleVideoError = (e: any) => {
    console.error("❌ Video loading error:", e);
    const video = videoRef.current;
    console.error("Video error details:", {
      error: video?.error,
      errorCode: video?.error?.code,
      errorMessage: video?.error?.message,
      src: video?.src,
      readyState: video?.readyState,
      networkState: video?.networkState
    });
    setError(`Failed to load video: ${video?.error?.message || 'Unknown error'}`);
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
    console.log("🎮 togglePlayPause called", {
      hasVideo: !!video,
      isPlaying,
      currentTime: video?.currentTime,
      duration: video?.duration,
      readyState: video?.readyState
    });
    
    if (video) {
      if (isPlaying) {
        console.log("⏸️ Pausing video");
        video.pause();
      } else {
        console.log("▶️ Playing video");
        video.play().catch(err => {
          console.error("❌ Play failed:", err);
        });
      }
      setIsPlaying(!isPlaying);
    } else {
      console.error("❌ Video ref is null in togglePlayPause");
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
        <div className="text-xs text-muted-foreground mb-2">
          File: {videoFile?.name} ({videoFile ? (videoFile.size / 1024 / 1024).toFixed(1) : 0}MB, {videoFile?.type})
        </div>
        {/* Add a fallback basic video element */}
        <div className="mt-2">
          <div className="text-xs text-muted-foreground mb-1">Fallback player:</div>
          <video
            controls
            className="w-full h-24 rounded border"
            src={videoFile ? URL.createObjectURL(videoFile) : ''}
            playsInline
            muted
          >
            Your browser does not support video playback.
          </video>
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