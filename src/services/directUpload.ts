/**
 * VIRALCLIP STUDIO — DIRECT BROWSER OBJECT STORAGE UPLOADER
 * Implements direct S3/R2 presigned PUT uploads from the browser,
 * completely bypassing Vercel serverless execution limits.
 */

export interface DirectUploadResult {
  url: string;
  sourceMediaId: string;
  duration?: number;
}

export async function uploadFileToStorage(
  file: File,
  onProgress?: (progressPct: number) => void
): Promise<DirectUploadResult> {
  // Step 1: Request presigned upload URL from backend
  try {
    const slotRes = await fetch('/api/media/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'video/mp4',
      }),
    });

    if (slotRes.ok) {
      const slotData = await slotRes.json();
      if (slotData.uploadUrl) {
        // Step 2: Direct browser PUT upload directly to S3 / Cloudflare R2 / MinIO
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', slotData.uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

          if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                onProgress(pct);
              }
            };
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Direct storage upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during direct storage upload'));
          xhr.send(file);
        });

        // Step 3: Notify backend upload completion to trigger server-side verification
        const completeRes = await fetch(`/api/media/${slotData.mediaId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectKey: slotData.objectKey,
            filename: file.name,
            mimeType: file.type || 'video/mp4',
          }),
        });

        if (completeRes.ok) {
          return {
            url: slotData.publicUrl || slotData.uploadUrl.split('?')[0],
            sourceMediaId: slotData.mediaId,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[DirectUpload] Direct storage upload failed or unconfigured, attempting multipart fallback:', err);
  }

  // Fallback: Legacy local multipart upload for offline development
  const formData = new FormData();
  formData.append('video', file);
  formData.append('audio', file);

  const fallbackRes = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!fallbackRes.ok) {
    throw new Error(`Upload failed with HTTP ${fallbackRes.status}`);
  }

  const data = await fallbackRes.json();
  return {
    url: data.url || data.fileUrl,
    sourceMediaId: data.sourceMediaId || data.id,
    duration: data.duration,
  };
}
