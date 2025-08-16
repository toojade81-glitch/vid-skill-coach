export interface LocalVideoResult {
  url: string;
  localId: string;
  blob: Blob;
}

export class LocalVideoService {
  private static videos = new Map<string, Blob>();

  static async uploadVideo(file: File): Promise<LocalVideoResult> {
    console.log("🎬 Starting local video upload...");
    
    const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = URL.createObjectURL(file);
    
    // Store the file blob for later access
    this.videos.set(localId, file);
    
    console.log("✅ Local video upload successful:", { localId, url });
    
    return {
      url,
      localId,
      blob: file
    };
  }

  static getVideoUrl(localId: string): string | null {
    const blob = this.videos.get(localId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  }

  static getVideoBlob(localId: string): Blob | null {
    return this.videos.get(localId) || null;
  }

  static deleteVideo(localId: string): void {
    const blob = this.videos.get(localId);
    if (blob) {
      // Revoke object URL to free memory
      const url = URL.createObjectURL(blob);
      URL.revokeObjectURL(url);
      this.videos.delete(localId);
    }
  }

  static async saveToIndexedDB(localId: string): Promise<void> {
    const blob = this.videos.get(localId);
    if (!blob) return;

    try {
      const db = await this.openDB();
      const transaction = db.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      
      await store.put({
        id: localId,
        blob: blob,
        timestamp: Date.now()
      });
      
      console.log("✅ Video saved to IndexedDB:", localId);
    } catch (error) {
      console.error("❌ Failed to save to IndexedDB:", error);
    }
  }

  static async loadFromIndexedDB(localId: string): Promise<Blob | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      
      return new Promise((resolve, reject) => {
        const request = store.get(localId);
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.blob) {
            // Re-add to memory cache
            this.videos.set(localId, result.blob);
            resolve(result.blob);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("❌ Failed to load from IndexedDB:", error);
    }
    return null;
  }

  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('volleyball-videos', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'id' });
        }
      };
    });
  }

  static async cleanupOldVideos(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      
      return new Promise((resolve, reject) => {
        const request = store.openCursor();
        const deletePromises: Promise<void>[] = [];
        const now = Date.now();

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const video = cursor.value;
            if (now - video.timestamp > maxAge) {
              const deleteRequest = cursor.delete();
              deletePromises.push(new Promise((res, rej) => {
                deleteRequest.onsuccess = () => res();
                deleteRequest.onerror = () => rej(deleteRequest.error);
              }));
            }
            cursor.continue();
          } else {
            // No more entries
            Promise.all(deletePromises)
              .then(() => {
                console.log("✅ Cleaned up old videos from IndexedDB");
                resolve();
              })
              .catch(reject);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("❌ Failed to cleanup old videos:", error);
    }
  }
}