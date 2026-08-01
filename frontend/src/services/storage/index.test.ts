import { describe, expect, it, vi } from 'vitest';

vi.mock('./SupabaseStorageAdapter', () => ({
  supabaseStorageAdapter: { providerName: 'supabase' },
}));

const { storageAdapter } = await import('./index');

describe('storage index', () => {
  it('exports the active storage adapter from the single switch point', () => {
    expect(storageAdapter.providerName).toBe('supabase');
  });
});
