import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface VideoSliderProps {
  videoUrl: string;
  onFrameCapture?: (frame: string) => void;
  className?: string;
  initialTime?: number;
}

const VideoSlider = ({ videoUrl, onFrameCapture, className = "", initialTime = 0 }: VideoSliderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState<string>("");

  // Debug video URL and loading
  useEffect(() => {
    console.log("🎬 VideoSlider initialized with URL:", videoUrl);
    setVideoReady(false);
    setError("");
    
    if (!videoUrl) {
      setError("No video URL provided");
      return;
    }

    // Removed HEAD request check which can incorrectly fail with 400 on some CDNs/CORS
  }, [videoUrl]);

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

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = videoRef.current;
    console.error("❌ Video error:", {
      error: video?.error,
      errorCode: video?.error?.code,
      errorMessage: video?.error?.message,
      networkState: video?.networkState
    });
    const msg = video?.error?.message || '';
    const code = video?.error?.code;
    const notSupported = code === 4 || code === 3 || /NotSupportedError|MEDIA_ERR_SRC_NOT_SUPPORTED/i.test(msg);
    setError(
      notSupported
        ? "Local video playback error: Format may be unsupported. Please record in MP4 (H.264/AAC) or try a different browser."
        : `Video playback error: ${msg || 'Unknown error'}`
    );
    setVideoReady(false);
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
          setError("Playback failed");
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
      <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 ${className}`}>
        <div className="text-sm text-destructive mb-2">{error}</div>
        <div className="text-xs text-muted-foreground mb-2">
          URL: {videoUrl}
        </div>
        
        {/* Fallback: Basic video element with controls */}
        <div className="mt-2">
          <div className="text-xs text-muted-foreground mb-1">Fallback player:</div>
          <video
            key={videoUrl}
            controls
            className="w-full h-24 rounded border"
            src={videoUrl}
            playsInline
            muted
            crossOrigin="anonymous"
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
            <div>Video URL: {videoUrl ? 'Available' : 'None'}</div>
            <div>Status: Loading from Supabase Storage...</div>
          </div>
        </div>

        <div className="relative">
          <video
            key={videoUrl}
            ref={videoRef}
            src={videoUrl}
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
            crossOrigin="anonymous"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="text-white text-sm">Loading video from storage...</div>
          </div>
        </div>
        
        {/* Fallback: Basic HTML5 video with controls */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-2">Direct player (should work immediately):</div>
          <video
            key={videoUrl + ':fallback'}
            controls
            className="w-full h-24 rounded"
            src={videoUrl}
            preload="metadata"
            playsInline
            muted
            crossOrigin="anonymous"
          >
            Your browser does not support video playback.
          </video>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          Loading video from Supabase Storage...
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <video
          key={videoUrl}
          ref={videoRef}
          src={videoUrl}
          className="w-full h-32 object-cover rounded-lg border border-border"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          muted
          playsInline
          controls={false}
          crossOrigin="anonymous"
        />
        <canvas ref={canvasRef} className="hidden" />
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