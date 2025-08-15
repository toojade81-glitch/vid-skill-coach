import { useState, useRef, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCw } from "lucide-react";
import { VideoUploadService } from "@/lib/videoUploadService";

interface VideoPlayerProps {
  videoUrl: string;
  storagePath?: string;
  onFrameCapture?: (frame: string) => void;
  className?: string;
  initialTime?: number;
}

const VideoPlayer = ({ videoUrl, storagePath, onFrameCapture, className = "", initialTime = 0 }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState<string>("");
  const [currentUrl, setCurrentUrl] = useState(videoUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh signed URL function
  const refreshUrl = useCallback(async () => {
    if (!storagePath) return;
    
    setIsRefreshing(true);
    try {
      console.log("🔄 Refreshing video URL for path:", storagePath);
      const newUrl = await VideoUploadService.getVideoUrl(storagePath);
      setCurrentUrl(newUrl);
      setError("");
      console.log("✅ URL refreshed successfully");
    } catch (error) {
      console.error("❌ Failed to refresh URL:", error);
      setError("Failed to refresh video URL");
    } finally {
      setIsRefreshing(false);
    }
  }, [storagePath]);

  // Auto-refresh URL when it expires (401/403 errors)
  const handleVideoError = useCallback(async (e: any) => {
    const video = videoRef.current;
    const errorCode = video?.error?.code;
    
    console.error("❌ Video error:", {
      error: video?.error,
      errorCode,
      errorMessage: video?.error?.message,
      networkState: video?.networkState
    });

    // If it's a network error and we have storage path, try refreshing
    if ((errorCode === 2 || errorCode === 4) && storagePath && !isRefreshing) {
      console.log("🔄 Network error detected, attempting URL refresh...");
      await refreshUrl();
    } else {
      setError(`Video playback error: ${video?.error?.message || 'Unknown error'}`);
      setVideoReady(false);
    }
  }, [storagePath, refreshUrl, isRefreshing]);

  // Initialize video
  useEffect(() => {
    console.log("🎬 VideoPlayer initialized with URL:", currentUrl);
    setVideoReady(false);
    setError("");
    
    if (!currentUrl) {
      setError("No video URL provided");
      return;
    }

    // Reset video state when URL changes
    const video = videoRef.current;
    if (video) {
      video.load(); // Reload the video element
    }
  }, [currentUrl]);

  const handleVideoLoaded = () => {
    const video = videoRef.current;
    console.log("🎉 Video loaded successfully:", {
      duration: video?.duration,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      readyState: video?.readyState
    });
    
    if (video && video.duration && video.duration > 0) {
      setDuration(video.duration);
      setVideoReady(true);
      setError("");
      
      if (initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    }
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

  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        try {
          await video.play();
        } catch (err: any) {
          console.error("Play failed:", err);
          // If play fails with network error, try refreshing URL
          if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
            if (storagePath) {
              console.log("🔄 Play failed, refreshing URL...");
              await refreshUrl();
            } else {
              setError("Playback failed - please refresh the page");
            }
          } else {
            setError("Playback failed");
          }
        }
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
      <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 ${className}`}>
        <div className="text-sm text-destructive mb-3">{error}</div>
        
        {storagePath && (
          <Button 
            onClick={refreshUrl} 
            disabled={isRefreshing}
            size="sm" 
            variant="outline" 
            className="mb-3 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Video'}
          </Button>
        )}
        
        {/* Fallback: Basic video element with controls */}
        <div className="mt-2">
          <div className="text-xs text-muted-foreground mb-1">Fallback player:</div>
          <video
            controls
            className="w-full h-24 rounded border"
            src={currentUrl}
            playsInline
            muted
          >
            Your browser does not support video playback.
          </video>
        </div>
      </div>
    );
  }

  if (!videoReady) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Debug info panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-800 space-y-1">
            <div>Video URL: {currentUrl ? 'Available' : 'None'}</div>
            <div>Storage Path: {storagePath || 'None'}</div>
            <div>Status: Loading video...</div>
          </div>
        </div>

        <div className="relative">
          <video
            ref={videoRef}
            src={currentUrl}
            className="w-full h-32 object-cover rounded-lg border border-border"
            onLoadedMetadata={handleVideoLoaded}
            onLoadedData={handleVideoLoaded}
            onCanPlay={handleVideoLoaded}
            onError={handleVideoError}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            muted
            playsInline
            controls={false}
            preload="metadata"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="text-white text-sm">Loading video...</div>
          </div>
        </div>
        
        {/* Fallback: Basic HTML5 video with controls */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-2">Direct player (should work immediately):</div>
          <video
            controls
            className="w-full h-24 rounded"
            src={currentUrl}
            preload="metadata"
            playsInline
            muted
          >
            Your browser does not support video playback.
          </video>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          Loading video...
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          src={currentUrl}
          className="w-full h-32 object-cover rounded-lg border border-border"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={handleVideoError}
          muted
          playsInline
          controls={false}
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-2 right-2 flex gap-2">
          {storagePath && (
            <Button
              onClick={refreshUrl}
              disabled={isRefreshing}
              size="sm"
              variant="secondary"
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            onClick={togglePlayPause}
            size="sm"
            variant="secondary"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
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

export default VideoPlayer;