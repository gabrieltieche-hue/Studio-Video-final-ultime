import type { ShortProject } from '../types/studio';
import type {
  PublishRoute,
  ScheduledPostItem,
  SocialCopyPack,
  SocialPlatform,
} from '../types/social';

export const PLATFORM_META: Record<
  SocialPlatform,
  {
    name: string;
    shortName: string;
    aspectNote: string;
    maxSizeMb: number;
    supportsNativeSchedule: boolean;
    color: string;
  }
> = {
  youtube: {
    name: 'YouTube Shorts',
    shortName: 'YouTube',
    aspectNote: '9:16 ≤ 3 min · Master HD',
    maxSizeMb: 256,
    supportsNativeSchedule: true,
    color: '#DC2626',
  },
  instagram: {
    name: 'Instagram Reels',
    shortName: 'Instagram',
    aspectNote: '9:16 H.264 ≤ 30 Mo · Cover JPG',
    maxSizeMb: 30,
    supportsNativeSchedule: false,
    color: '#D97706',
  },
  tiktok: {
    name: 'TikTok',
    shortName: 'TikTok',
    aspectNote: '9:16 H.264 ≤ 64 Mo · Frame cover',
    maxSizeMb: 64,
    supportsNativeSchedule: false,
    color: '#14161B',
  },
};

export function truncateForYouTubeTitle(raw: string, maxLen = 60): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Nouveau Short';
  if (cleaned.length <= maxLen) return cleaned;
  const sliced = cleaned.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const cut = lastSpace > 24 ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.replace(/[.,;:!?-]+$/, '').trim()}…`;
}

export function sanitizeHashtags(rawTags: string[], fallbackCategory?: string): string[] {
  const seen = new Set<string>();
  const banned = new Set(['fyp', 'pourtoi', 'foryou', 'viral', 'shorts']);
  const out: string[] = [];

  for (const tag of rawTags) {
    const norm = tag
      .replace(/^#+/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    if (!norm || norm.length < 2 || banned.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    out.push(`#${norm}`);
    if (out.length >= 5) break;
  }

  if (out.length < 3 && fallbackCategory) {
    const catNorm = fallbackCategory
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    if (catNorm && !seen.has(catNorm)) {
      seen.add(catNorm);
      out.push(`#${catNorm}`);
    }
  }

  const defaults = ['#techfrance', '#analyse', '#actualite'];
  for (const d of defaults) {
    if (out.length >= 3) break;
    const key = d.slice(1);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(d);
    }
  }

  return out.slice(0, 5);
}

export function extractSpokenSummary(project: ShortProject): string {
  const activeWords = (project.transcript || [])
    .filter((w) => !w.isCut)
    .map((w) => w.word)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (activeWords.length > 0) {
    return activeWords.slice(0, 420);
  }
  if (project.hookText && project.hookText.trim().length > 0) {
    return project.hookText.trim();
  }
  return project.title;
}

export function buildTemplateSocialCopy(project: ShortProject): SocialCopyPack {
  const title = truncateForYouTubeTitle(project.title || 'Short Studio', 60);
  const spoken = extractSpokenSummary(project);
  const hook =
    project.hookText && project.hookText.trim()
      ? project.hookText.trim()
      : `${project.title} : ce que les chiffres révèlent vraiment.`;

  const categoryTokens = (project.topicCategory || project.title || '')
    .split(/[\s/,&-]+/)
    .filter((t) => t.length >= 4);

  const hashtags = sanitizeHashtags(
    [...categoryTokens, 'decryptage', 'france'],
    project.topicCategory
  );

  const firstHookLine =
    hook.length > 118 ? `${hook.slice(0, 115).trim()}…` : hook;

  const captionLines = [
    firstHookLine,
    '',
    spoken.length > 180
      ? `${spoken.slice(0, 175).trim()}…`
      : spoken,
    '',
    'Dis-moi en commentaire ton avis et enregistre ce Short pour ne rien rater.',
    '',
    hashtags.join(' '),
  ];

  const caption = captionLines.join('\n');
  const tiktokCaption = [
    firstHookLine,
    'Tu étais au courant ? Dis-le en commentaire.',
    hashtags.slice(0, 4).join(' '),
  ].join('\n\n');

  const youtubeDescription = [
    firstHookLine,
    '',
    spoken,
    '',
    `Durée : ${Math.round(project.duration)} s · Format 9:16`,
    hashtags.join(' '),
  ].join('\n');

  return {
    youtubeTitle: title,
    youtubeDescription,
    caption,
    tiktokCaption,
    hashtags,
    coverTimestampSec: project.isFlagshipReactStage ? 1.4 : 0.8,
    generatedBy: 'template',
  };
}

export function isJobDue(
  job: Pick<ScheduledPostItem, 'status' | 'scheduledAt'>,
  nowMs: number = Date.now()
): boolean {
  if (job.status !== 'scheduled') return false;
  const targetMs = Date.parse(job.scheduledAt);
  if (!Number.isFinite(targetMs)) return false;
  return targetMs <= nowMs;
}

export function computeNextSmartSlots(baseDate: Date = new Date()): Array<{
  id: string;
  label: string;
  iso: string;
}> {
  const now = new Date(baseDate.getTime());
  const slots: Array<{ id: string; label: string; iso: string }> = [
    {
      id: 'now',
      label: 'Maintenant',
      iso: new Date(now.getTime()).toISOString(),
    },
  ];

  const plus1h = new Date(now.getTime() + 60 * 60 * 1000);
  slots.push({
    id: 'plus-1h',
    label: 'Dans 1 h',
    iso: plus1h.toISOString(),
  });

  const today18 = new Date(now);
  today18.setHours(18, 0, 0, 0);
  if (today18.getTime() > now.getTime() + 10 * 60 * 1000) {
    slots.push({
      id: 'today-18',
      label: 'Aujourd’hui 18:00',
      iso: today18.toISOString(),
    });
  }

  const tomorrow12 = new Date(now);
  tomorrow12.setDate(tomorrow12.getDate() + 1);
  tomorrow12.setHours(12, 0, 0, 0);
  slots.push({
    id: 'tomorrow-12',
    label: 'Demain 12:00',
    iso: tomorrow12.toISOString(),
  });

  const tomorrow1830 = new Date(now);
  tomorrow1830.setDate(tomorrow1830.getDate() + 1);
  tomorrow1830.setHours(18, 30, 0, 0);
  slots.push({
    id: 'tomorrow-1830',
    label: 'Demain 18:30',
    iso: tomorrow1830.toISOString(),
  });

  return slots;
}

export function formatScheduleDualTime(iso: string, timeZone = 'Europe/Paris'): {
  localLabel: string;
  utcLabel: string;
  relativeLabel: string;
} {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) {
    return { localLabel: 'Date invalide', utcLabel: '—', relativeLabel: '—' };
  }
  const date = new Date(ts);
  const localLabel = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  const utcLabel = `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

  const diffMs = ts - Date.now();
  const absMin = Math.round(Math.abs(diffMs) / 60_000);
  let relativeLabel: string;
  if (Math.abs(diffMs) < 60_000) {
    relativeLabel = 'Immédiat';
  } else if (diffMs > 0) {
    if (absMin < 60) relativeLabel = `dans ${absMin} min`;
    else if (absMin < 1440) relativeLabel = `dans ${Math.floor(absMin / 60)} h ${absMin % 60} min`;
    else relativeLabel = `dans ${Math.floor(absMin / 1440)} j`;
  } else {
    if (absMin < 60) relativeLabel = `il y a ${absMin} min`;
    else if (absMin < 1440) relativeLabel = `il y a ${Math.floor(absMin / 60)} h`;
    else relativeLabel = `il y a ${Math.floor(absMin / 1440)} j`;
  }

  return { localLabel, utcLabel, relativeLabel };
}

export function formatPublishedMarkdownLine(entry: {
  publishedAt: string;
  platform: SocialPlatform;
  route: PublishRoute;
  publishedUrl?: string;
  version: string;
}): string {
  const datePart = entry.publishedAt.slice(0, 16).replace('T', ' ') + ' UTC';
  const linkPart = entry.publishedUrl ? entry.publishedUrl : '(publié / boîte de réception)';
  return `- ${datePart} | ${PLATFORM_META[entry.platform].name} (${entry.version}) | route: ${entry.route} | ${linkPart}`;
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
