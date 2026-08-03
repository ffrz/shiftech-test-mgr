import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareJobRepository } from '../dist/repositoryWorkspace.js';

function config(cacheDir, projectDir = cacheDir, trustedRepositories = []) {
  return { repositoryCacheDir: cacheDir, projectDir, trustedRepositories };
}

const metadata = (path) => ({ path, branch: 'main', commitSha: 'abc123', dirty: false });

test('clone private repository memakai token hanya melalui environment Git', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'tm-repo-cache-'));
  const token = ['runtime', 'secret'].join('-');
  const calls = [];
  const repository = {
    id: 'repository-1', source_type: 'github_private',
    url_or_path: 'https://github.example/team/app.git', default_branch: 'main',
    subdirectory: null, token,
  };

  const result = await prepareJobRepository(config(cacheDir, cacheDir, [join(cacheDir, repository.id)]), repository, async (args, env) => {
    calls.push({ args, env });
    mkdirSync(join(cacheDir, repository.id, '.git'), { recursive: true });
  }, metadata);

  assert.equal(result.projectDir, join(cacheDir, repository.id));
  assert.deepEqual(calls[0].args, [
    'clone', '--no-tags', '--single-branch', '--branch', 'main', '--', repository.url_or_path, join(cacheDir, repository.id),
  ]);
  assert.equal(calls[0].args.join(' ').includes(token), false);
  assert.equal(JSON.stringify(calls[0].env).includes(token), false);
  assert.match(calls[0].env.GIT_CONFIG_VALUE_0, /^Authorization: Basic /);
});

test('repository cache yang sudah ada di-pull sebelum eksekusi', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'tm-repo-cache-'));
  const repositoryRoot = join(cacheDir, 'repository-2');
  mkdirSync(join(repositoryRoot, '.git'), { recursive: true });
  mkdirSync(join(repositoryRoot, 'e2e'), { recursive: true });
  const calls = [];

  const result = await prepareJobRepository(config(cacheDir, cacheDir, [repositoryRoot]), {
    id: 'repository-2', source_type: 'github_public',
    url_or_path: 'https://github.example/team/app.git', default_branch: 'develop',
    subdirectory: 'e2e', token: null,
  }, async (args) => { calls.push(args); }, metadata);

  assert.equal(result.projectDir, join(repositoryRoot, 'e2e'));
  assert.deepEqual(calls.map((args) => args.slice(2, 4)), [
    ['remote', 'set-url'], ['fetch', '--quiet'], ['checkout', '--quiet'], ['reset', '--quiet'],
  ]);
});

test('menolak URL non-HTTP dan subdirectory yang keluar dari root', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'tm-repo-cache-'));
  await assert.rejects(() => prepareJobRepository(config(cacheDir), {
    id: 'repository-3', source_type: 'git_url', url_or_path: 'ssh://host/repo.git',
    default_branch: null, subdirectory: null, token: null,
  }, async () => {}, metadata), /HTTP\(S\)/);

  const localRoot = mkdtempSync(join(tmpdir(), 'tm-local-repo-'));
  await assert.rejects(() => prepareJobRepository(config(cacheDir, cacheDir, [localRoot]), {
    id: 'repository-4', source_type: 'local_path', url_or_path: localRoot,
    default_branch: null, subdirectory: '../outside', token: null,
  }, async () => {}, metadata), /di luar root/);
});
