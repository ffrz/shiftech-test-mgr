import assert from 'node:assert/strict';
import test from 'node:test';

import { RunnerTokenAuth, RunnerTokenAuthError } from '../dist/index.js';

test('RunnerTokenAuth prepares RPC proof without exposing the token in identity', async () => {
  const auth = new RunnerTokenAuth({
    token: 'private-token',
    subject: 'runner-1',
    displayName: 'Local Runner',
  });

  assert.deepEqual(await auth.getAuthContext(), {
    headers: {},
    body: { p_token: 'private-token' },
  });
  assert.deepEqual(await auth.getIdentity(), {
    subject: 'runner-1',
    displayName: 'Local Runner',
  });
  assert.equal(JSON.stringify(await auth.getIdentity()).includes('private-token'), false);
});

test('RunnerTokenAuth removes its credential when invalidated', async () => {
  const auth = new RunnerTokenAuth({ token: 'private-token', subject: 'runner-1' });
  await auth.invalidate();

  await assert.rejects(auth.getAuthContext(), RunnerTokenAuthError);
});
