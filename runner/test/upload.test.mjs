import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { uploadArtifacts } from '../dist/upload.js';

const config = {
  artifactUpload: true,
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
  runnerToken: 'runner-token',
};

test('mendelegasikan penyimpanan ke adapter dan mengembalikan metadata artifact', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tm-upload-'));
  const localPath = join(dir, 'failure.png');
  writeFileSync(localPath, 'image');
  const requests = [];
  const storage = {
    async store(request) {
      requests.push(request);
      return { id: 'project/job/failure.png', name: request.name, contentType: request.contentType, size: request.content.byteLength, metadata: { bucket: 'automation-artifacts', path: 'project/job/failure.png' } };
    },
    async retrieve() { throw new Error('not used'); },
    async delete() {},
  };

  const result = await uploadArtifacts(config, storage, 'job', [{ type: 'screenshot', name: 'failure.png', localPath }]);
  assert.deepEqual(result, [{ type: 'screenshot', name: 'failure.png', url: 'project/job/failure.png', path: 'project/job/failure.png', bucket: 'automation-artifacts' }]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].contentType, 'image/png');
  assert.deepEqual(requests[0].metadata, { jobId: 'job', artifactType: 'screenshot' });
});

test('tidak memanggil adapter saat tidak ada artifact', async () => {
  const storage = { store() { throw new Error('unexpected'); } };
  assert.deepEqual(await uploadArtifacts(config, storage, 'job', []), []);
});
