import { supabase } from '../../config/supabaseClient';
import type { StorageAdapter, UploadedFile } from './StorageAdapter';

const BUCKET = 'attachments';
// Bucket is private — reads go through a signed URL rather than a public URL.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365; // 1 year; re-signed on demand if needed later

function storagePathFromUrl(url: string): string {
  // Signed URLs look like: <base>/storage/v1/object/sign/attachments/<path>?token=...
  const marker = `/${BUCKET}/`;
  const withoutQuery = url.split('?')[0];
  const index = withoutQuery.indexOf(marker);
  if (index === -1) throw new Error(`URL not recognized as a Supabase Storage attachment: ${url}`);
  return withoutQuery.slice(index + marker.length);
}

export const supabaseStorageAdapter: StorageAdapter = {
  providerName: 'supabase',

  async upload(file: File): Promise<UploadedFile> {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
    });
    if (uploadError) throw uploadError;

    const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
    if (signError) throw signError;

    return {
      url: data.signedUrl,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || null,
    };
  },

  async remove(url: string): Promise<void> {
    const path = storagePathFromUrl(url);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  },
};
