import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download } from "lucide-react";

interface LocalVideoPlayerProps {
  videoBlob: Blob;
  onFrameCapture?: (frame: string) => void;
  className?: string;
  initialTime?: number;
}

const LocalVideoPlayer = ({ videoBlob, onFrameCapture, className = "", initialTime = 0 }: LocalVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");

  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      setError(""); // Clear any previous errors
      console.log("🎬 Local video URL created:", url);

      // Cleanup function to revoke URL
      return () => {
        URL.revokeObjectURL(url);
        setVideoUrl("");
        console.log("🗑️ Local video URL revoked");
      };
    }
  }, [videoBlob]);
 
  // Watchdog: if the video never becomes ready, show a helpful error instead of infinite loading
  useEffect(() => {
    if (!videoUrl) return;
    const timer = setTimeout(() => {
      if (!videoReady) {
        console.warn("⏱️ Local video still not ready; likely unsupported codec.");
        setError("Local video playback error: Format may be unsupported. Please record in MP4 (H.264/AAC) or try a different browser.");
        setVideoReady(false);
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [videoUrl, videoReady]);
 
  const handleVideoLoaded = () => {
    const video = videoRef.current;
    console.log("🎉 Local video loaded successfully:", {
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

  const handleVideoError = (e: any) => {
    const video = videoRef.current;
    console.error("❌ Local video error:", {
      error: video?.error,
      errorCode: video?.error?.code,
      errorMessage: video?.error?.message,
      event: e
    });
    
    const errorMessages = {
      1: 'Video loading was aborted',
      2: 'Network error while loading video',
      3: 'Video format not supported or corrupted',
      4: 'Video source not suitable'
    };
    
    const errorCode = video?.error?.code;
    const errorMessage = errorCode ? errorMessages[errorCode as keyof typeof errorMessages] : 'Unknown video error';
    
    setError(`Video playback failed: ${errorMessage}. Please try recording in MP4 format or use a different browser.`);
    setVideoReady(false);
    setIsPlaying(false);
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
          setError("Playback failed");
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const downloadVideo = () => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `volleyball-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const reloadVideo = () => {
    setError("");
    setVideoReady(false);
    setIsPlaying(false);
    
    if (videoBlob) {
      // Force recreation of video URL
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
    }
  };

  if (error) {
    return (
      <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 ${className}`}>
        <div className="text-sm text-destructive mb-3">{error}</div>
        
        <div className="flex gap-2 mb-3">
          <Button onClick={reloadVideo} size="sm" variant="outline">
            Retry Video
          </Button>
          <Button onClick={downloadVideo} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Download Video
          </Button>
        </div>
        
        {/* Enhanced Fallback Player with Scrubbing */}
        {videoUrl && (
          <div className="mt-2 space-y-3">
            <div className="text-xs text-muted-foreground mb-1">Fallback player:</div>
            
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-32 object-cover rounded-lg border border-border"
                onLoadedMetadata={() => {
                  const video = videoRef.current;
                  if (video && video.duration && video.duration > 0) {
                    setDuration(video.duration);
                    setVideoReady(true);
                    setError("");
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={handleVideoError}
                muted
                playsInline
                controls={false}
              >
                <source src={videoUrl} type={(videoBlob as any)?.type || 'video/mp4'} />
                Your browser does not support video playback.
              </video>
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-2 right-2">
                <Button
                  onClick={togglePlayPause}
                  size="sm"
                  variant="secondary"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {duration > 0 && (
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
            )}
            
            <div className="text-xs text-muted-foreground text-center">
              Fallback mode - Scrub to select the best frame for assessment
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!videoReady || !videoUrl) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Info panel */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-800 space-y-1">
            <div>🔒 Local Mode: Video stays on your device</div>
            <div>Video Size: {(videoBlob.size / 1024 / 1024).toFixed(1)}MB</div>
            <div>Status: {videoUrl ? 'Loading local video...' : 'Preparing video...'}</div>
          </div>
        </div>

        {videoUrl && (
          <div className="relative">
            <video
              ref={videoRef}
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
            >
              <source src={videoUrl} type={(videoBlob as any)?.type || 'video/mp4'} />
            </video>
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Loading overlay */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="text-white text-sm">Loading local video...</div>
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-center">
          🔒 Secure local playback - video never leaves your device
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Security indicator */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
        <div className="text-xs text-green-800 flex items-center justify-between">
          <span>🔒 Secure Local Mode - Video stays on your device</span>
          <Button
            onClick={downloadVideo}
            size="sm"
            variant="outline"
            className="h-6 px-2 gap-1"
          >
            <Download className="h-3 w-3" />
            Save
          </Button>
        </div>
      </div>

      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-32 object-cover rounded-lg border border-border"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={handleVideoError}
          muted
          playsInline
          controls={false}
        >
          <source src={videoUrl} type={(videoBlob as any)?.type || 'video/mp4'} />
        </video>
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-2 right-2">
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

export default LocalVideoPlayer;