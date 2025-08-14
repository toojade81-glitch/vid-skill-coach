import { useState, useRef, useEffect, useCallback } from "react";
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
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState<string>("Initializing...");
  const [videoKey, setVideoKey] = useState<string>("");

  const resetVideoState = useCallback(() => {
    setDuration(0);
    setCurrentTime(initialTime);
    setIsPlaying(false);
    setIsLoading(true);
    setError("");
    setLoadingProgress("Initializing...");
  }, [initialTime]);

  const handleVideoReady = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log("handleVideoReady called", {
      readyState: video.readyState,
      duration: video.duration,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    });

    if (video.duration && video.duration > 0 && video.videoWidth > 0 && video.videoHeight > 0) {
      console.log("Video fully ready with dimensions:", { duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      setDuration(video.duration);
      setIsLoading(false);
      setLoadingProgress("Complete");
      
      // Set initial time if provided
      if (initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    } else {
      console.log("Video not fully ready yet", { duration: video.duration, width: video.videoWidth, height: video.videoHeight });
    }
  }, [initialTime]);

  useEffect(() => {
    console.log("🔄 VideoSlider useEffect triggered", { 
      hasVideoFile: !!videoFile,
      videoFileName: videoFile?.name,
      currentVideoUrl: videoUrl
    });

    if (!videoFile) {
      console.log("❌ No video file provided");
      setError("No video file provided");
      setIsLoading(false);
      return;
    }

    // Reset state
    setError("");
    setIsLoading(true);
    setDuration(0);
    setCurrentTime(initialTime);
    setIsPlaying(false);
    setLoadingProgress("Creating video URL...");

    try {
      // Create blob URL
      const url = URL.createObjectURL(videoFile);
      console.log("✅ Blob URL created:", url);
      
      setVideoUrl(url);
      setLoadingProgress("Video URL set, waiting for load...");

      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up blob URL:", url);
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error("❌ Failed to create blob URL:", error);
      setError("Failed to create video URL");
      setIsLoading(false);
    }
  }, [videoFile?.name, videoFile?.size, videoFile?.lastModified, initialTime]);

  // Separate effect for video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    console.log("🎬 Setting up video element with URL:", videoUrl);

    const handleLoadedMetadata = () => {
      console.log("📊 Video metadata loaded:", {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      
      if (video.duration > 0) {
        setDuration(video.duration);
        setIsLoading(false);
        setLoadingProgress("Complete");
        
        // Set initial time if provided
        if (initialTime > 0 && initialTime < video.duration) {
          video.currentTime = initialTime;
          setCurrentTime(initialTime);
        }
      }
    };

    const handleError = (e: any) => {
      console.error("❌ Video error:", e);
      const errorCode = video.error?.code;
      const errorMessage = video.error?.message || "Unknown error";
      console.error("Video error details:", { code: errorCode, message: errorMessage });
      
      setError(`Video failed to load: ${errorMessage}`);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      captureCurrentFrame();
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Set the source
    video.src = videoUrl;
    console.log("🎯 Video src set to:", video.src);

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoUrl, initialTime]);

  // Remove these individual handlers since we're handling events in useEffect
  const handleLoadStart = () => console.log("🟡 loadstart event");
  const handleCanPlay = () => console.log("🟢 canplay event");
  const handleCanPlayThrough = () => console.log("🟢 canplaythrough event");

  const handleSliderChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
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
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
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
        {videoFile && (
          <div className="text-xs text-muted-foreground">
            File: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB, {videoFile.type})
          </div>
        )}
        <video
          controls
          className="w-full h-32 mt-2 rounded border"
          src={videoUrl || URL.createObjectURL(videoFile)}
          playsInline
          muted
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-muted rounded-lg p-4 text-center ${className}`}>
        <div className="animate-pulse">
          <div className="w-full h-32 bg-muted-foreground/20 rounded mb-2"></div>
          <div className="text-sm text-muted-foreground">{loadingProgress}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          key={`video-${videoFile?.name}-${videoFile?.size}`}
          className="w-full h-32 object-cover rounded-lg border border-border"
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onCanPlayThrough={handleCanPlayThrough}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="auto"
          controls={false}
          muted
          playsInline
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