import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ReferenceVideo {
  id: string;
  skill: string;
  video_url: string;
  uploaded_at: string;
  file_name?: string;
  file_size?: number;
}

interface ReferenceVideoUploadProps {
  skill: string;
  onReferenceVideoReady: (url: string) => void;
  onSkip?: () => void;
}

const ReferenceVideoUpload: React.FC<ReferenceVideoUploadProps> = ({
  skill,
  onReferenceVideoReady,
  onSkip
}) => {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingVideo, setExistingVideo] = useState<ReferenceVideo | null>(null);

  // Check for existing reference video on component mount
  React.useEffect(() => {
    checkExistingVideo();
  }, [skill]);

  const checkExistingVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('reference_videos')
        .select('*')
        .eq('skill', skill)
        .maybeSingle();

      if (error) {
        console.error('Error checking existing video:', error);
        return;
      }

      if (data) {
        console.log('Found existing reference video:', data);
        setExistingVideo(data);
        // Auto-proceed with existing reference video
        onReferenceVideoReady(data.video_url);
      }
    } catch (error) {
      console.error('Error checking existing video:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveVideoRecord = async (videoUrl: string, fileName: string, fileSize: number) => {
    try {
      const { error } = await supabase
        .from('reference_videos')
        .upsert({
          skill,
          video_url: videoUrl,
          file_name: fileName,
          file_size: fileSize
        }, {
          onConflict: 'skill'
        });

      if (error) {
        console.error('Error saving video record:', error);
      }
    } catch (error) {
      console.error('Error saving video record:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast.error("Reference video too large. Please keep under 100MB.");
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error("Please select a video file.");
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${skill.toLowerCase()}-reference-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`; // Simplified path

      console.log("🚀 Starting upload:", {
        fileName,
        fileSize: file.size,
        fileType: file.type,
        bucket: 'reference-videos'
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('reference-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("❌ Upload error details:", {
          message: error.message,
          error: error
        });
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log("✅ Upload successful:", data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('reference-videos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log("🔗 Public URL generated:", publicUrl);
      
      // Save to database
      await saveVideoRecord(publicUrl, fileName, file.size);
      
      // Update state
      const newVideo: ReferenceVideo = {
        id: data.id || '',
        skill,
        video_url: publicUrl,
        uploaded_at: new Date().toISOString(),
        file_name: fileName,
        file_size: file.size
      };
      setExistingVideo(newVideo);
      
      onReferenceVideoReady(publicUrl);
      toast.success("Reference video uploaded successfully!");

    } catch (error) {
      console.error("💥 Upload error:", error);
      toast.error(`Failed to upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Checking for existing reference video...</p>
        </CardContent>
      </Card>
    );
  }

  // If reference video exists and was already used, auto-proceed
  if (existingVideo && !loading) {
    return (
      <Card className="mb-4 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 className="h-8 w-8" />
            <div className="flex-1">
              <p className="font-semibold text-lg">✅ Reference Video Ready!</p>
              <p className="text-sm">
                Using existing reference video for {skill} (uploaded {new Date(existingVideo.uploaded_at).toLocaleDateString()})
              </p>
              <p className="text-xs mt-1 text-green-600">
                This will be compared against your performance for more accurate scoring
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setExistingVideo(null)}
            >
              Upload Different Video
            </Button>
            {onSkip && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onSkip}
              >
                Skip Reference
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Reference Video for {skill}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingVideo ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <div className="flex-1">
                <p className="font-medium">Reference video found!</p>
                <p className="text-sm text-green-700">
                  Uploaded {new Date(existingVideo.uploaded_at).toLocaleDateString()}
                  {existingVideo.file_name && ` • ${existingVideo.file_name}`}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => onReferenceVideoReady(existingVideo.video_url)}
                className="flex-1"
              >
                Use Existing Video
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setExistingVideo(null)}
                className="flex-1"
              >
                Upload New Video
              </Button>
              {onSkip && (
                <Button 
                  variant="outline" 
                  onClick={onSkip}
                >
                  Skip Reference
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">📹 Reference Video Requirements</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Show expert {skill.toLowerCase()} technique</li>
                <li>• Clear side view of the performer</li>
                <li>• 3-10 seconds of clean execution</li>
                <li>• Good lighting and stable camera</li>
                <li>• Maximum file size: 100MB</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference-upload" className="text-sm font-medium">
                Select Reference Video
              </Label>
              <Input
                id="reference-upload"
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>

            {uploading && (
              <div className="text-center">
                <div className="animate-pulse text-primary font-medium mb-2">
                  Uploading reference video...
                </div>
                <div className="text-sm text-muted-foreground">
                  This may take a moment depending on file size
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {onSkip && (
                <Button 
                  variant="outline" 
                  onClick={onSkip}
                  className="flex-1"
                >
                  Skip Reference Comparison
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              <strong>Note:</strong> The reference video will be saved and reused for future {skill.toLowerCase()} assessments.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferenceVideoUpload;