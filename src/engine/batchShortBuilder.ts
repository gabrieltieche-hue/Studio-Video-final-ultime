import type {
  BatchBeatSpec,
  DynamicIconKind,
  ParsedCustomTopic,
} from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';

export interface ElevenLabsCharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export function sanitizeScriptText(text: string): string {
  return String(text || '')
    .replace(/\s*\u2014\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Forces punchy, scannable on-screen headlines (max 5 words / 38 chars) so cards never become text walls.
 */
export function condenseVisualHeadline(text: string, maxWords = 5, maxChars = 38): string {
  const clean = sanitizeScriptText(text).replace(/[.:;!?]+$/g, '');
  if (!clean) return 'Décryptage';
  const words = clean.split(/\s+/).filter(Boolean).slice(0, maxWords);
  let joined = words.join(' ');
  if (joined.length > maxChars) {
    joined = joined.slice(0, maxChars).replace(/\s+\S*$/, '').trim();
  }
  return joined || clean.slice(0, maxChars);
}

export function parseBulkTopicsInput(rawText: string, maxItems = 20): ParsedCustomTopic[] {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const seen = new Set<string>();
  const out: ParsedCustomTopic[] = [];

  for (const line of lines) {
    const parts = line.split('|').map((p) => sanitizeScriptText(p));
    let category = 'Tech & Société';
    let theme = '';
    let angle = '';

    if (parts.length >= 2) {
      category = parts[0] || 'Tech & Société';
      theme = parts[1] || '';
      angle = parts[2] || '';
    } else {
      theme = parts[0] || '';
    }

    if (!theme || theme.length < 4) continue;
    const dedupKey = theme.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    out.push({
      category: category.slice(0, 32),
      theme: theme.slice(0, 140),
      angle: angle.slice(0, 220),
    });
    if (out.length >= maxItems) break;
  }

  return out;
}

export function computeProportionalWords(
  text: string,
  durationSec: number
): WhisperWord[] {
  const clean = sanitizeScriptText(text);
  const rawWords = clean.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const safeDuration = Math.max(4, durationSec);
  const weights = rawWords.map((w) => Math.max(2, w.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let cursor = 0.08;
  const usable = Math.max(1, safeDuration - 0.55);

  return rawWords.map((word, idx) => {
    const weight = weights[idx] / totalWeight;
    const span = usable * weight;
    const start = Number(cursor.toFixed(3));
    const end = Number(Math.min(safeDuration, cursor + Math.max(0.12, span * 0.92)).toFixed(3));
    cursor += span;
    return {
      id: `w-${idx + 1}`,
      word,
      start,
      end: Math.max(start + 0.08, end),
      confidence: 0.95,
    };
  });
}

export function alignmentToWords(
  alignment: ElevenLabsCharAlignment | null | undefined,
  fallbackText: string,
  speed = 1.0,
  fallbackDurationSec = 42
): { words: WhisperWord[]; durationSec: number } {
  const safeSpeed = Math.max(0.75, Math.min(1.5, speed || 1.0));

  if (
    alignment &&
    Array.isArray(alignment.characters) &&
    Array.isArray(alignment.character_start_times_seconds) &&
    Array.isArray(alignment.character_end_times_seconds) &&
    alignment.characters.length > 0 &&
    alignment.characters.length === alignment.character_start_times_seconds.length &&
    alignment.characters.length === alignment.character_end_times_seconds.length
  ) {
    const words: WhisperWord[] = [];
    let buf = '';
    let wordStart: number | null = null;
    let wordEnd: number | null = null;

    const flush = () => {
      const cleaned = buf.trim();
      if (!cleaned || wordStart === null || wordEnd === null) {
        buf = '';
        wordStart = null;
        wordEnd = null;
        return;
      }
      const start = Number((wordStart / safeSpeed).toFixed(3));
      const end = Number(Math.max(start + 0.06, wordEnd / safeSpeed).toFixed(3));
      if (/^[:;!?.,…]+$/.test(cleaned) && words.length > 0) {
        const prev = words[words.length - 1];
        prev.word =
          cleaned === '.' || cleaned === ',' || cleaned === '…'
            ? `${prev.word}${cleaned}`
            : `${prev.word} ${cleaned}`;
        prev.end = Math.max(prev.end, end);
      } else {
        words.push({
          id: `w-${words.length + 1}`,
          word: cleaned,
          start,
          end,
          confidence: 0.99,
        });
      }
      buf = '';
      wordStart = null;
      wordEnd = null;
    };

    for (let i = 0; i < alignment.characters.length; i++) {
      const ch = alignment.characters[i];
      const st = Number(alignment.character_start_times_seconds[i]);
      const en = Number(alignment.character_end_times_seconds[i]);

      if (/^\s$/.test(ch)) {
        flush();
        continue;
      }

      if (wordStart === null && Number.isFinite(st)) {
        wordStart = st;
      }
      if (Number.isFinite(en)) {
        wordEnd = en;
      }
      buf += ch;
    }
    flush();

    if (words.length > 0) {
      const lastEnd = words[words.length - 1].end;
      return {
        words,
        durationSec: Number((lastEnd + 0.85).toFixed(2)),
      };
    }
  }

  const proportional = computeProportionalWords(fallbackText, fallbackDurationSec);
  const lastEnd =
    proportional.length > 0 ? proportional[proportional.length - 1].end : fallbackDurationSec;
  return {
    words: proportional,
    durationSec: Number(Math.max(fallbackDurationSec, lastEnd + 0.6).toFixed(2)),
  };
}

export function resolveBeatLayout(spec: BatchBeatSpec, index: number, total: number): 'split' | 'fullscreen' {
  if (spec.layoutHint === 'split' || spec.layoutHint === 'fullscreen') {
    return spec.layoutHint;
  }
  if (spec.visualType === 'gauge' || spec.visualType === 'comparison_bars') {
    return 'fullscreen';
  }
  if (index === 0 || index === total - 1) {
    return 'split';
  }
  return 'split';
}

export function assignBeatTimingsAndTranscript(
  beatsSpec: BatchBeatSpec[],
  words: WhisperWord[],
  totalDurationSec: number
): {
  beats: Array<BatchBeatSpec & { from: number; to: number; layout: 'fullscreen' | 'split' }>;
  motionTrack: ShortProject['motionTrack'];
  sfxTrack: ShortProject['sfxTrack'];
  durationSec: number;
} {
  const safeDuration = Number(
    Math.max(12, totalDurationSec, words.length > 0 ? words[words.length - 1].end + 0.6 : 0).toFixed(2)
  );

  if (beatsSpec.length === 0) {
    return { beats: [], motionTrack: [], sfxTrack: [], durationSec: safeDuration };
  }

  const beatWordCounts = beatsSpec.map((b) =>
    Math.max(1, sanitizeScriptText(b.spokenLine).split(/\s+/).filter(Boolean).length)
  );
  const totalSpecWords = beatWordCounts.reduce((a, b) => a + b, 0);

  let wordCursor = 0;
  let prevEnd = 0;

  const beats = beatsSpec.map((spec, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === beatsSpec.length - 1;
    const from = isFirst ? 0 : prevEnd;

    let to: number;
    if (isLast) {
      to = safeDuration;
    } else if (words.length > 0) {
      const targetWordIdx = Math.min(
        words.length - 1,
        Math.max(
          wordCursor,
          Math.round(((wordCursor + beatWordCounts[idx]) / totalSpecWords) * words.length) - 1
        )
      );
      const nextWordStart =
        targetWordIdx + 1 < words.length ? words[targetWordIdx + 1].start : safeDuration;
      const boundary = (words[targetWordIdx].end + nextWordStart) / 2;
      const minStep = isFirst ? 2.4 : 1.4;
      to = Number(
        Math.max(
          from + minStep,
          Math.min(safeDuration - (beatsSpec.length - 1 - idx) * 1.4, boundary)
        ).toFixed(2)
      );
      wordCursor = targetWordIdx + 1;
    } else {
      const weight = beatWordCounts[idx] / totalSpecWords;
      to = Number(Math.max(from + 1.4, from + safeDuration * weight).toFixed(2));
    }

    prevEnd = to;
    const layout = resolveBeatLayout(spec, idx, beatsSpec.length);

    return {
      ...spec,
      title: condenseVisualHeadline(spec.title, 5, 38),
      spokenLine: sanitizeScriptText(spec.spokenLine),
      from,
      to,
      layout,
    };
  });

  const typeMap: Record<BatchBeatSpec['visualType'], ShortProject['motionTrack'][number]['type']> = {
    hook_shatter: 'typography',
    hook_stat: 'counter',
    counter_flip: 'counter',
    comparison_bars: 'chart',
    timeline_steps: 'card',
    toggles_switch: 'card',
    terminal_flow: 'card',
    key_points: 'card',
    gauge: 'chart',
    cta_card: 'rocket',
  };

  const motionTrack: ShortProject['motionTrack'] = beats.map((b, idx) => ({
    id: `mot-${b.id}`,
    componentId: `comp-${b.id}`,
    name: b.title,
    start: b.from,
    end: b.to,
    type: typeMap[b.visualType] || 'card',
    color: idx === 0 ? '#258EFF' : idx === beats.length - 1 ? '#059669' : '#14161B',
  }));

  const sfxTrack: ShortProject['sfxTrack'] = [];
  beats.forEach((b, idx) => {
    if (idx === 0) {
      const act2At = Number(Math.max(1.4, Math.min(2.6, (b.to - b.from) * 0.48)).toFixed(2));
      sfxTrack.push({
        id: 'sfx-hook-shatter',
        sound: 'glass-shatter',
        start: act2At,
        volume: 0.46,
      });
      sfxTrack.push({
        id: 'sfx-hook-boom',
        sound: 'impact-boom',
        start: act2At,
        volume: 0.4,
      });
      return;
    }

    const sound =
      b.sfxKind ||
      (b.layout === 'fullscreen' && beats[idx - 1]?.layout === 'split'
        ? 'zhhh'
        : idx === beats.length - 1
          ? 'pop-back'
          : undefined);
    if (!sound) return;

    const at =
      idx === beats.length - 1
        ? Number(Math.min(safeDuration - 0.3, b.from + 0.7).toFixed(2))
        : Number(Math.max(0.1, b.from + 0.12).toFixed(2));
    if (at < safeDuration - 0.2) {
      sfxTrack.push({
        id: `sfx-${idx + 1}`,
        sound,
        start: at,
        volume: sound === 'riser' ? 0.26 : 0.36,
      });
    }
    if (idx === beats.length - 1) {
      const bellAt = Number(Math.min(safeDuration - 0.2, at + 0.12).toFixed(2));
      sfxTrack.push({
        id: `sfx-${idx + 1}-bell`,
        sound: 'bell',
        start: bellAt,
        volume: 0.32,
      });
    }
  });

  return {
    beats,
    motionTrack,
    sfxTrack,
    durationSec: safeDuration,
  };
}

export function computeStaggeredScheduleSlots(
  count: number,
  startAtIso: string,
  intervalHours: number
): string[] {
  const safeCount = Math.max(0, Math.min(50, Math.floor(count)));
  const baseMs = Number.isFinite(Date.parse(startAtIso))
    ? Date.parse(startAtIso)
    : Date.now() + 60 * 60 * 1000;
  const stepMs = Math.max(0.25, Number(intervalHours) || 24) * 3600 * 1000;

  return Array.from({ length: safeCount }, (_, i) =>
    new Date(baseMs + i * stepMs).toISOString()
  );
}

function pickTopicIcon(category: string, theme: string): DynamicIconKind {
  const hay = `${category} ${theme}`.toLowerCase();
  if (/(réunion|meeting|calendrier|agenda)/.test(hay)) return 'calendar';
  if (/(ia|ai|agent|code|dev|résumé|llm)/.test(hay)) return 'ai';
  if (/(euro|salaire|smic|loyer|économie|crédit|banque)/.test(hay)) return 'euro';
  if (/(loi|parlement|censure|politique|décret)/.test(hay)) return 'law';
  if (/(temps|heure|minute|productiv)/.test(hay)) return 'clock';
  return 'chart';
}

function pickPrimaryBroll(category: string, theme: string): string {
  const hay = `${category} ${theme}`.toLowerCase();
  if (/(réunion|meeting|visio|résumé)/.test(hay)) return 'ai_meetings';
  if (/(loyer|salaire|smic|banque|crédit|économie|50-30-20)/.test(hay)) return 'economy';
  if (/(loi|parlement|censure|politique|décret)/.test(hay)) return 'parliament';
  if (/(ia|code|dev|logiciel|agent)/.test(hay)) return 'tech_code';
  return 'business';
}

export function buildFallbackBatchScript(input: {
  theme: string;
  category: string;
  angle?: string;
  hookHint?: string;
  sources?: string;
}): {
  hookText: string;
  youtubeTitle: string;
  caption: string;
  hashtags: string[];
  beats: BatchBeatSpec[];
} {
  const cleanTheme = sanitizeScriptText(input.theme);
  const shortTopic = condenseVisualHeadline(cleanTheme, 4, 30);
  const pctMatch = cleanTheme.match(/(\d{1,3}\s*%)/);
  const statVal = pctMatch ? pctMatch[1] : '80 %';
  const iconKind = pickTopicIcon(input.category, cleanTheme);
  const brollMain = pickPrimaryBroll(input.category, cleanTheme);

  const hookLine = sanitizeScriptText(
    input.hookHint ||
      `${shortTopic} vient de basculer, et presque personne n'a vu le chiffre.`
  );

  const beats: BatchBeatSpec[] = [
    {
      id: 'beat-1',
      title: shortTopic,
      shortLabel: 'Hook 2 actes',
      screenLabel: `${input.category.toUpperCase()} · RUPTURE`,
      spokenLine: hookLine,
      visualType: 'hook_shatter',
      layoutHint: 'split',
      brollKey: brollMain,
      brollCaption: 'Signal terrain · 2026',
      iconKind,
      stampWord: 'BASCULE',
      statValue: statVal,
      statLabel: 'Impact mesuré',
      subStats: [
        { value: statVal, label: 'Déjà touchés' },
        { value: '×4', label: 'Plus rapide' },
      ],
      sfxKind: 'glass-shatter',
    },
    {
      id: 'beat-2',
      title: 'Le vrai coût caché',
      shortLabel: 'Compteur',
      screenLabel: 'CONSTAT CHIFFRÉ',
      spokenLine:
        sanitizeScriptText(input.angle || '') ||
        `En 2026, la majorité continue avec les anciennes méthodes et perd un temps fou.`,
      visualType: 'counter_flip',
      layoutHint: 'split',
      brollKey: brollMain === 'economy' ? 'business' : 'tech_code',
      brollCaption: 'Ancien modèle bloqué',
      iconKind,
      statValue: statVal,
      statLabel: 'Ancien réflexe dépassé',
      comparisonLeft: { label: 'Méthode 2022', value: '45 min', ratio: 0.85 },
      comparisonRight: { label: 'Nouvelle norme', value: '2 min', ratio: 0.25 },
      sfxKind: 'thud',
    },
    {
      id: 'beat-3',
      title: 'Comment ça bascule',
      shortLabel: 'Mécanisme',
      screenLabel: 'EN 4 ÉTAPES',
      spokenLine:
        'Le mécanisme tourne en boucle automatique : capture, tri, synthèse et exécution immédiate.',
      visualType: 'timeline_steps',
      layoutHint: 'split',
      brollKey: brollMain,
      brollCaption: 'Exécution automatisée',
      iconKind,
      steps: ['Capture', 'Analyse', 'Synthèse', 'Action'],
      stampWord: 'VALIDÉ',
      sfxKind: 'tap',
    },
    {
      id: 'beat-4',
      title: 'Le vrai choc',
      shortLabel: 'Re-hook Jauge',
      screenLabel: 'EFFET DESIGN',
      spokenLine:
        'Le vrai bouleversement ne vient pas de la théorie, mais de la vitesse d’exécution en direct.',
      visualType: 'gauge',
      layoutHint: 'fullscreen',
      gaugePct: 88,
      statLabel: 'Efficacité mesurée',
      bullets: [
        'Zéro friction manuelle',
        'Décision en direct',
        'Trace écrite fiable',
      ],
      sfxKind: 'zhhh',
    },
    {
      id: 'beat-5',
      title: 'Avant vs 2026',
      shortLabel: 'Comparatif',
      screenLabel: 'ÉCART MESURÉ',
      spokenLine:
        'Avant il fallait des heures d’échanges. Aujourd’hui, le bilan complet sort en deux minutes.',
      visualType: 'comparison_bars',
      layoutHint: 'fullscreen',
      comparisonLeft: { label: 'Modèle classique', value: '14 h/sem', ratio: 0.9 },
      comparisonRight: { label: 'Système optimisé', value: '3 h/sem', ratio: 0.24 },
      multiplierBadge: '÷4,6',
      statValue: '+11 h',
      statLabel: 'Gagnées par semaine',
      sfxKind: 'riser',
    },
    {
      id: 'beat-6',
      title: 'Les 3 leviers actifs',
      shortLabel: 'Toggles',
      screenLabel: 'PLAN D’ACTION',
      spokenLine:
        'Pour en profiter dès cette semaine, il suffit d’activer ces trois réglages simples.',
      visualType: 'toggles_switch',
      layoutHint: 'split',
      brollKey: 'business',
      brollCaption: 'Mise en place · 5 min',
      toggles: [
        { label: 'Réflexes manuels lents', before: 'ACTIF', after: 'COUPÉ', activeAfter: false },
        { label: 'Synthèse chiffrée auto', before: 'OFF', after: 'ON', activeAfter: true },
        { label: 'Suivi décisionnel clair', before: 'OFF', after: 'ON', activeAfter: true },
      ],
      sfxKind: 'tap',
    },
    {
      id: 'beat-7',
      title: 'Résultat immédiat',
      shortLabel: 'Terminal',
      screenLabel: 'PREUVE TERRAIN',
      spokenLine:
        input.sources
          ? `Selon ${sanitizeScriptText(input.sources)}, l’écart entre ceux qui s’adaptent et les autres explose.`
          : 'Ceux qui appliquent cette règle dès maintenant prennent une vraie longueur d’avance.',
      visualType: 'terminal_flow',
      layoutHint: 'split',
      brollKey: 'tech_code',
      brollCaption: 'Déploiement immédiat',
      terminalCmd: '> analyser --impact-2026',
      terminalOut: [
        '✓ Gain hebdo confirmé',
        '✓ Erreurs divisées par 3',
        '✓ Priorités verrouillées',
      ],
      statValue: '+38 %',
      statLabel: 'Gain net observé',
      sfxKind: 'pop',
    },
    {
      id: 'beat-8',
      title: 'Abonne-toi maintenant',
      shortLabel: 'CTA',
      screenLabel: 'PROCHAIN ÉPISODE',
      spokenLine:
        'Abonne-toi pour ne rien rater des prochains décryptages concrets chaque semaine.',
      visualType: 'cta_card',
      layoutHint: 'split',
      brollKey: 'studio',
      brollCaption: 'Nouveau décryptage bientôt',
      statValue: '@alex.decode',
      statLabel: 'Actualité Tech, IA & Décryptages',
      sfxKind: 'pop-back',
    },
  ];

  const catTag = input.category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return {
    hookText: hookLine,
    youtubeTitle: cleanTheme.slice(0, 58),
    caption: `${hookLine}\n\nTu l’avais déjà remarqué ? Dis-le en commentaire.`,
    hashtags: [`#${catTag || 'tech'}`, '#decryptage', '#france', '#shorts'].slice(0, 4),
    beats,
  };
}
