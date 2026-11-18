import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-treg-test-'));
process.env.STORAGE_DIR = path.join(tempRoot, 'storage');

const {
  buildNamedTregCallPath,
  callTregWithNamedFallback,
  clearTregSession,
  getTregSessionPublic,
  isNonPublicBaseUrlForMeta,
  isTregAmbiguous409Error,
  readTregSession,
  resolveInstagramPublishTarget,
  saveTregSession,
  selectPreferredConnection,
  selectPreferredInstagramConnection,
} = await import('./tregClient');
const socialStorage = await import('./socialStorage');
socialStorage.initSocialStorage();

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

test('selectPreferredConnection prefers newest healthy connection for YouTube when multiple exist', () => {
  const connections = [
    {
      id: '31033',
      provider: 'youtube',
      platform: 'youtube' as const,
      name: 'studio-youtube',
      status: 'active',
      health: 'ok',
    },
    {
      id: '31587',
      provider: 'youtube',
      platform: 'youtube' as const,
      name: 'studio-youtube-2',
      status: 'active',
      health: 'ok',
    },
  ];
  const newest = selectPreferredConnection(connections, 'youtube');
  assert.equal(newest?.id, '31587');
  assert.equal(newest?.name, 'studio-youtube-2');

  const pinned = selectPreferredConnection(connections, 'youtube', '31033');
  assert.equal(pinned?.id, '31033');
});

test('buildNamedTregCallPath and isTregAmbiguous409Error handle named routes and 409 conflicts', () => {
  assert.equal(
    buildNamedTregCallPath('studio-youtube-2', '/youtube/v3/channels', '/call/youtube.channels'),
    '/call/studio-youtube-2/youtube/v3/channels'
  );
  assert.equal(
    buildNamedTregCallPath(undefined, 'youtube/v3/channels', '/call/youtube.channels'),
    '/call/youtube.channels'
  );
  assert.equal(
    isTregAmbiguous409Error(
      409,
      '{"detail":"ambiguous: multiple tools match \'youtube.googleapis.com\'"}'
    ),
    true
  );
  assert.equal(isTregAmbiguous409Error(400, 'ambiguous'), false);
});

test('callTregWithNamedFallback tries named connections, recovers from 409, and persists working tool', async () => {
  const origFetch = globalThis.fetch;
  const calledUrls: string[] = [];

  socialStorage.saveRawSocialAccount('youtube', {
    route: 'treg',
    connected: true,
    tregConnectionId: '31033',
    tregConnectionName: 'studio-youtube',
  });

  const session = saveTregSession({
    token: 'treg_mock_token',
    activeOrg: 'hermes-77',
    connections: [
      {
        id: '31033',
        provider: 'youtube',
        platform: 'youtube',
        name: 'studio-youtube',
        status: 'active',
        health: 'ok',
      },
      {
        id: '31587',
        provider: 'youtube',
        platform: 'youtube',
        name: 'studio-youtube-2',
        status: 'active',
        health: 'ok',
      },
    ],
    updatedAt: new Date().toISOString(),
  });

  globalThis.fetch = (async (input: string | URL) => {
    const urlStr = String(input);
    calledUrls.push(urlStr);
    if (urlStr.includes('/call/studio-youtube/')) {
      return new Response(
        JSON.stringify({ detail: "ambiguous: multiple tools match 'youtube.googleapis.com'" }),
        { status: 409, headers: { 'content-type': 'application/json' } }
      );
    }
    if (urlStr.includes('/call/studio-youtube-2/')) {
      return new Response(
        JSON.stringify({ items: [{ id: 'UC_TEST', snippet: { title: 'Alex Décode' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;

  try {
    const res = await callTregWithNamedFallback({
      platform: 'youtube',
      account: socialStorage.getRawSocialAccounts().youtube,
      session,
      upstreamPath: 'youtube/v3/channels',
      fallbackCatalogPath: '/call/youtube.youtube.channels.list',
      method: 'GET',
      query: { part: 'snippet', mine: 'true' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.usedConnection?.id, '31587');
    assert.equal(res.usedConnection?.name, 'studio-youtube-2');
    assert.equal(calledUrls.length, 2);
    assert.equal(calledUrls[0].includes('/call/studio-youtube/youtube/v3/channels'), true);
    assert.equal(calledUrls[1].includes('/call/studio-youtube-2/youtube/v3/channels'), true);

    const updatedAcc = socialStorage.getRawSocialAccounts().youtube;
    assert.equal(updatedAcc.tregConnectionId, '31587');
    assert.equal(updatedAcc.tregConnectionName, 'studio-youtube-2');
  } finally {
    globalThis.fetch = origFetch;
    clearTregSession();
  }
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
