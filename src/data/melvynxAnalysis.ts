export interface StyleDimension {
  title: string;
  metric: string;
  summary: string;
  rules: string[];
}

export const MELVYNX_DNA: StyleDimension[] = [
  {
    title: '01. Rythme & Respiration (1.08× · 45–55 s)',
    metric: '52.0 s à 1.08× · 0 blanc',
    summary:
      'La suppression des micro-silences évite toute respiration morte tout en gardant un rythme naturel à 1.08× : assez rapide pour retenir, assez posé (45–55 s) pour laisser lire chaque UI.',
    rules: [
      'Silence > 0.3 s supprimé automatiquement tout en gardant 0.08 s en fin de phrase',
      'Vitesse globale à 1.08× pour une durée idéale entre 45 et 55 secondes',
      'Un changement visuel clair toutes les 3 à 6 secondes sans brusquer la lecture',
      'Hook en 2 actes dès frame 0 + re-hook visuel à 42 % pour relancer la rétention',
    ],
  },
  {
    title: '02. Grammaire Visuelle · Papier Signature',
    metric: '#F1EEE6 · #14161B · #258EFF',
    summary:
      'Un système graphique austère et immédiatement reconnaissable : papier grainé chaud (#F1EEE6), cartes nettes (#FCFBF8), encre (#14161B) et UNE seule couleur d’accent (#258EFF). Zéro néon, zéro dégradé gratuit.',
    rules: [
      'Physique Apple-calm : ressort critically damped S(x, w) qui ne dépasse jamais 1.0 (zéro bounce/elastic)',
      'Sorties propres en 0.26 s via leave(x) pour ne laisser aucun fantôme sous le beat suivant',
      'Motion design > émojis : les idées logicielles et sociétales sont jouées dans de vraies UI recréées en HTML',
      '1 idée développée = 1 tableau qui reste et grandit plutôt que 5 slides jetables',
    ],
  },
  {
    title: '03. Architecture des 3 Vues (Seam)',
    metric: '1160 · 1920 · 0',
    summary:
      'La scène verticale 1080×1920 alterne par coupes franches ou fenêtre glissante entre trois hauteurs de séparation (seam) afin de réveiller l’œil sans jamais redimensionner la carte caméra.',
    rules: [
      'Seam 1160 (Split par défaut) : plateau papier en haut avec board actif, sujet/caméra en bas',
      'Seam 1920 (Papier seul) : réservé aux preuves denses, graphiques, jauges ou UI complexes',
      'Seam 0 (Plein écran) : réservé aux verdicts directs face caméra (≥ 5 s) et au CTA final',
      'Zones sûres strictes : contenu entre y 220 et y 1500, marge droite de 140 px libre pour les boutons Shorts/Reels',
    ],
  },
  {
    title: '04. Sous-titres Unifiés & Voix ElevenLabs',
    metric: 'Bloc unique · 2–4 mots · -30 LUFS',
    summary:
      'Les sous-titres affichent un seul bloc de phrase propre (jamais de cases isolées par mot) avec uniquement le mot parlé mis en valeur, calé sur la voix off française ElevenLabs et une nappe douce non intrusive.',
    rules: [
      'Un seul conteneur de phrase (2–4 mots, 22 car. max) synchronisé au millième près (/with-timestamps)',
      '5 nappes studio réutilisables avec Bright Corporate Groove (upbeat.mp3) par défaut',
      'Mixage voix-prioritaire : musique très douce (0.055 sous voix / ducking 0.75) pour ne jamais masquer la voix',
      'Zéro whoosh gratuit : uniquement des thuds, pops et impacts (impact-boom, glass-shatter) sur les vrais payoffs',
    ],
  },
];

export const REPO_FILES_SUMMARY = [
  {
    path: 'skills/short-editing/engine/short.mjs',
    role: 'CLI & moteur de rendu déterministe (Node + Chrome + ffmpeg, 250 fps WebCodecs)',
  },
  {
    path: 'skills/short-editing/engine/voiceover.mjs & /api/tts',
    role: 'Pipeline voix off française ElevenLabs + alignement mot-à-mot (/with-timestamps) et proxy sécurisé',
  },
  {
    path: 'skills/short-editing/assets/music/ (5 pistes)',
    role: 'Nappes studio réutilisables : upbeat.mp3 (Bright Groove défaut), groove, analytical, clockwork, chill',
  },
  {
    path: 'skills/studio-script/SKILL.md',
    role: '22 formules de hooks, rubric /10, 4 quality gates, passe anti-AI humanize',
  },
  {
    path: 'video-agent/styles/papier-melvynx/style.json',
    role: 'Profil style configuré dans ce workspace (Papier signature · #258EFF · 1.08× · upbeat · bloc unique)',
  },
  {
    path: 'video-agent/edits/short-interdiction-15-ans/source/spec.js',
    role: 'Spec complète du Short 52 s ("Interdire les réseaux avant 15 ans") calée sur ElevenLabs FR',
  },
];

export const FACT_SOURCES = [
  {
    label: 'Australie · Online Safety Amendment (2024–2026)',
    detail: 'Interdiction < 16 ans entrée en vigueur en décembre 2025 ; études eSafety 2026 montrant ~70 à 85 % de contournement par les ados.',
  },
  {
    label: 'France · Décision Conseil constitutionnel (14 août 2026)',
    detail: 'Proposition de loi votée en juillet 2026 pour les < 15 ans, censurée le 14 août pour atteinte disproportionnée à la liberté de communication.',
  },
  {
    label: 'Pivot réglementaire européen (KIDS Act / DSA)',
    detail: 'Ciblage des mécaniques addictives par défaut (scroll infini, autoplay, recommandations non suivies, notifications nocturnes).',
  },
];
