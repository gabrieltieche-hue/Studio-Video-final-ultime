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
