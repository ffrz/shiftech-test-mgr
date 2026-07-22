import { supabaseStorageAdapter } from './SupabaseStorageAdapter';
import type { StorageAdapter } from './StorageAdapter';

// Single switch point for which provider is active. Adding a future internal-backend
// adapter means creating InternalBackendAdapter.ts and changing this one line — no other
// file in the app should import a concrete adapter directly.
export const storageAdapter: StorageAdapter = supabaseStorageAdapter;

export type { StorageAdapter, UploadedFile } from './StorageAdapter';
