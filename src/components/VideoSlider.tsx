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
  const [videoReady, setVideoReady] = useState(false);

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
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Simple video ready handler
  const handleVideoLoaded = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      console.log("Video loaded:", video.duration);
      setDuration(video.duration);
      setVideoReady(true);
      
      if (initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    }
  };

  if (!videoReady) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="relative">
          {/* Simple, direct video element - let browser handle everything */}
          <video
            ref={videoRef}
            className="w-full h-32 object-cover rounded-lg border border-border"
            onLoadedMetadata={handleVideoLoaded}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            muted
            playsInline
            controls={false}
          >
            <source src={URL.createObjectURL(videoFile)} type={videoFile.type} />
            Your browser does not support video playback.
          </video>
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="text-white text-sm">Loading video...</div>
          </div>
        </div>
        
        {/* Fallback: Basic HTML5 video with controls */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-2">If video doesn't load above, use this player:</div>
          <video
            controls
            className="w-full h-24 rounded"
            preload="metadata"
          >
            <source src={URL.createObjectURL(videoFile)} type={videoFile.type} />
            <source src={URL.createObjectURL(videoFile)} />
            Your browser does not support video playback.
          </video>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          Preparing video for frame analysis...
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
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          muted
          playsInline
          controls={false}
        >
          <source src={URL.createObjectURL(videoFile)} type={videoFile.type} />
        </video>
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