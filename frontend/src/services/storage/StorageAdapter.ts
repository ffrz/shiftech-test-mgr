// Swappable storage backend for issue attachments. Services/UI only ever talk to this
// interface, never to a concrete provider (e.g. supabase.storage) directly — so switching
// to a self-hosted backend later is a matter of adding a new adapter and flipping which one
// `storageAdapter` (in index.ts) resolves to, with no changes to the calling code.
export interface UploadedFile {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string | null;
}

export interface StorageAdapter {
  readonly providerName: string;
  upload(file: File): Promise<UploadedFile>;
  remove(url: string): Promise<void>;
}
