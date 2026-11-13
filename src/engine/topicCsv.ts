export type TopicCategory =
  | 'Actualité'
  | 'IA'
  | 'Business'
  | 'Politique'
  | 'Conseils de vie'
  | 'Tech & Société';

export type TopicStatus = 'Produit' | 'Retenu (Choix IA)' | 'Candidat';

export interface TopicCsvRow {
  id: string;
  date_creation: string;
  demande_session: string;
  categorie: TopicCategory;
  theme: string;
  angle_viral_fr: string;
  hook_propose: string;
  hook_ecran: string;
  score_viral_fr: number;
  score_actualite: number;
  score_save_share: number;
  tension_emotion: string;
  plateformes_cibles: string;
  sources: string;
  statut: TopicStatus;
  slug_short: string;
  raison_selection: string;
}

export interface NewTopicCandidate {
  categorie: TopicCategory;
  theme: string;
  angle_viral_fr: string;
  hook_propose: string;
  hook_ecran: string;
  score_viral_fr: number;
  score_actualite: number;
  score_save_share: number;
  tension_emotion: string;
  plateformes_cibles: string;
  sources: string;
  slug_short: string;
  raison_selection: string;
}

export const TOPIC_CATEGORIES: TopicCategory[] = [
  'Actualité',
  'IA',
  'Business',
  'Politique',
  'Conseils de vie',
  'Tech & Société',
];

export const CSV_HEADERS: Array<keyof TopicCsvRow> = [
  'id',
  'date_creation',
  'demande_session',
  'categorie',
  'theme',
  'angle_viral_fr',
  'hook_propose',
  'hook_ecran',
  'score_viral_fr',
  'score_actualite',
  'score_save_share',
  'tension_emotion',
  'plateformes_cibles',
  'sources',
  'statut',
  'slug_short',
  'raison_selection',
];

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function stringifyCsv(rows: TopicCsvRow[], includeBom = false): string {
  const headerLine = CSV_HEADERS.join(',');
  const bodyLines = rows.map((row) =>
    CSV_HEADERS.map((col) => escapeCsvCell(row[col])).join(',')
  );
  const content = [headerLine, ...bodyLines].join('\n') + '\n';
  return includeBom ? `\uFEFF${content}` : content;
}

function parseCsvRecords(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function clampScore(value: unknown, fallback = 75): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeCategory(cat: string): TopicCategory {
  const trimmed = cat.trim();
  const match = TOPIC_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match;
  if (/ia|ai|intelligence/i.test(trimmed)) return 'IA';
  if (/politiq|loi|gouvern/i.test(trimmed)) return 'Politique';
  if (/busi|écono|econo|argent|emploi|entreprise/i.test(trimmed)) return 'Business';
  if (/conseil|vie|productiv|habitude/i.test(trimmed)) return 'Conseils de vie';
  if (/tech|numériq|réseau|reseau/i.test(trimmed)) return 'Tech & Société';
  return 'Actualité';
}

function normalizeStatus(status: string): TopicStatus {
  const s = status.trim().toLowerCase();
  if (s === 'produit') return 'Produit';
  if (s.startsWith('retenu')) return 'Retenu (Choix IA)';
  return 'Candidat';
}

export function parseCsv(raw: string): TopicCsvRow[] {
  const records = parseCsvRecords(raw);
  if (records.length < 2) return [];

  const header = records[0].map((h) => h.trim());
  const indexOf = (name: keyof TopicCsvRow) => header.indexOf(name);

  return records.slice(1).map((cells, idx) => {
    const get = (name: keyof TopicCsvRow, fallback = '') => {
      const col = indexOf(name);
      return col >= 0 && col < cells.length ? cells[col].trim() : fallback;
    };

    return {
      id: get('id', `SH-${String(idx + 1).padStart(3, '0')}`),
      date_creation: get('date_creation'),
      demande_session: get('demande_session'),
      categorie: normalizeCategory(get('categorie', 'Actualité')),
      theme: get('theme'),
      angle_viral_fr: get('angle_viral_fr'),
      hook_propose: get('hook_propose'),
      hook_ecran: get('hook_ecran'),
      score_viral_fr: clampScore(get('score_viral_fr'), 75),
      score_actualite: clampScore(get('score_actualite'), 75),
      score_save_share: clampScore(get('score_save_share'), 75),
      tension_emotion: get('tension_emotion'),
      plateformes_cibles: get('plateformes_cibles', 'TikTok · Reels · YT Shorts'),
      sources: get('sources'),
      statut: normalizeStatus(get('statut', 'Candidat')),
      slug_short: get('slug_short'),
      raison_selection: get('raison_selection'),
    };
  });
}

export function normalizeSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
}

export function normalizeTopicKey(theme: string): string {
  return theme
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDuplicateTheme(candidateTheme: string, existingThemes: string[]): boolean {
  const candKey = normalizeTopicKey(candidateTheme);
  if (!candKey) return true;
  const candTokens = new Set(candKey.split(' ').filter((w) => w.length > 3));

  for (const existing of existingThemes) {
    const exKey = normalizeTopicKey(existing);
    if (!exKey) continue;
    if (candKey === exKey || candKey.includes(exKey) || exKey.includes(candKey)) {
      return true;
    }
    const exTokens = new Set(exKey.split(' ').filter((w) => w.length > 3));
    if (candTokens.size >= 3 && exTokens.size >= 3) {
      let overlap = 0;
      for (const t of candTokens) {
        if (exTokens.has(t)) overlap++;
      }
      const ratio = overlap / Math.min(candTokens.size, exTokens.size);
      if (ratio >= 0.75) return true;
    }
  }
  return false;
}

export function computeCompositeViralScore(scores: {
  score_viral_fr: number;
  score_actualite: number;
  score_save_share: number;
}): number {
  return Math.round(
    scores.score_viral_fr * 0.45 +
      scores.score_save_share * 0.35 +
      scores.score_actualite * 0.2
  );
}

export function selectWinningCandidate<T extends NewTopicCandidate>(
  candidates: T[],
  existingThemes: string[]
): T | null {
  if (candidates.length === 0) return null;
  const fresh = candidates.filter((c) => !isDuplicateTheme(c.theme, existingThemes));
  const pool = fresh.length > 0 ? fresh : candidates;

  const sorted = [...pool].sort(
    (a, b) => computeCompositeViralScore(b) - computeCompositeViralScore(a)
  );
  return sorted[0] ?? null;
}

export function nextShortId(existingRows: TopicCsvRow[], offset = 0): string {
  let maxNum = 0;
  for (const row of existingRows) {
    const m = /^SH-(\d+)$/i.exec(row.id.trim());
    if (m) {
      maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
  }
  return `SH-${String(maxNum + 1 + offset).padStart(3, '0')}`;
}

export function appendSessionToCsv(
  existingRows: TopicCsvRow[],
  sessionId: string,
  dateIso: string,
  candidates: NewTopicCandidate[]
): { rows: TopicCsvRow[]; winner: TopicCsvRow; added: TopicCsvRow[] } {
  const existingThemes = existingRows.map((r) => r.theme);
  const freshCandidates = candidates.filter(
    (c) => !isDuplicateTheme(c.theme, existingThemes)
  );
  const pool = freshCandidates.length > 0 ? freshCandidates : candidates;
  const winnerCandidate = selectWinningCandidate(pool, existingThemes);
  if (!winnerCandidate) {
    throw new Error('Aucun sujet candidat valide retourné par la recherche.');
  }

  // Sort candidates by composite score descending so winner is first in the session
  const ordered = [...pool].sort(
    (a, b) => computeCompositeViralScore(b) - computeCompositeViralScore(a)
  );

  const added: TopicCsvRow[] = ordered.map((cand, idx) => {
    const isWinner = cand === winnerCandidate;
    return {
      id: nextShortId(existingRows, idx),
      date_creation: dateIso,
      demande_session: sessionId,
      categorie: normalizeCategory(cand.categorie),
      theme: cand.theme.trim(),
      angle_viral_fr: cand.angle_viral_fr.trim(),
      hook_propose: cand.hook_propose.trim(),
      hook_ecran: cand.hook_ecran.trim(),
      score_viral_fr: clampScore(cand.score_viral_fr, 80),
      score_actualite: clampScore(cand.score_actualite, 80),
      score_save_share: clampScore(cand.score_save_share, 80),
      tension_emotion: cand.tension_emotion.trim(),
      plateformes_cibles: cand.plateformes_cibles.trim() || 'TikTok · Reels · YT Shorts',
      sources: cand.sources.trim(),
      statut: isWinner ? 'Retenu (Choix IA)' : 'Candidat',
      slug_short: normalizeSlug(cand.slug_short || cand.theme),
      raison_selection: cand.raison_selection.trim(),
    };
  });

  const winner = added.find((r) => r.statut === 'Retenu (Choix IA)') ?? added[0];
  return {
    rows: [...existingRows, ...added],
    winner,
    added,
  };
}

export function filterTopicRows(
  rows: TopicCsvRow[],
  opts: { category?: string; status?: string; search?: string }
): TopicCsvRow[] {
  const q = (opts.search || '').trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.category && opts.category !== 'Toutes' && row.categorie !== opts.category) {
      return false;
    }
    if (opts.status && opts.status !== 'Tous' && row.statut !== opts.status) {
      return false;
    }
    if (q) {
      const hay = `${row.id} ${row.theme} ${row.angle_viral_fr} ${row.hook_propose} ${row.categorie} ${row.slug_short}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
