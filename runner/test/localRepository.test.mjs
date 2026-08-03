import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectLocalRepository } from '../dist/localRepository.js';

function makeRepository() {
  const path = mkdtempSync(join(tmpdir(), 'tm-local-repo-'));
  mkdirSync(join(path, '.git'));
  return path;
}

test('membaca hanya path dan metadata git tanpa isi file', () => {
  const path = makeRepository();
  const outputs = new Map([
    ['rev-parse --show-toplevel', path],
    ['rev-parse HEAD', '0123456789abcdef0123456789abcdef01234567'],
    ['branch --show-current', 'main'],
    ['status --porcelain', ' M private-source.ts'],
  ]);
  const commands = [];
  const metadata = inspectLocalRepository(path, (_path, args) => {
    commands.push(args.join(' '));
    return outputs.get(args.join(' ')) ?? '';
  });

  assert.deepEqual(metadata, {
    path,
    branch: 'main',
    commitSha: '0123456789abcdef0123456789abcdef01234567',
    dirty: true,
  });
  assert.deepEqual(commands, [
    'rev-parse --show-toplevel',
    'rev-parse HEAD',
    'branch --show-current',
    'status --porcelain',
  ]);
  assert.equal(Object.hasOwn(metadata, 'files'), false);
  assert.equal(Object.hasOwn(metadata, 'content'), false);
});

test('menolak path relatif, path hilang, dan direktori non-git', () => {
  assert.throws(() => inspectLocalRepository('relative/path'), /path absolut/);
  assert.throws(() => inspectLocalRepository(join(tmpdir(), 'tm-does-not-exist')), /tidak ditemukan/);
  const directory = mkdtempSync(join(tmpdir(), 'tm-not-git-'));
  assert.throws(() => inspectLocalRepository(directory), /bukan git repository/);
});
