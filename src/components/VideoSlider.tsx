import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, Camera } from "lucide-react";

interface VideoSliderProps {
  videoFile: File;
  componentName: string;
  onFrameCapture: (dataUrl: string) => void;
  initialCapturedFrame?: string;
}

const VideoSlider = ({ videoFile, componentName, onFrameCapture, initialCapturedFrame }: VideoSliderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [capturedFrame, setCapturedFrame] = useState<string>(initialCapturedFrame || "");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoFile) return;

    console.log(`Loading video for ${componentName}:`, videoFile.name);
    
    const url = URL.createObjectURL(videoFile);
    video.src = url;

    const handleLoadedData = () => {
      console.log(`Video data loaded for ${componentName}`);
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log(`Video can play for ${componentName}`);
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    const handleError = (e: any) => {
      console.error(`Video error for ${componentName}:`, e);
      setIsLoading(false);
    };

    // Use multiple events to ensure loading
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Set a timeout to force loading state to false
    const loadTimeout = setTimeout(() => {
      if (video.duration && video.duration > 0) {
        setDuration(video.duration);
        setIsLoading(false);
      }
    }, 2000);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      clearTimeout(loadTimeout);
      URL.revokeObjectURL(url);
    };
  }, [videoFile, componentName]);

  const handleSliderChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Pause video when scrubbing
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(error => {
        console.error('Failed to play video:', error);
      });
    }
  };

  const captureCurrentFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedFrame(dataUrl);
    onFrameCapture(dataUrl);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <div className="text-sm text-muted-foreground">Loading {componentName} video...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">{componentName}</div>
      
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-48 object-contain bg-black"
          muted
          playsInline
          controls={false}
          preload="auto"
        />
        
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-black/50 rounded p-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={togglePlayPause}
            className="h-6 w-6 p-0 shrink-0"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          
          <div className="flex-1 px-1">
            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={0.1}
              onValueChange={handleSliderChange}
              className="w-full"
            />
          </div>
          
          <div className="text-xs text-white bg-black/70 px-1 rounded shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={captureCurrentFrame}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Capture Frame
        </Button>
        
        {capturedFrame && (
          <div className="text-xs text-green-600 font-medium">
            Frame captured ✓
          </div>
        )}
      </div>

      {capturedFrame && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Captured Frame:</div>
          <img 
            src={capturedFrame} 
            alt={`${componentName} captured frame`}
            className="w-full h-24 object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
};

export default VideoSlider;