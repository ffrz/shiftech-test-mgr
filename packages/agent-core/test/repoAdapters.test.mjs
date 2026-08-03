import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { GitCloneRepo, LocalPathRepo, RepoAdapterError } from '../dist/index.js';

test('LocalPathRepo validates Git root and provides contained file access', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tm-local-adapter-'));
  await writeFile(join(root, 'source.ts'), 'export const value = 1;');
  const adapter = new LocalPathRepo({ git: async (path, args) => args[1] === '--show-toplevel' ? path : 'abc123' });
  const workspace = await adapter.prepare({ source: root });
  assert.equal(workspace.revision, 'abc123');
  assert.equal(new TextDecoder().decode(await adapter.read(workspace, 'source.ts')), 'export const value = 1;');
  await assert.rejects(adapter.read(workspace, '../outside'), RepoAdapterError);
});

test('GitCloneRepo keeps credentials out of command arguments', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'tm-clone-adapter-'));
  const calls = [];
  const token = ['private', 'credential'].join('-');
  const adapter = new GitCloneRepo({
    cacheDir,
    credentialResolver: async () => token,
    command: async (args, env) => {
      calls.push({ args, env });
      await mkdir(join(cacheDir, 'repo-id', '.git'), { recursive: true });
    },
    git: async () => 'def456',
  });
  const workspace = await adapter.prepare({ source: 'https://example.test/acme/app.git', revision: 'main', credentialsRef: 'repo-id' });
  assert.equal(workspace.revision, 'def456');
  assert.equal(calls[0].args.join(' ').includes(token), false);
  assert.match(calls[0].env.GIT_CONFIG_VALUE_0, /^Authorization: Basic /);
});
