import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTemplateSocialCopy,
  computeNextSmartSlots,
  formatPublishedMarkdownLine,
  isJobDue,
  sanitizeHashtags,
  truncateForYouTubeTitle,
} from './socialCopy';
import type { ShortProject } from '../types/studio';

const sampleProject: ShortProject = {
  id: 'proj-test',
  slug: 'interdiction-15-ans',
  title: 'Interdire les réseaux sociaux aux moins de 15 ans : ce que change la loi en 2026',
  topicCategory: 'Politique & Société',
  hookText: 'À partir de septembre, les moins de 15 ans ne pourront plus ouvrir de compte.',
  mode: 'faceless_explainer',
  platform: 'youtube_shorts',
  status: 'ready',
  duration: 48,
  fps: 25,
  resolution: { width: 1080, height: 1920 },
  currentVersion: 'v1',
  versions: [],
  transcript: [
    { id: 'w1', word: 'La', start: 0, end: 0.2, confidence: 0.99 },
    { id: 'w2', word: 'nouvelle', start: 0.2, end: 0.5, confidence: 0.99 },
    { id: 'w3', word: 'loi', start: 0.5, end: 0.8, confidence: 0.99 },
    { id: 'w4', word: 'change', start: 0.8, end: 1.1, confidence: 0.99 },
    { id: 'w5', word: 'tout', start: 1.1, end: 1.4, confidence: 0.99 },
  ],
  motionTrack: [],
  layoutTrack: [],
  sfxTrack: [],
  musicTrack: { trackName: 'groove.mp3', volume: 0.24, ducking: true },
  feedbacks: [],
  motionComponents: {},
  contactSheet: [],
  styleProfile: {
    name: 'Papier',
    fontFamily: 'Bricolage Grotesque',
    accentColor: '#258EFF',
    textColor: '#14161B',
    cardBg: '#FCFBF8',
    captionsPosition: 'bottom',
    visualBeatsTarget: 4,
  },
};

test('truncateForYouTubeTitle enforces <= 60 characters cleanly at word boundary', () => {
  const title = truncateForYouTubeTitle(sampleProject.title, 60);
  assert.ok(title.length <= 60, `Expected <= 60 chars, got ${title.length}`);
  assert.ok(title.endsWith('…'));
});

test('sanitizeHashtags strips banned #fyp/#viral tags, normalizes accents, and limits to 5', () => {
  const tags = sanitizeHashtags(
    ['#fyp', 'Réseau', 'Éducation', 'viral', 'Politique', 'France', 'Jeunesse', 'Extra'],
    'Société'
  );
  assert.ok(!tags.includes('#fyp'));
  assert.ok(!tags.includes('#viral'));
  assert.ok(tags.includes('#reseau'));
  assert.ok(tags.includes('#education'));
  assert.ok(tags.length >= 3 && tags.length <= 5);
});

test('buildTemplateSocialCopy produces YouTube title <= 60 chars, caption and hashtags', () => {
  const pack = buildTemplateSocialCopy(sampleProject);
  assert.ok(pack.youtubeTitle.length <= 60);
  assert.ok(pack.caption.includes('moins de 15 ans'));
  assert.ok(pack.tiktokCaption.length > 10);
  assert.ok(pack.hashtags.length >= 3);
  assert.equal(pack.generatedBy, 'template');
});

test('isJobDue triggers only for scheduled jobs whose timestamp <= nowMs', () => {
  const now = Date.parse('2026-11-14T14:00:00.000Z');
  assert.equal(isJobDue({ status: 'scheduled', scheduledAt: '2026-11-14T13:59:59.000Z' }, now), true);
  assert.equal(isJobDue({ status: 'scheduled', scheduledAt: '2026-11-14T14:00:00.000Z' }, now), true);
  assert.equal(isJobDue({ status: 'scheduled', scheduledAt: '2026-11-14T14:05:00.000Z' }, now), false);
  assert.equal(isJobDue({ status: 'published', scheduledAt: '2026-11-14T13:00:00.000Z' }, now), false);
  assert.equal(isJobDue({ status: 'awaiting_manual', scheduledAt: '2026-11-14T13:00:00.000Z' }, now), false);
});

test('computeNextSmartSlots returns chronological presets starting with now', () => {
  const base = new Date('2026-11-14T10:00:00.000Z');
  const slots = computeNextSmartSlots(base);
  assert.equal(slots[0]?.id, 'now');
  assert.ok(slots.length >= 4);
});

test('formatPublishedMarkdownLine builds audit-friendly history line', () => {
  const line = formatPublishedMarkdownLine({
    publishedAt: '2026-11-14T18:00:00.000Z',
    platform: 'youtube',
    route: 'oauth',
    publishedUrl: 'https://youtube.com/shorts/abc123',
    version: 'v1',
  });
  assert.ok(line.includes('YouTube Shorts (v1)'));
  assert.ok(line.includes('route: oauth'));
  assert.ok(line.includes('https://youtube.com/shorts/abc123'));
});
