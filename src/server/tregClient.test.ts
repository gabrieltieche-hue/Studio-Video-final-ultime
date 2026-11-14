import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-treg-test-'));
process.env.STORAGE_DIR = path.join(tempRoot, 'storage');

const {
  clearTregSession,
  getTregSessionPublic,
  readTregSession,
  saveTregSession,
} = await import('./tregClient');

test('tregClient persists session on disk and redacts token in public view', () => {
  clearTregSession();
  assert.equal(readTregSession(), null);
  assert.equal(getTregSessionPublic().loggedIn, false);

  saveTregSession({
    token: 'treg_secret_token_12345',
    email: 'creator@example.com',
    activeOrg: 'studio-team',
    connections: [
      {
        id: '12',
        provider: 'instagram',
        platform: 'instagram',
        name: 'Mon Instagram Pro',
        status: 'active',
        resourceRef: '178414000111222',
      },
    ],
    updatedAt: new Date().toISOString(),
  });

  const raw = readTregSession();
  assert.equal(raw?.token, 'treg_secret_token_12345');

  const pub = getTregSessionPublic();
  assert.equal(pub.loggedIn, true);
  assert.equal(pub.email, 'creator@example.com');
  assert.equal(pub.activeOrg, 'studio-team');
  assert.deepEqual(pub.connectedPlatforms, ['instagram']);
  assert.equal((pub as unknown as Record<string, unknown>).token, undefined);

  clearTregSession();
  assert.equal(readTregSession(), null);
});
