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

    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.load(); // Force load

    const handleLoadedMetadata = () => {
      console.log(`Video loaded: ${video.duration}s`);
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

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
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse text-center">Loading video...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{componentName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-40 object-contain bg-black"
            muted
            playsInline
            controls={false}
            preload="metadata"
          />
          
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={togglePlayPause}
              className="h-8 w-8 p-0"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            
            <div className="flex-1 px-2">
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={handleSliderChange}
                className="w-full"
              />
            </div>
            
            <div className="text-xs text-white bg-black/50 px-1 rounded">
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
          <div className="mt-2">
            <img 
              src={capturedFrame} 
              alt={`${componentName} captured frame`}
              className="w-full h-20 object-cover rounded border"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoSlider;