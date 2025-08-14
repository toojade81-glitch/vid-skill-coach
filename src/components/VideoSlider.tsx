import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, AlertCircle } from "lucide-react";

interface VideoSliderProps {
  videoFile: File;
  onFrameCapture?: (frame: string) => void;
  className?: string;
  initialTime?: number;
}

const VideoSlider = ({ videoFile, onFrameCapture, className = "", initialTime = 0 }: VideoSliderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoDataUrl, setVideoDataUrl] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Supported video formats
  const supportedFormats = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'];

  useEffect(() => {
    if (!videoFile) {
      setError("No video file provided");
      setIsLoading(false);
      return;
    }

    console.log("🎬 Processing video file:", {
      name: videoFile.name,
      type: videoFile.type,
      size: `${(videoFile.size / 1024 / 1024).toFixed(2)}MB`
    });

    // Check file format
    if (!supportedFormats.includes(videoFile.type) && !videoFile.name.toLowerCase().match(/\.(mp4|webm|ogg|avi|mov)$/)) {
      setError(`Unsupported video format: ${videoFile.type}. Please use MP4, WebM, or OGG.`);
      setIsLoading(false);
      return;
    }

    // Check file size (max 100MB)
    if (videoFile.size > 100 * 1024 * 1024) {
      setError("Video file too large. Please use a file smaller than 100MB.");
      setIsLoading(false);
      return;
    }

    setError("");
    setIsLoading(true);
    setLoadingProgress(0);

    // Method 1: Try FileReader with data URL (works better for some formats)
    const reader = new FileReader();
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        setLoadingProgress(progress);
        console.log(`📊 Loading progress: ${progress.toFixed(1)}%`);
      }
    };

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        console.log("✅ FileReader data URL created successfully");
        setVideoDataUrl(dataUrl);
        setLoadingProgress(100);
      } else {
        console.error("❌ FileReader failed to create data URL");
        tryBlobUrl();
      }
    };

    reader.onerror = (e) => {
      console.error("❌ FileReader error:", e);
      tryBlobUrl();
    };

    // Fallback method: Try blob URL if FileReader fails
    const tryBlobUrl = () => {
      try {
        console.log("🔄 Trying blob URL fallback...");
        const blobUrl = URL.createObjectURL(videoFile);
        setVideoDataUrl(blobUrl);
        console.log("✅ Blob URL created as fallback");
      } catch (error) {
        console.error("❌ Blob URL fallback failed:", error);
        setError("Failed to load video. Your browser may not support this video format.");
        setIsLoading(false);
      }
    };

    // Start reading the file
    try {
      reader.readAsDataURL(videoFile);
    } catch (error) {
      console.error("❌ FileReader start failed:", error);
      tryBlobUrl();
    }

    // Cleanup
    return () => {
      if (videoDataUrl && videoDataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoDataUrl);
      }
    };
  }, [videoFile]);

  const handleVideoReady = () => {
    const video = videoRef.current;
    if (!video) return;

    console.log("🎉 Video ready event:", {
      duration: video.duration,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState
    });

    if (video.duration && video.duration > 0) {
      setDuration(video.duration);
      setIsLoading(false);
      
      if (initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    }
  };

  const handleVideoError = (e: any) => {
    const video = videoRef.current;
    const errorCode = video?.error?.code;
    let errorMessage = "Unknown video error";

    switch (errorCode) {
      case 1:
        errorMessage = "Video loading was aborted";
        break;
      case 2:
        errorMessage = "Network error while loading video";
        break;
      case 3:
        errorMessage = "Video format not supported by your browser";
        break;
      case 4:
        errorMessage = "Video file not found or corrupted";
        break;
      default:
        errorMessage = video?.error?.message || "Video playback error";
    }

    console.error("❌ Video error:", { code: errorCode, message: errorMessage });
    setError(errorMessage);
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
          console.error("❌ Play failed:", err);
          setError("Playback failed. Try a different video format.");
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
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <div className="text-sm font-medium text-destructive">Video Loading Error</div>
        </div>
        <div className="text-sm text-destructive mb-2">{error}</div>
        <div className="text-xs text-muted-foreground mb-3">
          File: {videoFile?.name} ({videoFile ? (videoFile.size / 1024 / 1024).toFixed(1) : 0}MB, {videoFile?.type})
        </div>
        
        {/* Browser compatibility check */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
          <div className="text-xs font-medium text-yellow-800 mb-1">🔧 Troubleshooting:</div>
          <div className="text-xs text-yellow-700 space-y-1">
            <div>• Try converting to MP4 with H.264 codec</div>
            <div>• Ensure file is not corrupted</div>
            <div>• Try a different browser (Chrome, Firefox, Safari)</div>
          </div>
        </div>

        {/* Simple fallback player */}
        <div className="border rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">Basic HTML5 Player:</div>
          <video
            controls
            className="w-full h-20 rounded"
            preload="metadata"
          >
            <source src={videoDataUrl} type={videoFile?.type} />
            <source src={URL.createObjectURL(videoFile)} type={videoFile?.type} />
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
          <div className="text-sm text-muted-foreground mb-1">
            Loading video... {loadingProgress.toFixed(0)}%
          </div>
          <div className="w-full bg-muted-foreground/20 rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300" 
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          src={videoDataUrl}
          className="w-full h-32 object-cover rounded-lg border border-border"
          onLoadedMetadata={handleVideoReady}
          onLoadedData={handleVideoReady}
          onCanPlay={handleVideoReady}
          onCanPlayThrough={handleVideoReady}
          onError={handleVideoError}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          muted
          playsInline
          preload="auto"
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