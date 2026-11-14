import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-social-test-'));
process.env.STORAGE_DIR = path.join(tempRoot, 'storage');

const socialStorage = await import('./socialStorage');
socialStorage.initSocialStorage();

test('socialStorage initializes default accounts and persists updates', () => {
  const accounts = socialStorage.getRawSocialAccounts();
  assert.equal(accounts.youtube.platform, 'youtube');
  assert.equal(accounts.instagram.platform, 'instagram');
  assert.equal(accounts.tiktok.platform, 'tiktok');

  socialStorage.saveRawSocialAccount('youtube', {
    connected: true,
    route: 'oauth',
    accountName: 'Chaîne Studio Test',
    accountHandle: '@studiotest',
    accessToken: 'secret-token',
  });

  const reloaded = socialStorage.getRawSocialAccounts();
  assert.equal(reloaded.youtube.connected, true);
  assert.equal(reloaded.youtube.accountName, 'Chaîne Studio Test');

  const pub = socialStorage.toPublicAccountConfig(reloaded.youtube);
  assert.equal((pub as unknown as Record<string, unknown>).accessToken, undefined);
  assert.equal(pub.accountHandle, '@studiotest');
});

test('socialStorage persists, queries, and deletes scheduled queue items and logs', () => {
  const now = new Date().toISOString();
  socialStorage.upsertScheduledPost({
    id: 'job-test-1',
    projectId: 'proj-1',
    projectSlug: 'short-test',
    projectTitle: 'Short Test',
    version: 'v1',
    platform: 'instagram',
    route: 'manual',
    fallbackToManual: true,
    status: 'scheduled',
    scheduledAt: now,
    timezone: 'Europe/Paris',
    youtubeTitle: 'Short Test',
    youtubeDescription: 'Desc',
    caption: 'Caption IG',
    tiktokCaption: 'Caption TT',
    hashtags: ['#tech', '#france', '#analyse'],
    coverTimestampSec: 1.0,
    privacy: 'public',
    attempts: 0,
    maxAttempts: 2,
    createdAt: now,
    updatedAt: now,
  });

  const fetched = socialStorage.getScheduledPost('job-test-1');
  assert.ok(fetched);
  assert.equal(fetched?.platform, 'instagram');
  assert.equal(fetched?.status, 'scheduled');

  socialStorage.appendPublishLog({
    jobId: 'job-test-1',
    projectTitle: 'Short Test',
    platform: 'instagram',
    route: 'manual',
    level: 'info',
    message: 'Job planifié pour test',
  });
  const logs = socialStorage.getPublishLogs(10);
  assert.ok(logs.some((l) => l.jobId === 'job-test-1'));

  assert.equal(socialStorage.deleteScheduledPost('job-test-1'), true);
  assert.equal(socialStorage.getScheduledPost('job-test-1'), null);
});

test('socialStorage issues and resolves expiring public media tokens', () => {
  const token = socialStorage.issuePublicMediaToken('/tmp/pack-dir', 1);
  assert.equal(socialStorage.resolvePublicMediaDir(token), '/tmp/pack-dir');
  assert.equal(socialStorage.resolvePublicMediaDir('invalid-token'), null);
});

test('socialStorage persists channel branding kit and enforces platform char limits', () => {
  const saved = socialStorage.saveChannelBrandingKit({
    brandName: 'Studio Décode FR',
    handle: 'studiodecode.fr',
    tiktokBio: 'X'.repeat(120),
    instagramBio: 'Y'.repeat(200),
  });
  assert.equal(saved.brandName, 'Studio Décode FR');
  assert.equal(saved.handle, '@studiodecode.fr');
  assert.equal(saved.tiktokBio.length, 80);
  assert.equal(saved.instagramBio.length, 150);

  const reloaded = socialStorage.getChannelBrandingKit();
  assert.equal(reloaded.brandName, 'Studio Décode FR');
});

test('buildRailwayEnvBlock includes persistent /app/storage and conditionally embeds Treg token', () => {
  const safeBlock = socialStorage.buildRailwayEnvBlock({
    tregToken: 'treg_secret_123',
    tregOrg: 'hermes-77',
    includeTregToken: false,
    elevenLabsConfigured: true,
    geminiConfigured: true,
  });
  assert.equal(safeBlock.includes('treg_secret_123'), false);
  assert.equal(safeBlock.includes('STORAGE_DIR=/app/storage'), true);

  const fullBlock = socialStorage.buildRailwayEnvBlock({
    tregToken: 'treg_secret_123',
    tregOrg: 'hermes-77',
    includeTregToken: true,
  });
  assert.equal(fullBlock.includes('TREG_TOKEN=treg_secret_123'), true);
  assert.equal(fullBlock.includes('TREG_ORG=hermes-77'), true);
});

