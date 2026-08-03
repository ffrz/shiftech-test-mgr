import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseStorageAdapter } from '../dist/supabaseStorageAdapter.js';

test('menandatangani dan meng-upload artifact melalui Supabase Storage', async () => {
  const calls = [];
  const adapter = new SupabaseStorageAdapter({
    supabaseUrl: 'https://example.supabase.co/',
    supabaseAnonKey: 'anon-key',
    runnerToken: 'runner-token',
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      if (calls.length === 1) {
        return new Response(JSON.stringify({
          bucket: 'automation-artifacts',
          uploads: [{ name: 'failure.png', path: 'project/job/failure.png', uploadUrl: 'https://upload.test/signed' }],
        }), { status: 200 });
      }
      return new Response('', { status: 200 });
    },
  });

  const descriptor = await adapter.store({
    name: 'failure.png',
    contentType: 'image/png',
    content: new Uint8Array([1, 2, 3]),
    metadata: { jobId: 'job' },
  });

  assert.deepEqual(descriptor, {
    id: 'project/job/failure.png',
    name: 'failure.png',
    contentType: 'image/png',
    size: 3,
    metadata: { bucket: 'automation-artifacts', path: 'project/job/failure.png' },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://example.supabase.co/functions/v1/automation-artifacts');
  assert.equal(calls[1].url, 'https://upload.test/signed');
});

test('menolak respons signing yang tidak memuat artifact yang diminta', async () => {
  const adapter = new SupabaseStorageAdapter({
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
    runnerToken: 'runner-token',
    fetch: async () => new Response(JSON.stringify({ bucket: 'automation-artifacts', uploads: [] }), { status: 200 }),
  });

  await assert.rejects(
    adapter.store({ name: 'trace.zip', contentType: 'application/zip', content: new Uint8Array(), metadata: { jobId: 'job' } }),
    /signed URL/,
  );
});
