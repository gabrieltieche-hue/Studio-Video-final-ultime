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
  isNonPublicBaseUrlForMeta,
  readTregSession,
  resolveInstagramPublishTarget,
  saveTregSession,
  selectPreferredInstagramConnection,
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
        authorizationMethod: 'facebook-page',
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

test('selectPreferredInstagramConnection prefers healthy facebook-page with resourceRef over broken ones', () => {
  const chosen = selectPreferredInstagramConnection([
    {
      id: '31035',
      provider: 'instagram',
      platform: 'instagram',
      name: 'studio-instagram',
      authorizationMethod: 'instagram-login',
      resourceRef: '17841466748295890',
    },
    {
      id: '31508',
      provider: 'instagram',
      platform: 'instagram',
      name: 'studio-instagram-page',
      authorizationMethod: 'facebook-page',
      setupRequired: true,
      resourceRef: '',
    },
    {
      id: '31512',
      provider: 'instagram',
      platform: 'instagram',
      name: 'studio-instagram-page-3',
      authorizationMethod: 'facebook-page',
      setupRequired: false,
      resourceRef: '178414999888777',
    },
  ]);
  assert.equal(chosen?.id, '31512');
  assert.equal(chosen?.name, 'studio-instagram-page-3');
  assert.equal(chosen?.authorizationMethod, 'facebook-page');
});

test('resolveInstagramPublishTarget refuses stale instagram-login igUserId when facebook-page has no page', () => {
  const res = resolveInstagramPublishTarget({
    conn: {
      id: '31508',
      provider: 'instagram',
      platform: 'instagram',
      name: 'studio-instagram-page',
      authorizationMethod: 'facebook-page',
      setupRequired: true,
      resourceRef: '',
    },
    account: {
      igUserId: '17841466748295890',
      tregResourceRef: '17841466748295890',
      tregAuthorizationMethod: 'instagram-login',
    },
  });
  assert.equal(res.missingFacebookPage, true);
  assert.equal(res.igUserId, '');
});

test('isNonPublicBaseUrlForMeta detects AI Studio preview and localhost URLs', () => {
  assert.equal(
    isNonPublicBaseUrlForMeta('https://ais-dev-abc123.europe-west2.run.app'),
    true
  );
  assert.equal(
    isNonPublicBaseUrlForMeta('https://ais-pre-abc123.europe-west2.run.app'),
    true
  );
  assert.equal(isNonPublicBaseUrlForMeta('http://localhost:3000'), true);
  assert.equal(
    isNonPublicBaseUrlForMeta('https://studio-video-final-ultime.up.railway.app'),
    false
  );
});
