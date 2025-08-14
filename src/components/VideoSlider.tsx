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
  const [debugInfo, setDebugInfo] = useState<any>({});

  // Debug the File object thoroughly
  useEffect(() => {
    console.log("🔍 DEEP FILE ANALYSIS:");
    console.log("videoFile:", videoFile);
    console.log("videoFile type:", typeof videoFile);
    console.log("videoFile instanceof File:", videoFile instanceof File);
    console.log("videoFile instanceof Blob:", videoFile instanceof Blob);
    
    if (videoFile) {
      const debug = {
        name: videoFile.name,
        size: videoFile.size,
        type: videoFile.type,
        lastModified: videoFile.lastModified,
        isFile: videoFile instanceof File,
        isBlob: videoFile instanceof Blob,
        constructor: videoFile.constructor.name
      };
      
      console.log("📊 File object details:", debug);
      setDebugInfo(debug);
      
      // Test blob URL creation immediately
      try {
        const testUrl = URL.createObjectURL(videoFile);
        console.log("✅ Blob URL created successfully:", testUrl);
        
        // Test if the blob URL actually works
        fetch(testUrl, { method: 'HEAD' })
          .then(response => {
            console.log("🌐 Blob URL fetch test:", {
              status: response.status,
              ok: response.ok,
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length')
            });
          })
          .catch(err => {
            console.error("❌ Blob URL fetch failed:", err);
          });
          
        URL.revokeObjectURL(testUrl);
      } catch (error) {
        console.error("❌ Blob URL creation failed:", error);
      }
      
      // Test if we can read the file directly
      const reader = new FileReader();
      reader.onload = () => {
        console.log("✅ FileReader successful - file is readable");
      };
      reader.onerror = () => {
        console.error("❌ FileReader failed - file may be corrupted or inaccessible");
      };
      reader.readAsArrayBuffer(videoFile.slice(0, 1024)); // Read first 1KB as test
    }
  }, [videoFile]);

  // Create and test blob URL when component mounts
  const [blobUrl, setBlobUrl] = useState<string>("");
  
  useEffect(() => {
    if (videoFile) {
      console.log("🎬 Creating blob URL for video element...");
      
      try {
        const url = URL.createObjectURL(videoFile);
        console.log("✅ Blob URL created:", url);
        setBlobUrl(url);
        
        // Test the blob URL immediately
        const testImg = new Image();
        testImg.onload = () => console.log("✅ Blob URL is accessible");
        testImg.onerror = () => console.log("❌ Blob URL test failed");
        testImg.src = url;
        
        return () => {
          URL.revokeObjectURL(url);
          console.log("🧹 Blob URL revoked");
        };
      } catch (error) {
        console.error("❌ Blob URL creation error:", error);
      }
    }
  }, [videoFile]);

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
    console.log("🎉 handleVideoLoaded called");
    console.log("📺 Video element state:", {
      hasVideo: !!video,
      src: video?.src,
      duration: video?.duration,
      readyState: video?.readyState,
      networkState: video?.networkState,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      error: video?.error
    });
    
    if (video && video.duration && video.duration > 0) {
      console.log("✅ Video loaded successfully with duration:", video.duration);
      setDuration(video.duration);
      setVideoReady(true);
      
      if (initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    } else {
      console.warn("⚠️ Video loaded but no duration available");
    }
  };

  const handleVideoError = (e: any) => {
    const video = videoRef.current;
    console.error("❌ Video error event:", e);
    console.error("📺 Video error details:", {
      error: video?.error,
      errorCode: video?.error?.code,
      errorMessage: video?.error?.message,
      src: video?.src,
      readyState: video?.readyState,
      networkState: video?.networkState
    });
  };

  if (!videoReady) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Debug info panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-900 mb-2">🔍 FILE DEBUG INFO:</div>
          <div className="text-xs text-blue-800 space-y-1">
            <div>Name: {debugInfo.name}</div>
            <div>Size: {debugInfo.size ? `${(debugInfo.size / 1024 / 1024).toFixed(2)}MB` : 'Unknown'}</div>
            <div>Type: {debugInfo.type}</div>
            <div>Is File: {debugInfo.isFile ? 'Yes' : 'No'}</div>
            <div>Is Blob: {debugInfo.isBlob ? 'Yes' : 'No'}</div>
            <div>Constructor: {debugInfo.constructor}</div>
            <div>Blob URL: {blobUrl ? 'Created' : 'None'}</div>
            <div>Blob URL Value: {blobUrl}</div>
          </div>
        </div>

        <div className="relative">
          {/* Add comprehensive event handlers for debugging */}
          <video
            ref={videoRef}
            src={blobUrl}
            className="w-full h-32 object-cover rounded-lg border border-border"
            onLoadStart={() => console.log("📡 Video loadstart event")}
            onLoadedMetadata={handleVideoLoaded}
            onLoadedData={() => console.log("📊 Video loadeddata event")}
            onCanPlay={() => console.log("🟢 Video canplay event")}
            onCanPlayThrough={() => console.log("🟢 Video canplaythrough event")}
            onError={handleVideoError}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            muted
            playsInline
            controls={false}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="text-white text-sm">Loading video...</div>
          </div>
        </div>
        
        {/* Fallback: Multiple video players with different approaches */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="text-xs text-gray-600 mb-2">Fallback players (try these if main doesn't work):</div>
          
          {/* Method 1: Direct blob URL */}
          <div>
            <div className="text-xs text-gray-500">Method 1 - Direct blob URL:</div>
            <video controls className="w-full h-16 rounded" src={blobUrl} />
          </div>
          
          {/* Method 2: Fresh blob URL each time */}
          <div>
            <div className="text-xs text-gray-500">Method 2 - Fresh blob URL:</div>
            <video controls className="w-full h-16 rounded" src={videoFile ? URL.createObjectURL(videoFile) : ''} />
          </div>
          
          {/* Method 3: Source element */}
          <div>
            <div className="text-xs text-gray-500">Method 3 - Source element:</div>
            <video controls className="w-full h-16 rounded">
              <source src={blobUrl} type={videoFile?.type} />
              <source src={blobUrl} />
            </video>
          </div>
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
          src={blobUrl}
          className="w-full h-32 object-cover rounded-lg border border-border"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          muted
          playsInline
          controls={false}
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