import assert from 'node:assert/strict';
import test from 'node:test';
import { checkBaseUrlReachable } from '../dist/baseUrlSanityCheck.js';

test('base URL kosong dilewati', async () => {
  assert.deepEqual(await checkBaseUrlReachable(null), { reachable: true });
});

test('respons HTTP sukses dinyatakan reachable', async () => {
  const result = await checkBaseUrlReachable('https://app.example.test/health', {
    fetchImpl: async () => new Response(null, { status: 204 }),
  });
  assert.deepEqual(result, { reachable: true });
});

test('status HTTP error dilaporkan spesifik', async () => {
  const result = await checkBaseUrlReachable('https://app.example.test', {
    fetchImpl: async () => new Response(null, { status: 503, statusText: 'Service Unavailable' }),
  });
  assert.equal(result.reachable, false);
  assert.match(result.errorMessage, /HTTP 503 Service Unavailable/);
});

test('URL invalid dan error DNS dilaporkan spesifik tanpa generic failure', async () => {
  assert.match((await checkBaseUrlReachable('not-a-url')).errorMessage, /URL tidak valid/);
  const dnsError = new TypeError('fetch failed', { cause: Object.assign(new Error('getaddrinfo'), { code: 'ENOTFOUND' }) });
  const result = await checkBaseUrlReachable('https://missing.example.test', {
    fetchImpl: async () => { throw dnsError; },
  });
  assert.match(result.errorMessage, /DNS/);
});

test('request yang melewati timeout dilaporkan spesifik', async () => {
  const result = await checkBaseUrlReachable('https://slow.example.test', {
    timeoutMs: 5,
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
  });
  assert.match(result.errorMessage, /tidak merespons dalam 5 ms/);
});
