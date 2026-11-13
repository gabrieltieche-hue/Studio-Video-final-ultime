import { WordCue, buildCaptionChunks } from '../engine/math';

export type LookId = 'papier' | 'pop' | 'poster';
export type MusicBedId = 'upbeat' | 'groove' | 'analytical' | 'clockwork' | 'chill';

export interface MusicBedOption {
  id: MusicBedId;
  label: string;
  file: string;
  preferred?: boolean;
}

export const MUSIC_BEDS: MusicBedOption[] = [
  { id: 'upbeat', label: 'Bright Groove (upbeat)', file: 'Bright_Corporate_Groove_8c962467.mp3', preferred: true },
  { id: 'groove', label: 'Seamless Groove', file: 'Seamless_Groove_56a65455.mp3' },
  { id: 'analytical', label: 'Analytical Mood', file: 'Analytical_Mood_f3863ea1.mp3' },
  { id: 'clockwork', label: 'Clockwork Tension', file: 'Clockwork_Tension_33a7e6c6.mp3' },
  { id: 'chill', label: 'Sleek Chill', file: 'Sleek_Chill_Underscore_3bd1f10a.mp3' },
];

export interface LookPreset {
  id: LookId;
  label: string;
  subtitle: string;
  paper: string;
  sheet: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  onAccent: string;
  captionStyle: 'rise' | 'hard' | 'stack';
  fontDisplay: string;
  grain: boolean;
}

export const LOOK_PRESETS: Record<LookId, LookPreset> = {
  papier: {
    id: 'papier',
    label: 'Papier signature',
    subtitle: 'Papier texturé · Bricolage 800 · Accent #258EFF · Phrase unifiée',
    paper: '#F1EEE6',
    sheet: '#FCFBF8',
    ink: '#14161B',
    ink2: '#5C5F68',
    ink3: '#A19F98',
    line: '#E3DED3',
    accent: '#258EFF',
    onAccent: '#FFFFFF',
    captionStyle: 'rise',
    fontDisplay: '"Bricolage Grotesque", sans-serif',
    grain: true,
  },
  pop: {
    id: 'pop',
    label: 'Pop jaune',
    subtitle: 'Blanc cassé · Jaune #FFD21F · Ombre dure · Bloc unifié',
    paper: '#F7F7F5',
    sheet: '#FFFFFF',
    ink: '#111111',
    ink2: '#4A4D55',
    ink3: '#8C8F96',
    line: '#E5E4DF',
    accent: '#FFD21F',
    onAccent: '#111111',
    captionStyle: 'hard',
    fontDisplay: '"Bricolage Grotesque", sans-serif',
    grain: true,
  },
  poster: {
    id: 'poster',
    label: 'Poster orange',
    subtitle: 'Orange #F0640A · Coupes franches · Archivo · Bandeau unifié',
    paper: '#F0640A',
    sheet: '#FFFFFF',
    ink: '#111111',
    ink2: '#2C2623',
    ink3: '#6B5E57',
    line: '#D95400',
    accent: '#14161B',
    onAccent: '#FFFFFF',
    captionStyle: 'stack',
    fontDisplay: '"Archivo", sans-serif',
    grain: false,
  },
};

export interface BeatMeta {
  id: string;
  index: number;
  title: string;
  shortLabel: string;
  from: number;
  to: number;
  seam: 1160 | 1920 | 0;
  viewLabel: 'Split' | 'Papier seul' | 'Plein écran';
  mechanism: string;
  retentionLever: string;
  spokenLine: string;
  sfxNotes: string[];
}

// Calibrated to ElevenLabs Liam French voiceover (63.78s speech + 1.22s hold = 65.0s source, ~54.2s at 1.20x)
export const DEFAULT_PLAYBACK_SPEED = 1.2;
export const SHORT_DURATION = 65.0;

export const LAYOUT_KEYS: Array<[number, number]> = [
  [0.0, 1160],
  [6.6, 1160],
  [17.15, 1160],
  [27.3, 1920],
  [33.45, 1920],
  [42.8, 1160],
  [52.55, 0],
  [59.35, 0],
];

export const ZOOM_KEYS: Array<[number, number, number?]> = [
  [0.0, 1.0],
  [52.55, 1.06, 36],
  [56.2, 1.12, 36],
  [59.35, 1.0, 36],
];

export const BEATS: BeatMeta[] = [
  {
    id: 'hook-shatter',
    index: 1,
    title: 'Hook 2 actes · Verrou parental -15 ans détruit en plein vol',
    shortLabel: 'Hook Shatter',
    from: 0.0,
    to: 6.6,
    seam: 1160,
    viewLabel: 'Split',
    mechanism: 'UI Limite d’âge -15 ans + explosion 3.39s + double preuve 85 % / 63 %',
    retentionLever: 'Rupture en 2 actes dès frame 0 + open loop (« le vrai piège est ailleurs »)',
    spokenLine:
      'On a voulu interdire les réseaux avant 15 ans. Mais la loi vient d’exploser... et le vrai piège est ailleurs.',
    sfxNotes: ['3.39s glass-shatter', '3.39s impact-boom'],
  },
  {
    id: 'australia-bypass',
    index: 2,
    title: 'Australie · 85 % contournent la loi en 4 secondes',
    shortLabel: 'Bilan Australie',
    from: 6.6,
    to: 17.15,
    seam: 1160,
    viewLabel: 'Split',
    mechanism: 'counter 0→85 % barré + UI sélecteur année 2012→2004',
    retentionLever: 'Preuve terrain chiffrée et démonstration visuelle en temps réel',
    spokenLine:
      'En Australie, la loi bloque les moins de 16 ans depuis fin 2025. Résultat : 85 % des ados contournent déjà le filtre en 4 secondes.',
    sfxNotes: ['12.39s thud', '15.65s tap'],
  },
  {
    id: 'france-censure',
    index: 3,
    title: 'France · Votée en juillet, censurée le 14 août 2026',
    shortLabel: 'Censure France',
    from: 17.15,
    to: 27.3,
    seam: 1160,
    viewLabel: 'Split',
    mechanism: 'UI décision Conseil constitutionnel + tampon CENSURÉ + surligneur',
    retentionLever: 'Tension juridique récente + coup de tampon synchronisé sur « censurée »',
    spokenLine:
      'En France, l’interdiction a été votée en juillet 2026. Un mois plus tard, le 14 août, le Conseil constitutionnel l’a censurée.',
    sfxNotes: ['25.97s thud'],
  },
  {
    id: 'algo-gauge',
    index: 4,
    title: 'Re-hook · Le problème est le design, pas l’âge',
    shortLabel: 'Design & Jauge',
    from: 27.3,
    to: 33.45,
    seam: 1920,
    viewLabel: 'Papier seul',
    mechanism: 'zhhh + bascule plein papier + feed infini + jauge 0→92 %',
    retentionLever: 'Re-hook au milieu du Short avec changement complet de géométrie (seam 1920)',
    spokenLine:
      'Car le vrai problème n’est pas l’âge sur une carte d’identité. C’est le design addictif caché dans les feeds.',
    sfxNotes: ['27.30s zhhh', '31.18s pop'],
  },
  {
    id: 'screen-time-bars',
    index: 5,
    title: 'Comparatif · 45 min/j vs 3h42/j (×4,9)',
    shortLabel: 'Barres ×4,9',
    from: 33.45,
    to: 42.8,
    seam: 1920,
    viewLabel: 'Papier seul',
    mechanism: 'barres avec accolade ×4,9 + chrono temps réel 0h45→3h42',
    retentionLever: 'Contraste chiffré lisible avant/après algorithme',
    spokenLine:
      'Avant l’algorithme infini, les ados passaient 45 minutes par jour sur ces apps. Aujourd’hui, c’est 3h42. Presque cinq fois plus.',
    sfxNotes: ['38.60s riser → 39.57s impact-boom'],
  },
  {
    id: 'kids-act-toggles',
    index: 6,
    title: 'Solution · Couper les pièges (KIDS Act UE)',
    shortLabel: 'Toggles KIDS Act',
    from: 42.8,
    to: 52.55,
    seam: 1160,
    viewLabel: 'Split',
    mechanism: '3 interrupteurs système coupés sur les mots exacts (scroll, autoplay, notifs)',
    retentionLever: 'Résolution concrète synchronisée mot pour mot avec la voix off',
    spokenLine:
      'Le futur modèle européen change de stratégie : il ne bloque plus les jeunes à la porte. Il coupe le scroll infini, l’autoplay et les notifications la nuit.',
    sfxNotes: ['48.42s tap', '49.72s tap', '50.76s bell'],
  },
  {
    id: 'bypass-lock',
    index: 7,
    title: 'Verdict · Punch-in sur l’addiction à la source',
    shortLabel: 'Verdict Punch-in',
    from: 52.55,
    to: 59.35,
    seam: 0,
    viewLabel: 'Plein écran',
    mechanism: 'zoom punch-in 1.12x + cartes verre dépoli (glass)',
    retentionLever: 'Passage plein écran pour ancrer la thèse finale sans surcharge',
    spokenLine:
      'Parce qu’une case à cocher se contourne en 10 secondes. Alors qu’un design sobre coupe l’addiction à la source.',
    sfxNotes: ['54.45s thud'],
  },
  {
    id: 'subscribe-cta-loop',
    index: 8,
    title: 'CTA · Abonnement + cloche pour l’actualité tech',
    shortLabel: 'CTA Abonnement',
    from: 59.35,
    to: 65.0,
    seam: 0,
    viewLabel: 'Plein écran',
    mechanism: 'Carte abonné animée : clic S’abonner → Abonné ✓ + cloche activée',
    retentionLever: 'Appel à l’abonnement fluide + boucle directe sur frame 0',
    spokenLine:
      'Abonne-toi pour suivre toute l’actualité tech et ne rien rater des prochains décryptages.',
    sfxNotes: ['60.25s tap', '60.55s pop-back + bell'],
  },
];

// Exact word timings from ElevenLabs Liam (TX3LPaxmHKxFdv7VOQHJ) /with-timestamps alignment (63.785s speech)
export const WORD_CUES: WordCue[] = [
  // Beat 1 (0.00 - 6.60)
  { text: 'On', start: 0.035, end: 0.163 },
  { text: 'a', start: 0.221, end: 0.244 },
  { text: 'voulu', start: 0.302, end: 0.534 },
  { text: 'interdire', start: 0.557, end: 0.964, emph: true },
  { text: 'les', start: 0.987, end: 1.08 },
  { text: 'réseaux', start: 1.115, end: 1.44 },
  { text: 'avant', start: 1.474, end: 1.707 },
  { text: '15 ans.', start: 1.73, end: 2.241, emph: true },
  { text: 'Mais', start: 2.682, end: 2.81 },
  { text: 'la loi', start: 2.833, end: 3.123 },
  { text: 'vient', start: 3.17, end: 3.344 },
  { text: 'd’exploser...', start: 3.39, end: 4.145, emph: true },
  { text: 'et', start: 4.389, end: 4.528 },
  { text: 'le vrai', start: 4.563, end: 4.888 },
  { text: 'piège', start: 4.923, end: 5.236, emph: true },
  { text: 'est ailleurs.', start: 5.283, end: 5.909 },

  // Beat 2 (6.60 - 17.15)
  { text: 'En', start: 6.606, end: 6.803 },
  { text: 'Australie,', start: 6.861, end: 7.442, emph: true },
  { text: 'la loi', start: 7.616, end: 7.93 },
  { text: 'bloque', start: 7.976, end: 8.255 },
  { text: 'les moins', start: 8.278, end: 8.626 },
  { text: 'de 16 ans', start: 8.649, end: 9.195, emph: true },
  { text: 'depuis', start: 9.23, end: 9.497 },
  { text: 'fin 2025.', start: 9.543, end: 10.786 },
  { text: 'Résultat :', start: 11.296, end: 12.063 },
  { text: '85 %', start: 12.388, end: 13.363, emph: true },
  { text: 'des ados', start: 13.398, end: 13.955 },
  { text: 'contournent', start: 14.071, end: 14.559, emph: true },
  { text: 'déjà', start: 14.582, end: 14.884 },
  { text: 'le filtre', start: 14.93, end: 15.406 },
  { text: 'en 4 secondes.', start: 15.43, end: 16.498, emph: true },

  // Beat 3 (17.15 - 27.30)
  { text: 'En', start: 17.194, end: 17.368 },
  { text: 'France,', start: 17.415, end: 17.961, emph: true },
  { text: 'l’interdiction', start: 18.286, end: 18.947 },
  { text: 'a été', start: 18.994, end: 19.238 },
  { text: 'votée', start: 19.284, end: 19.609 },
  { text: 'en juillet', start: 19.632, end: 20.143 },
  { text: '2026.', start: 20.236, end: 21.304, emph: true },
  { text: 'Un mois', start: 21.908, end: 22.21 },
  { text: 'plus tard,', start: 22.233, end: 22.814 },
  { text: 'le 14 août,', start: 22.964, end: 23.986, emph: true },
  { text: 'le Conseil', start: 24.311, end: 24.799 },
  { text: 'constitutionnel', start: 24.845, end: 25.646 },
  { text: 'l’a censurée.', start: 25.774, end: 26.622, emph: true },

  // Beat 4 (27.30 - 33.45)
  { text: 'Car', start: 27.318, end: 27.481 },
  { text: 'le vrai', start: 27.527, end: 27.806 },
  { text: 'problème', start: 27.841, end: 28.201 },
  { text: 'n’est pas', start: 28.224, end: 28.502 },
  { text: 'l’âge', start: 28.526, end: 28.723, emph: true },
  { text: 'sur une', start: 28.746, end: 29.013 },
  { text: 'carte d’identité.', start: 29.036, end: 30.035 },
  { text: 'C’est', start: 30.476, end: 30.639 },
  { text: 'le design', start: 30.662, end: 31.184, emph: true },
  { text: 'addictif', start: 31.266, end: 31.788 },
  { text: 'caché', start: 31.858, end: 32.183 },
  { text: 'dans les feeds.', start: 32.229, end: 33.053 },

  // Beat 5 (33.45 - 42.80)
  { text: 'Avant', start: 33.495, end: 33.773 },
  { text: 'l’algorithme', start: 33.797, end: 34.354 },
  { text: 'infini,', start: 34.4, end: 35.062 },
  { text: 'les ados', start: 35.306, end: 35.735 },
  { text: 'passaient', start: 35.759, end: 36.084 },
  { text: '45 minutes', start: 36.258, end: 36.989, emph: true },
  { text: 'par jour', start: 37.012, end: 37.372 },
  { text: 'sur ces apps.', start: 37.419, end: 38.104 },
  { text: 'Aujourd’hui,', start: 38.487, end: 39.16 },
  { text: 'c’est', start: 39.334, end: 39.52 },
  { text: '3h42.', start: 39.567, end: 40.704, emph: true },
  { text: 'Presque', start: 40.983, end: 41.366 },
  { text: 'cinq fois plus.', start: 41.436, end: 42.399, emph: true },

  // Beat 6 (42.80 - 52.55)
  { text: 'Le futur', start: 42.841, end: 43.328 },
  { text: 'modèle', start: 43.386, end: 43.665 },
  { text: 'européen', start: 43.688, end: 44.199 },
  { text: 'change', start: 44.257, end: 44.501 },
  { text: 'de stratégie :', start: 44.524, end: 45.314 },
  { text: 'il ne bloque', start: 45.755, end: 46.428 },
  { text: 'plus les jeunes', start: 46.452, end: 46.788 },
  { text: 'à la porte.', start: 46.835, end: 47.485 },
  { text: 'Il coupe', start: 47.764, end: 48.286, emph: true },
  { text: 'le scroll infini,', start: 48.309, end: 49.482, emph: true },
  { text: 'l’autoplay', start: 49.726, end: 50.306, emph: true },
  { text: 'et les notifs', start: 50.48, end: 51.456, emph: true },
  { text: 'la nuit.', start: 51.479, end: 51.897 },

  // Beat 7 (52.55 - 59.35)
  { text: 'Parce qu’une', start: 52.593, end: 53.046 },
  { text: 'case à cocher', start: 53.069, end: 53.685 },
  { text: 'se contourne', start: 53.719, end: 54.265 },
  { text: 'en 10 secondes.', start: 54.312, end: 55.159, emph: true },
  { text: 'Alors qu’un', start: 55.763, end: 56.343 },
  { text: 'design sobre', start: 56.413, end: 57.33, emph: true },
  { text: 'coupe l’addiction', start: 57.504, end: 58.247 },
  { text: 'à la source.', start: 58.294, end: 58.967, emph: true },

  // Beat 8 (59.35 - 65.00)
  { text: 'Abonne-toi', start: 59.408, end: 59.954, emph: true },
  { text: 'pour suivre', start: 60.0, end: 60.442 },
  { text: 'toute l’actualité', start: 60.5, end: 61.208 },
  { text: 'tech', start: 61.277, end: 61.533, emph: true },
  { text: 'et ne rien', start: 61.707, end: 62.276 },
  { text: 'rater des', start: 62.334, end: 62.717 },
  { text: 'prochains décryptages.', start: 62.74, end: 63.785, emph: true },
];

// Grouped natural French phrases inside ONE unified caption block (maxWords=4, maxChars=24)
export const CAPTION_CHUNKS = buildCaptionChunks(WORD_CUES, 4, 24);

// Keep captions visible cleanly right below the Subscribe card on Beat 8 (zero overlap)
export const CAPTION_HIDE_SPANS: Array<[number, number]> = [];

export interface SfxEvent {
  at: number;
  kind: 'glass-shatter' | 'impact-boom' | 'zhhh' | 'riser' | 'pop-back' | 'thud' | 'pop' | 'tap' | 'bell';
  gain?: number;
}

export const SFX_EVENTS: SfxEvent[] = [
  { at: 3.39, kind: 'glass-shatter', gain: 0.52 },
  { at: 3.39, kind: 'impact-boom', gain: 0.42 },
  { at: 12.39, kind: 'thud', gain: 0.48 },
  { at: 15.65, kind: 'tap', gain: 0.45 },
  { at: 25.97, kind: 'thud', gain: 0.5 },
  { at: 27.3, kind: 'zhhh', gain: 0.4 },
  { at: 31.18, kind: 'pop', gain: 0.45 },
  { at: 38.6, kind: 'riser', gain: 0.28 },
  { at: 39.57, kind: 'impact-boom', gain: 0.4 },
  { at: 48.42, kind: 'tap', gain: 0.42 },
  { at: 49.72, kind: 'tap', gain: 0.42 },
  { at: 50.76, kind: 'bell', gain: 0.36 },
  { at: 54.45, kind: 'thud', gain: 0.48 },
  { at: 60.25, kind: 'tap', gain: 0.42 },
  { at: 60.55, kind: 'pop-back', gain: 0.4 },
  { at: 60.6, kind: 'bell', gain: 0.38 },
];

export const HOOK_CANDIDATES = [
  {
    formula: 'The flip + Screen-Time Lock',
    score: '10/10',
    weakest: 'Aucun · Mini-histoire 2 actes dès frame 0 + open loop fort',
    spoken:
      'On a voulu interdire les réseaux avant 15 ans. Mais la loi vient d’exploser... et le vrai piège est ailleurs.',
    onScreen: 'LIMITE D’ÂGE -15 ANS → LOI EXPLOSÉE · 85 % / 63 %',
    selected: true,
  },
];

export const EDITORIAL_IMAGES = {
  teenNight: '/src/assets/images/editorial_teen_phone_night_1794587431392.jpg',
  parliament: '/src/assets/images/editorial_parliament_law_1794587431774.jpg',
  studio: '/src/assets/images/editorial_creator_studio_1794587431455.jpg',
};
