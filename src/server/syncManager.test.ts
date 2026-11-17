import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempSyncRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-sync-test-'));
process.env.STORAGE_DIR = path.join(tempSyncRoot, 'storage');
process.env.GITHUB_REPO = '';
process.env.GITHUB_TOKEN = '';
process.env.RAILWAY_STUDIO_URL = '';
process.env.SYNC_SECRET = '';

const storage = await import('./storageManager');
const sync = await import('./syncManager');
storage.initStorage();

test('normalizeGitHubRepo accepts owner/repo and full HTTPS GitHub URLs', () => {
  assert.equal(
    sync.normalizeGitHubRepo('https://github.com/gabrieltieche-hue/Studio-Video-final-ultime'),
    'gabrieltieche-hue/Studio-Video-final-ultime'
  );
  assert.equal(
    sync.normalizeGitHubRepo('https://github.com/gabrieltieche-hue/Studio-Video-final-ultime.git'),
    'gabrieltieche-hue/Studio-Video-final-ultime'
  );
  assert.equal(
    sync.normalizeGitHubRepo('gabrieltieche-hue/Studio-Video-final-ultime'),
    'gabrieltieche-hue/Studio-Video-final-ultime'
  );
  assert.equal(sync.normalizeGitHubRepo('not valid repo'), '');
});

test('normalizeRailwayUrl validates HTTP/HTTPS origins and strips trailing slash', () => {
  assert.equal(
    sync.normalizeRailwayUrl('https://my-studio.up.railway.app///'),
    'https://my-studio.up.railway.app'
  );
  assert.equal(sync.normalizeRailwayUrl('javascript:alert(1)'), '');
});

test('saveSyncConfig and getPublicSyncStatus store config cleanly and redact raw tokens', () => {
  sync.saveSyncConfig({
    githubRepo: 'https://github.com/gabrieltieche-hue/Studio-Video-final-ultime',
    githubToken: 'github_pat_EXAMPLE_SECRET_TOKEN_9999',
    railwayUrl: 'https://studio-railway.up.railway.app/',
    syncSecret: 'shared-secret-123',
    autoSync: true,
  });

  const pub = sync.getPublicSyncStatus();
  assert.equal(pub.githubRepo, 'gabrieltieche-hue/Studio-Video-final-ultime');
  assert.equal(pub.githubConnected, true);
  assert.equal(pub.railwayUrl, 'https://studio-railway.up.railway.app');
  assert.equal(pub.railwayConnected, true);
  assert.equal(pub.syncSecretConfigured, true);
  assert.ok(pub.githubTokenMasked);
  assert.ok(!pub.githubTokenMasked?.includes('EXAMPLE_SECRET_TOKEN'));
  assert.ok(!JSON.stringify(pub).includes('github_pat_EXAMPLE_SECRET_TOKEN_9999'));
  assert.ok(!JSON.stringify(pub).includes('shared-secret-123'));

  assert.equal(sync.verifyIncomingSyncSecret('shared-secret-123'), true);
  assert.equal(sync.verifyIncomingSyncSecret('wrong'), false);
});

test('receiveImportedFile and resolveExportFile sanitize paths and isolate allowed extensions', () => {
  const payload = Buffer.alloc(2048, 7);
  const res = sync.receiveImportedFile({
    projectId: '../proj-safe',
    kind: 'mp4',
    fileName: '../../evil/demo_v1.mp4',
    data: payload,
  });
  assert.ok(res.savedPath.startsWith(storage.RENDERS_DIR));
  assert.equal(path.basename(res.savedPath), 'demo_v1.mp4');

  const resolved = sync.resolveExportFile('proj-safe', 'mp4', 'demo_v1.mp4');
  assert.equal(resolved, res.savedPath);

  assert.throws(() =>
    sync.receiveImportedFile({
      projectId: 'proj-safe',
      kind: 'mp4',
      fileName: 'payload.exe',
      data: payload,
    })
  );
});

test('probeRailwayStatus detects stale Railway deploy without /api/sync and pushProjectToRailway translates 404 HTML cleanly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/api/health')) {
      return new Response(JSON.stringify({ ok: true, version: 'ig-fbpage-v2', uptimeSec: 9000 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/sync/status')) {
      return new Response('<!DOCTYPE html><html><body>Cannot GET /api/sync/status</body></html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (url.endsWith('/api/sync/import-project')) {
      return new Response('<!DOCTYPE html><html><body>Cannot POST /api/sync/import-project</body></html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      });
    }
    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;

  try {
    const probe = await sync.probeRailwayStatus('https://stale-demo.up.railway.app');
    assert.equal(probe.reachable, true);
    assert.equal(probe.syncReady, false);
    assert.equal(probe.remoteVersion, 'ig-fbpage-v2');
    assert.ok(probe.error?.includes('ig-fbpage-v2'));
    assert.ok(probe.hint?.includes('Redeploy'));

    storage.saveProject({
      id: 'proj-sync-stale-test',
      slug: 'sync-stale-test',
      title: 'Test Synchro',
      mode: 'faceless_explainer',
      platform: 'youtube_shorts',
      status: 'ready',
      duration: 12,
      fps: 30,
      resolution: { width: 1080, height: 1920 },
      currentVersion: 'v1',
      versions: [],
      transcript: [],
      motionTrack: [],
      layoutTrack: [],
      sfxTrack: [],
      musicTrack: { trackName: 'upbeat', volume: 0.24, ducking: true },
      feedbacks: [],
      motionComponents: {},
      contactSheet: [],
      styleProfile: {
        name: 'Papier',
        fontFamily: 'Bricolage Grotesque',
        accentColor: '#258EFF',
        textColor: '#14161B',
        cardBg: '#FFFFFF',
        captionsPosition: 'center_divider',
        visualBeatsTarget: 8,
      },
    });

    await assert.rejects(
      () => sync.pushProjectToRailway('proj-sync-stale-test', 'https://stale-demo.up.railway.app'),
      (err: Error) => {
        assert.ok(err.message.includes('ig-fbpage-v2'));
        assert.ok(err.message.includes('Redeploy'));
        assert.ok(!err.message.includes('<!DOCTYPE'));
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
