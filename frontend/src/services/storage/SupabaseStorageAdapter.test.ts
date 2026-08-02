import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../config/supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
        remove: vi.fn(),
      }),
    },
  },
}));

const { supabase } = await import('../../config/supabaseClient');
const { supabaseStorageAdapter } = await import('./SupabaseStorageAdapter');

const fromMock = vi.mocked(supabase.storage.from);
const bucketMock = fromMock('attachments');

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.mockReturnValue(bucketMock);
});

describe('supabaseStorageAdapter.upload', () => {
  it('uploads to the attachments bucket with a uuid path and returns a signed URL payload', async () => {
    vi.mocked(bucketMock.upload).mockResolvedValue({ data: { id: 'abc', path: 'x', fullPath: 'x' }, error: null });
    vi.mocked(bucketMock.createSignedUrl).mockResolvedValue({
      data: { signedUrl: 'https://x/sign/attachments/abc-file.png?token=1' },
      error: null,
    });

    const file = new File(['content'], 'file.png', { type: 'image/png' });
    const result = await supabaseStorageAdapter.upload(file);

    expect(bucketMock.upload).toHaveBeenCalledTimes(1);
    const [path, uploadedFile, opts] = vi.mocked(bucketMock.upload).mock.calls[0];
    expect(path).toMatch(/^[0-9a-f-]{36}-file\.png$/);
    expect(uploadedFile).toBe(file);
    expect(opts).toEqual({ contentType: 'image/png' });

    expect(bucketMock.createSignedUrl).toHaveBeenCalledWith(expect.any(String), 31536000);
    expect(result).toEqual({
      url: 'https://x/sign/attachments/abc-file.png?token=1',
      fileName: 'file.png',
      fileSize: file.size,
      contentType: 'image/png',
    });
  });

  it('omits contentType when the file type is empty', async () => {
    vi.mocked(bucketMock.upload).mockResolvedValue({ data: { id: 'abc', path: 'x', fullPath: 'x' }, error: null });
    vi.mocked(bucketMock.createSignedUrl).mockResolvedValue({
      data: { signedUrl: 'https://x/1' },
      error: null,
    });

    const file = new File(['content'], 'file', { type: '' });
    await supabaseStorageAdapter.upload(file);

    expect(vi.mocked(bucketMock.upload).mock.calls[0][2]).toEqual({});
  });

  it('throws the upload error when upload fails', async () => {
    vi.mocked(bucketMock.upload).mockResolvedValue({ data: null, error: new Error('upload failed') } as never);

    await expect(supabaseStorageAdapter.upload(new File(['c'], 'a.png', { type: 'image/png' }))).rejects.toThrow(
      'upload failed',
    );
  });

  it('throws the signing error when signing fails', async () => {
    vi.mocked(bucketMock.upload).mockResolvedValue({ data: { id: 'abc', path: 'x', fullPath: 'x' }, error: null });
    vi.mocked(bucketMock.createSignedUrl).mockResolvedValue({
      data: { signedUrl: '' },
      error: new Error('sign failed'),
    } as never);

    await expect(supabaseStorageAdapter.upload(new File(['c'], 'a.png', { type: 'image/png' }))).rejects.toThrow(
      'sign failed',
    );
  });
});

describe('supabaseStorageAdapter.remove', () => {
  it('extracts the storage path from a signed URL and removes it', async () => {
    vi.mocked(bucketMock.remove).mockResolvedValue({ data: [{ id: 'x', name: 'folder/x.png', metadata: {} }] as never, error: null });

    await supabaseStorageAdapter.remove('https://base/storage/v1/object/sign/attachments/folder/x.png?token=abc');

    expect(bucketMock.remove).toHaveBeenCalledWith(['folder/x.png']);
  });

  it('rejects URLs that do not reference the attachments bucket', async () => {
    await expect(supabaseStorageAdapter.remove('https://base/other/thing.png')).rejects.toThrow(
      'URL not recognized as a Supabase Storage attachment',
    );
    expect(bucketMock.remove).not.toHaveBeenCalled();
  });

  it('throws when the remove call fails', async () => {
    vi.mocked(bucketMock.remove).mockResolvedValue({ data: null, error: new Error('remove failed') } as never);

    await expect(supabaseStorageAdapter.remove('https://base/storage/v1/object/sign/attachments/x.png')).rejects.toThrow(
      'remove failed',
    );
  });
});
