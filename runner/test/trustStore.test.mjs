import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { defaultTrustStorePath, loadTrustedRepositories, trustRepository } from '../dist/trustStore.js';

test('repository dipercaya sekali dan disimpan canonical tanpa duplikasi', () => {
  const root = mkdtempSync(join(tmpdir(), 'tm-trust-store-'));
  const repository = join(root, 'repository');
  const store = join(root, 'config', 'trusted.json');
  mkdirSync(repository);

  assert.equal(trustRepository(repository, store), repository);
  assert.equal(trustRepository(repository, store), repository);
  assert.deepEqual(loadTrustedRepositories(store), [repository]);
  assert.deepEqual(JSON.parse(readFileSync(store, 'utf8')).repositories, [repository]);
  if (process.platform !== 'win32') assert.equal(statSync(store).mode & 0o777, 0o600);
});

test('trust store kosong bersifat fail-closed dan path dapat dioverride', () => {
  const root = mkdtempSync(join(tmpdir(), 'tm-trust-empty-'));
  const store = join(root, 'trusted.json');
  assert.deepEqual(loadTrustedRepositories(store), []);
  assert.equal(defaultTrustStorePath({ TM_TRUST_STORE_PATH: store }), store);
});
