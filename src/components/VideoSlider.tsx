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
    let timeoutId: NodeJS.Timeout;
    let cleanupUrl: string | null = null;
    
    if (videoFile) {
      console.log("🎬 Processing new video file:", {
        name: videoFile.name,
        type: videoFile.type,
        size: videoFile.size,
        lastModified: videoFile.lastModified
      });

      resetVideoState();
      setLoadingProgress("Creating video URL...");
      
      try {
        // Create blob URL with proper error handling
        const url = URL.createObjectURL(videoFile);
        cleanupUrl = url;
        
        // Generate unique key to force video element refresh
        const key = `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}-${Date.now()}`;
        setVideoKey(key);
        
        console.log("🔗 Created blob URL:", url);
        console.log("🔑 Video key:", key);
        
        // Test blob URL validity
        fetch(url, { method: 'HEAD' })
          .then(response => {
            console.log("🌐 Blob URL test - Status:", response.status, "Type:", response.headers.get('content-type'));
            if (response.ok) {
              setVideoUrl(url);
              setLoadingProgress("Video URL ready, loading...");
            } else {
              throw new Error(`Blob URL test failed: ${response.status}`);
            }
          })
          .catch(err => {
            console.error("❌ Blob URL test failed:", err);
            setError("Failed to validate video URL");
            setIsLoading(false);
          });

        // Fallback timeout for stuck loading
        timeoutId = setTimeout(() => {
          console.warn("⏰ Video loading timeout reached after 8 seconds");
          const video = videoRef.current;
          if (video) {
            console.log("🔍 Timeout state check:", {
              src: video.src,
              readyState: video.readyState,
              networkState: video.networkState,
              error: video.error,
              duration: video.duration,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            });
            
            if (video.error) {
              setError(`Video error: ${video.error.message} (Code: ${video.error.code})`);
            } else if (video.networkState === 3) {
              setError("Network error: Unable to load video");
            } else if (video.readyState === 0) {
              setError("Video format may not be supported");
            } else if (video.duration && video.duration > 0) {
              // Video is actually ready but events didn't fire properly
              console.log("🔧 Force completing video setup");
              handleVideoReady();
            } else {
              // Try with a test video URL
              setError("Video loading failed - trying test video");
              const testUrl = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=";
              video.src = testUrl;
            }
            setIsLoading(false);
          }
        }, 8000);

        return () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (cleanupUrl) {
            console.log("🧹 Cleaning up blob URL:", cleanupUrl);
            URL.revokeObjectURL(cleanupUrl);
          }
        };
      } catch (error) {
        console.error("❌ Failed to create video URL:", error);
        setError("Failed to process video file");
        setIsLoading(false);
      }
    } else {
      console.log("❌ No video file provided");
      setError("No video source");
      setIsLoading(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (cleanupUrl) URL.revokeObjectURL(cleanupUrl);
    };
  }, [videoFile, handleVideoReady, resetVideoState]);

  const handleLoadStart = () => {
    console.log("loadstart event fired");
    setLoadingProgress("Loading started...");
  };

  const handleLoadedMetadata = () => {
    console.log("loadedmetadata event fired");
    setLoadingProgress("Metadata loaded...");
    handleVideoReady();
  };

  const handleLoadedData = () => {
    console.log("loadeddata event fired");
    setLoadingProgress("Data loaded...");
    handleVideoReady();
  };

  const handleCanPlay = () => {
    console.log("canplay event fired");
    setLoadingProgress("Can play...");
    handleVideoReady();
  };

  const handleCanPlayThrough = () => {
    console.log("canplaythrough event fired");
    setLoadingProgress("Ready to play...");
    handleVideoReady();
  };

  const handleError = (e: any) => {
    console.error("Video error:", e);
    const video = e.target;
    let errorMessage = "Unknown error";
    
    if (video?.error) {
      switch (video.error.code) {
        case 1:
          errorMessage = "Video loading aborted";
          break;
        case 2:
          errorMessage = "Network error";
          break;
        case 3:
          errorMessage = "Video format not supported";
          break;
        case 4:
          errorMessage = "Video not found";
          break;
        default:
          errorMessage = video.error.message || "Unknown video error";
      }
    }
    
    setIsLoading(false);
    setError(`Failed to load video: ${errorMessage}`);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      captureCurrentFrame();
    }
  };

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
          src={videoUrl}
          key={videoKey}
          className="w-full h-32 object-cover rounded-lg border border-border"
          onLoadStart={handleLoadStart}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onCanPlay={handleCanPlay}
          onCanPlayThrough={handleCanPlayThrough}
          onError={handleError}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="metadata"
          controls={false}
          muted
          playsInline
          crossOrigin="anonymous"
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