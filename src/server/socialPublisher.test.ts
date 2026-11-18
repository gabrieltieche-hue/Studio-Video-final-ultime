import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-pub-test-'));
process.env.STORAGE_DIR = path.join(tempRoot, 'storage');

const socialStorage = await import('./socialStorage');
const tregClient = await import('./tregClient');
const { classifyPublishFailure, reconcilePendingJobsWithAccounts } = await import(
  './socialPublisher'
);

socialStorage.initSocialStorage();

test('classifyPublishFailure separates permanent config errors from transient network errors', () => {
  assert.equal(
    classifyPublishFailure(
      "Aucune Page Facebook liée à un compte Instagram Pro n'a été retournée par Meta."
    ).retryable,
    false
  );
  assert.equal(
    classifyPublishFailure("Instagram Graph API exige une URL HTTPS publique (non AI Studio).").retryable,
    false
  );
  assert.equal(
    classifyPublishFailure('Treg YouTube init HTTP 409: ambiguous multiple tools').retryable,
    true
  );
  assert.equal(
    classifyPublishFailure('ETIMEDOUT upstream reset from tiktok').retryable,
    true
  );
});

test('reconcilePendingJobsWithAccounts upgrades scheduled manual/unconfigured oauth jobs to treg without touching locked jobs', () => {
  tregClient.saveTregSession({
    token: 'treg_test_session',
    activeOrg: 'hermes-77',
    connections: [
      { id: '31587', provider: 'youtube', platform: 'youtube', name: 'studio-youtube-2' },
      { id: '31036', provider: 'tiktok', platform: 'tiktok', name: 'studio-tiktok' },
    ],
    updatedAt: new Date().toISOString(),
  });

  socialStorage.saveRawSocialAccount('youtube', {
    route: 'treg',
    connected: true,
    accessToken: undefined,
  });
  socialStorage.saveRawSocialAccount('tiktok', {
    route: 'treg',
    connected: true,
    accessToken: undefined,
  });

  const now = new Date().toISOString();
  socialStorage.saveScheduledQueue([
    {
      id: 'job-yt-stale',
      projectId: 'p1',
      projectSlug: 's1',
      projectTitle: 'Short 1',
      version: 'v1',
      platform: 'youtube',
      route: 'oauth',
      fallbackToManual: true,
      status: 'scheduled',
      scheduledAt: now,
      timezone: 'Europe/Paris',
      youtubeTitle: 'Short 1',
      youtubeDescription: 'Desc',
      caption: 'Cap',
      tiktokCaption: 'Cap',
      hashtags: ['#tech'],
      coverTimestampSec: 1.0,
      privacy: 'public',
      attempts: 0,
      maxAttempts: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'job-tt-stale',
      projectId: 'p2',
      projectSlug: 's2',
      projectTitle: 'Short 2',
      version: 'v1',
      platform: 'tiktok',
      route: 'manual',
      fallbackToManual: true,
      status: 'scheduled',
      scheduledAt: now,
      timezone: 'Europe/Paris',
      youtubeTitle: 'Short 2',
      youtubeDescription: 'Desc',
      caption: 'Cap',
      tiktokCaption: 'Cap',
      hashtags: ['#tech'],
      coverTimestampSec: 1.0,
      privacy: 'public',
      attempts: 0,
      maxAttempts: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'job-tt-locked',
      projectId: 'p3',
      projectSlug: 's3',
      projectTitle: 'Short 3 Locked',
      version: 'v1',
      platform: 'tiktok',
      route: 'manual',
      routeLocked: true,
      fallbackToManual: true,
      status: 'scheduled',
      scheduledAt: now,
      timezone: 'Europe/Paris',
      youtubeTitle: 'Short 3',
      youtubeDescription: 'Desc',
      caption: 'Cap',
      tiktokCaption: 'Cap',
      hashtags: ['#tech'],
      coverTimestampSec: 1.0,
      privacy: 'public',
      attempts: 0,
      maxAttempts: 2,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const updatedCount = reconcilePendingJobsWithAccounts();
  assert.equal(updatedCount, 2);

  const yt = socialStorage.getScheduledPost('job-yt-stale');
  const tt = socialStorage.getScheduledPost('job-tt-stale');
  const locked = socialStorage.getScheduledPost('job-tt-locked');

  assert.equal(yt?.route, 'treg');
  assert.equal(yt?.intendedRoute, 'treg');
  assert.equal(yt?.maxAttempts, 3);

  assert.equal(tt?.route, 'treg');
  assert.equal(tt?.intendedRoute, 'treg');
  assert.equal(tt?.maxAttempts, 3);

  assert.equal(locked?.route, 'manual');

  tregClient.clearTregSession();
});
