import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ReferenceVideoUploadProps {
  skill: string;
  onReferenceVideoUploaded: (url: string) => void;
  existingVideoUrl?: string;
}

const ReferenceVideoUpload: React.FC<ReferenceVideoUploadProps> = ({
  skill,
  onReferenceVideoUploaded,
  existingVideoUrl
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setUploadProgress(0);

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
      
      onReferenceVideoUploaded(publicUrl);
      toast.success("Reference video uploaded successfully!");

    } catch (error) {
      console.error("💥 Upload error:", error);
      toast.error(`Failed to upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Reference Video for {skill}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {existingVideoUrl && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Reference video already uploaded for {skill}</span>
          </div>
        )}

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

        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> The reference video will be used as the "ideal technique" 
          that student videos are compared against using AI pose analysis.
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferenceVideoUpload;