import { supabase } from '@/integrations/supabase/client';

export interface VideoUploadResult {
  url: string;
  path: string;
  uploadId: string;
}

export class VideoUploadService {
  static async uploadVideo(file: File, userId?: string): Promise<VideoUploadResult> {
    console.log("🎬 Starting video upload to Supabase Storage...");
    
    // For now, we'll use a temporary user folder since auth might not be implemented
    const userFolder = userId || 'temp-user';
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const storagePath = `${userFolder}/${fileName}`;

    try {
      console.log("📤 Uploading to storage path:", storagePath);
      
      // Upload to pe-videos bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pe-videos')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log("✅ Upload successful:", uploadData);

      // Get public URL (may not be accessible if bucket is not public)
      const { data: urlData } = supabase.storage
        .from('pe-videos')
        .getPublicUrl(storagePath);

      // Also create a signed URL for reliable playback when bucket is private
      const { data: signedData, error: signedError } = await supabase.storage
        .from('pe-videos')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

      if (signedError) {
        console.warn("⚠️ Failed to create signed URL:", signedError);
      }

      const playableUrl = signedData?.signedUrl || urlData.publicUrl;

      if (!playableUrl) {
        throw new Error("Failed to get a playable URL");
      }

      console.log("🔗 Playback URL generated:", playableUrl);

      // Save upload metadata to database
      const { data: dbData, error: dbError } = await supabase
        .from('video_uploads')
        .insert({
          user_id: userId || null,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (dbError) {
        console.warn("⚠️ Database insert failed (continuing with upload):", dbError);
      } else {
        console.log("📊 Database record created:", dbData);
      }

      return {
        url: playableUrl,
        path: storagePath,
        uploadId: dbData?.id || ''
      };

    } catch (error) {
      console.error("❌ Video upload failed:", error);
      throw error;
    }
  }

  static async getVideoUrl(path: string): Promise<string> {
    // Prefer a signed URL for private buckets
    const { data: signedData, error: signedError } = await supabase.storage
      .from('pe-videos')
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

    if (!signedError && signedData?.signedUrl) {
      return signedData.signedUrl;
    }

    const { data } = supabase.storage
      .from('pe-videos')
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  static async deleteVideo(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('pe-videos')
      .remove([path]);

    if (error) {
      console.error("❌ Delete error:", error);
      throw error;
    }
  }
}