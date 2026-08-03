import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyArtifact, hasCompleteFailureBundle } from '../dist/artifacts.js';

test('mengklasifikasikan seluruh bundle bukti kegagalan', () => {
  assert.equal(classifyArtifact('test-failed-1.png'), 'screenshot');
  assert.equal(classifyArtifact('video.webm'), 'video');
  assert.equal(classifyArtifact('trace.zip'), 'trace');
  assert.equal(classifyArtifact('browser-console.log'), 'log');
  assert.equal(classifyArtifact('network.har'), 'network');
  assert.equal(classifyArtifact('dom-snapshot.html'), 'dom');
});

test('memastikan bundle bukti kegagalan lengkap', () => {
  const artifact = (type) => ({ type, name: `${type}.data`, localPath: `/tmp/${type}.data` });
  const complete = ['screenshot', 'video', 'trace', 'log', 'network', 'dom'].map(artifact);
  assert.equal(hasCompleteFailureBundle(complete), true);
  assert.equal(hasCompleteFailureBundle(complete.filter((item) => item.type !== 'network')), false);
});
