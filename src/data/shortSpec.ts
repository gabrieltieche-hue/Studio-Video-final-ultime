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

// Configurable placeholder creator profile until user supplies their final channel handle
export const CREATOR_PROFILE = {
  handle: '@alex.decode',
  initial: 'A',
  tagline: 'Actualité Tech, IA & Décryptages',
  ctaHeader: 'NOUVEL ÉPISODE CHAQUE SEMAINE',
};

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

// Calibrated to natural high-retention 1.10x pace (~51.8s effective from 57.0s source)
export const DEFAULT_PLAYBACK_SPEED = 1.10;
export const SHORT_DURATION = 57.0;

export const LAYOUT_KEYS: Array<[number, number]> = [
  [0.0, 1160],
  [6.24, 1160],
  [16.2, 1160],
  [23.38, 1920],
  [27.98, 1920],
  [37.5, 1160],
  [45.85, 0],
  [52.5, 0],
];

export const ZOOM_KEYS: Array<[number, number, number?]> = [
  [0.0, 1.0],
  [45.85, 1.06, 36],
  [49.85, 1.12, 36],
  [52.5, 1.0, 36],
];

export const BEATS: BeatMeta[] = [
  {
    id: 'hook-shatter',
    index: 1,
    title: 'Hook 2 actes · Verrou parental -15 ans détruit en plein vol',
    shortLabel: 'Hook Shatter',
    from: 0.0,
    to: 6.24,
    seam: 1160,
    viewLabel: 'Split',
    mechanism: 'UI Limite d’âge -15 ans + explosion 3.44s + double preuve 85 % / 63 % + barre décret',
    retentionLever: 'Rupture en 2 actes dès frame 0 + open loop (« le vrai piège est ailleurs »)',
    spokenLine:
      'On a voulu interdire les réseaux avant 15 ans. Mais la loi vient d’exploser, et le vrai piège est ailleurs.',
    sfxNotes: ['3.44s glass-shatter', '3.44s impact-boom'],
  },
  {
    id: 'australia-bypass',
    index: 2,
    title: 'Australie · 85 % contournent la loi en 4 secondes',
    shortLabel: 'Bilan Australie',
    from: 6.24,
    to: 16.2,
    seam: 1160,
    viewLabel: 'Split',
    mechanism: 'Counter 0→85 % barré + connecteur SVG + UI sélecteur année 2012→2004',
    retentionLever: 'Preuve terrain chiffrée et démonstration visuelle en temps réel',
    spokenLine:
      'En Australie, la loi bloque les moins de 16 ans depuis fin 2025. Résultat : 85 pour cent des ados contournent déjà le filtre en 4 secondes.',
    sfxNotes: ['12.13s thud', '15.34s tap'],
  },
  {
    id: 'france-censure',
    index: 3,
    title: 'France · Votée en juillet 2026, censurée un mois plus tard',
    shortLabel: 'Censure France',
    from: 16.2,
    to: 23.38,
    seam: 1160,
    viewLabel: 'Split',
    mechanism: 'Timeline parlementaire animée + décision Conseil constitutionnel + tampon CENSURÉ',
    retentionLever: 'Tension juridique récente + coup de tampon synchronisé sur « censurée »',
    spokenLine:
      'En France, l’interdiction a été votée en juillet 2026. Un mois plus tard, le Conseil constitutionnel l’a censurée.',
    sfxNotes: ['22.54s thud'],
  },
  {
    id: 'algo-gauge',
    index: 4,
    title: 'Re-hook · Le problème est le design, pas l’âge',
    shortLabel: 'Design & Jauge',
    from: 23.38,
    to: 27.98,
    seam: 1920,
    viewLabel: 'Papier seul',
    mechanism: 'zhhh + bascule plein papier + feed infini + jauge 0→92 % + 3 leviers d’addiction',
    retentionLever: 'Re-hook au milieu du Short avec changement complet de géométrie (seam 1920)',
    spokenLine:
      'Car le vrai problème n’est pas l’âge. C’est le design addictif caché dans les feeds.',
    sfxNotes: ['23.38s zhhh', '25.88s pop'],
  },
  {
    id: 'screen-time-bars',
    index: 5,
    title: 'Comparatif · 45 min/j vs 3h42/j (×4,9)',
    shortLabel: 'Barres ×4,9',
    from: 27.98,
    to: 37.5,
    seam: 1920,
    viewLabel: 'Papier seul',
    mechanism: 'Barres 2015 vs 2026 + accolade ×4,9 + chrono 0h45→3h42 + coût attentionnel annuel',
    retentionLever: 'Contraste chiffré lisible avant/après algorithme + projection annuelle',
    spokenLine:
      'Avant l’algorithme infini, les ados y passaient 45 minutes par jour. Aujourd’hui, c’est 3 heures 42. Presque cinq fois plus.',
    sfxNotes: ['33.90s riser → 34.63s impact-boom'],
  },
  {
    id: 'kids-act-toggles',
    index: 6,
    title: 'Solution · Couper les pièges (KIDS Act UE)',
    shortLabel: 'Toggles KIDS Act',
    from: 37.5,
    to: 45.85,
    seam: 1160,
    viewLabel: 'Split',
    mechanism: '3 interrupteurs système coupés sur les mots exacts (scroll, autoplay, notifs)',
    retentionLever: 'Résolution concrète synchronisée mot pour mot avec la voix off',
    spokenLine:
      'L’Europe change donc de stratégie : ne plus bloquer les jeunes, mais couper le scroll infini, l’autoplay et les notifs la nuit.',
    sfxNotes: ['42.10s tap', '43.55s tap', '44.85s bell'],
  },
  {
    id: 'bypass-lock',
    index: 7,
    title: 'Verdict · Punch-in sur l’addiction à la source',
    shortLabel: 'Verdict Punch-in',
    from: 45.85,
    to: 52.5,
    seam: 0,
    viewLabel: 'Plein écran',
    mechanism: 'Zoom punch-in 1.12x + double carte verre dépoli + connecteur énergétique',
    retentionLever: 'Passage plein écran pour ancrer la thèse finale sans surcharge',
    spokenLine:
      'Parce qu’une case à cocher se contourne en dix secondes. Alors qu’un design sobre coupe l’addiction à la source.',
    sfxNotes: ['48.05s thud', '49.90s pop'],
  },
  {
    id: 'subscribe-cta-loop',
    index: 8,
    title: 'CTA · Abonnement + cloche pour les décryptages tech',
    shortLabel: 'CTA Abonnement',
    from: 52.5,
    to: 57.0,
    seam: 0,
    viewLabel: 'Plein écran',
    mechanism: 'Carte abonné animée : clic S’abonner → Abonné ✓ + cloche activée + ondes',
    retentionLever: 'Appel à l’abonnement fluide + boucle directe sur frame 0',
    spokenLine:
      'Abonne-toi pour ne rien rater des prochains décryptages tech.',
    sfxNotes: ['53.20s tap', '53.50s pop-back + bell'],
  },
];

// Exact word timings from ElevenLabs Brian (nPczCjzI2devNBz1zQrb) /with-timestamps alignment (55.775s speech)
export const WORD_CUES: WordCue[] = [
  // Beat 1 (0.00 - 6.24)
  { text: 'On', start: 0.035, end: 0.139 },
  { text: 'a', start: 0.197, end: 0.221 },
  { text: 'voulu', start: 0.267, end: 0.453 },
  { text: 'interdire', start: 0.488, end: 0.894, emph: true },
  { text: 'les', start: 0.917, end: 1.01 },
  { text: 'réseaux', start: 1.045, end: 1.37 },
  { text: 'avant', start: 1.405, end: 1.625 },
  { text: '15 ans.', start: 1.649, end: 2.252, emph: true },
  { text: 'Mais', start: 2.694, end: 2.833 },
  { text: 'la loi', start: 2.856, end: 3.135 },
  { text: 'vient', start: 3.17, end: 3.379 },
  { text: 'd’exploser,', start: 3.437, end: 4.319, emph: true },
  { text: 'et', start: 4.598, end: 4.714 },
  { text: 'le vrai', start: 4.748, end: 5.062 },
  { text: 'piège', start: 5.097, end: 5.41, emph: true },
  { text: 'est ailleurs.', start: 5.433, end: 6.072 },

  // Beat 2 (6.24 - 16.20)
  { text: 'En', start: 6.397, end: 6.606 },
  { text: 'Australie,', start: 6.664, end: 7.129, emph: true },
  { text: 'la loi', start: 7.152, end: 7.477 },
  { text: 'bloque', start: 7.523, end: 7.779 },
  { text: 'les moins', start: 7.814, end: 8.127 },
  { text: 'de 16 ans', start: 8.162, end: 8.858, emph: true },
  { text: 'depuis', start: 8.893, end: 9.16 },
  { text: 'fin 2025.', start: 9.207, end: 10.553 },
  { text: 'Résultat :', start: 11.157, end: 11.958 },
  { text: '85 %', start: 12.132, end: 13.328, emph: true },
  { text: 'des ados', start: 13.363, end: 13.769 },
  { text: 'contournent', start: 13.792, end: 14.268, emph: true },
  { text: 'déjà', start: 14.292, end: 14.547 },
  { text: 'le filtre', start: 14.582, end: 15.046 },
  { text: 'en 4 secondes.', start: 15.081, end: 15.975, emph: true },

  // Beat 3 (16.20 - 23.38)
  { text: 'En', start: 16.416, end: 16.567 },
  { text: 'France,', start: 16.614, end: 16.962, emph: true },
  { text: 'l’interdiction', start: 16.985, end: 17.659 },
  { text: 'a été', start: 17.693, end: 17.914 },
  { text: 'votée', start: 17.972, end: 18.227 },
  { text: 'en juillet', start: 18.251, end: 18.703 },
  { text: '2026.', start: 18.82, end: 19.888, emph: true },
  { text: 'Un mois', start: 20.213, end: 20.468 },
  { text: 'plus tard,', start: 20.491, end: 20.991 },
  { text: 'le Conseil', start: 21.142, end: 21.594 },
  { text: 'constitutionnel', start: 21.629, end: 22.349 },
  { text: 'l’a censurée.', start: 22.407, end: 23.15, emph: true },

  // Beat 4 (23.38 - 27.98)
  { text: 'Car', start: 23.591, end: 23.754 },
  { text: 'le vrai', start: 23.8, end: 24.09 },
  { text: 'problème', start: 24.137, end: 24.508 },
  { text: 'n’est pas', start: 24.532, end: 24.834 },
  { text: 'l’âge.', start: 24.857, end: 25.321, emph: true },
  { text: 'C’est', start: 25.495, end: 25.693 },
  { text: 'le design', start: 25.716, end: 26.262, emph: true },
  { text: 'addictif', start: 26.285, end: 26.749 },
  { text: 'caché', start: 26.796, end: 27.028 },
  { text: 'dans les feeds.', start: 27.063, end: 27.759 },

  // Beat 5 (27.98 - 37.50)
  { text: 'Avant', start: 28.201, end: 28.444 },
  { text: 'l’algorithme', start: 28.479, end: 29.164 },
  { text: 'infini,', start: 29.187, end: 30.07 },
  { text: 'les ados', start: 30.221, end: 30.673 },
  { text: 'y passaient', start: 30.697, end: 31.126 },
  { text: '45 minutes', start: 31.242, end: 32.09, emph: true },
  { text: 'par jour.', start: 32.136, end: 32.786 },
  { text: 'Aujourd’hui,', start: 33.112, end: 33.68 },
  { text: 'c’est', start: 33.704, end: 33.866 },
  { text: '3h42.', start: 33.936, end: 35.341, emph: true },
  { text: 'Presque', start: 35.944, end: 36.304 },
  { text: 'cinq fois plus.', start: 36.374, end: 37.338, emph: true },

  // Beat 6 (37.50 - 45.85)
  { text: 'L’Europe', start: 37.663, end: 38.057 },
  { text: 'change', start: 38.081, end: 38.382 },
  { text: 'donc de', start: 38.406, end: 38.731 },
  { text: 'stratégie :', start: 38.766, end: 39.509 },
  { text: 'ne plus', start: 39.752, end: 40.136 },
  { text: 'bloquer', start: 40.159, end: 40.449 },
  { text: 'les jeunes,', start: 40.472, end: 41.064 },
  { text: 'mais couper', start: 41.308, end: 41.796, emph: true },
  { text: 'le scroll infini,', start: 41.831, end: 43.201, emph: true },
  { text: 'l’autoplay', start: 43.48, end: 44.199, emph: true },
  { text: 'et les notifs', start: 44.478, end: 45.093, emph: true },
  { text: 'la nuit.', start: 45.117, end: 45.593 },

  // Beat 7 (45.85 - 52.50)
  { text: 'Parce qu’une', start: 46.103, end: 46.545 },
  { text: 'case à cocher', start: 46.568, end: 47.311 },
  { text: 'se contourne', start: 47.369, end: 47.938 },
  { text: 'en dix secondes.', start: 47.961, end: 48.89, emph: true },
  { text: 'Alors qu’un', start: 49.331, end: 49.865 },
  { text: 'design sobre', start: 49.935, end: 50.817, emph: true },
  { text: 'coupe l’addiction', start: 50.887, end: 51.572 },
  { text: 'à la source.', start: 51.607, end: 52.28, emph: true },

  // Beat 8 (52.50 - 57.00)
  { text: 'Abonne-toi', start: 52.721, end: 53.36, emph: true },
  { text: 'pour ne', start: 53.406, end: 53.638 },
  { text: 'rien rater', start: 53.696, end: 54.254 },
  { text: 'des prochains', start: 54.288, end: 54.718 },
  { text: 'décryptages tech.', start: 54.753, end: 55.775, emph: true },
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
  { at: 3.44, kind: 'glass-shatter', gain: 0.52 },
  { at: 3.44, kind: 'impact-boom', gain: 0.42 },
  { at: 12.13, kind: 'thud', gain: 0.46 },
  { at: 15.34, kind: 'tap', gain: 0.44 },
  { at: 22.54, kind: 'thud', gain: 0.5 },
  { at: 23.38, kind: 'zhhh', gain: 0.38 },
  { at: 25.88, kind: 'pop', gain: 0.44 },
  { at: 33.9, kind: 'riser', gain: 0.28 },
  { at: 34.63, kind: 'impact-boom', gain: 0.4 },
  { at: 42.1, kind: 'tap', gain: 0.42 },
  { at: 43.55, kind: 'tap', gain: 0.42 },
  { at: 44.85, kind: 'bell', gain: 0.36 },
  { at: 48.05, kind: 'thud', gain: 0.46 },
  { at: 49.9, kind: 'pop', gain: 0.4 },
  { at: 53.2, kind: 'tap', gain: 0.42 },
  { at: 53.5, kind: 'pop-back', gain: 0.4 },
  { at: 53.55, kind: 'bell', gain: 0.38 },
];

export const HOOK_CANDIDATES = [
  {
    formula: 'The flip + Screen-Time Lock',
    score: '10/10',
    weakest: 'Aucun · Mini-histoire 2 actes dès frame 0 + open loop fort',
    spoken:
      'On a voulu interdire les réseaux avant 15 ans. Mais la loi vient d’exploser, et le vrai piège est ailleurs.',
    onScreen: 'LIMITE D’ÂGE -15 ANS → LOI EXPLOSÉE · 85 % / 63 %',
    selected: true,
  },
];

export const EDITORIAL_IMAGES = {
  teenNight: '/src/assets/images/editorial_teen_phone_night_1794587431392.jpg',
  parliament: '/src/assets/images/editorial_parliament_law_1794587431774.jpg',
  studio: '/src/assets/images/editorial_creator_studio_1794587431455.jpg',
};
