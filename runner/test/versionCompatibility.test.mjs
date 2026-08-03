import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRunnerCompatibility } from '../dist/versionCompatibility.js';

test('membedakan runner current, outdated, dan unsupported', () => {
  const policy = { server_version: '1.4.0', minimum_supported_runner_version: '1.2.0' };
  assert.equal(evaluateRunnerCompatibility('1.4.0', policy), 'current');
  assert.equal(evaluateRunnerCompatibility('1.2.5', policy), 'outdated');
  assert.equal(evaluateRunnerCompatibility('1.1.9', policy), 'unsupported');
});

test('menolak versi kebijakan server yang tidak valid', () => {
  assert.throws(() => evaluateRunnerCompatibility('1.2.0', {
    server_version: 'latest', minimum_supported_runner_version: '1.2.0',
  }), /versi yang tidak valid/);
});
