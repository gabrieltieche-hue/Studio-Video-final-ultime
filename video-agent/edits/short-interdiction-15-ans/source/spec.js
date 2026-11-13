// Généré par melvynx/video-agent-skills (Short sur l'interdiction des réseaux aux moins de 15 ans)
// Pipeline mis à jour : Voix off FR Liam (TX3LPaxmHKxFdv7VOQHJ) + Bright Corporate Groove (gain 0.16) + Captions bloc unique + 54.2 s + CTA Abonnement

window.SPEC = {
  title: 'Interdire les réseaux avant 15 ans : pourquoi la loi explose',
  speed: 1.2,
  duration: 65.0,
  voice: {
    provider: 'elevenlabs',
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ',
    src: 'public/audio/voice/short-interdiction-15-ans-fr.mp3',
    align: 'public/audio/voice/short-interdiction-15-ans-align.json',
  },
  layout: {
    keys: [
      [0.0, 1160],   // Beat 1: Hook verrou parental -15 ans + explosion 3.39s
      [6.6, 1160],   // Beat 2: Australie 85 % + Age Gate bypass 2012 -> 2004
      [17.15, 1160], // Beat 3: France votée juil. 2026 -> CENSURÉ 14 août
      [27.3, 1920],  // Beat 4: Full Paper — Design du feed + Jauge 92 %
      [33.45, 1920], // Beat 5: Full Paper — Bars 45 min vs 3h42 (x4.9)
      [42.8, 1160],  // Beat 6: Split — KIDS Act Toggles
      [52.55, 0],    // Beat 7: Plein écran — Punch-in verdict
      [59.35, 0],    // Beat 8: Plein écran — CTA Abonnement + Cloche (@melvynxdev)
    ],
  },
  music: { bed: 'upbeat', offset: 0 },
  mix: { music: -16, musicGain: 0.16, sfx: -18, duck: 0.65 },
  captions: { style: 'rise', groupedContainer: true, perWordBoxes: false, maxWords: 4, maxChars: 22 },
  sfx: {
    swish: 0,
    accents: 0,
    extra: [
      [3.39, 'glass-shatter', -6],
      [3.39, 'impact-boom', -8],
      [12.39, 'thud', -6],
      [15.65, 'tap', -8],
      [25.97, 'thud', -6],
      [27.3, 'zhhh', -8],
      [31.18, 'pop', -7],
      [38.6, 'riser', -10],
      [39.57, 'impact-boom', -7],
      [48.42, 'tap', -8],
      [49.72, 'tap', -8],
      [50.76, 'bell', -9],
      [54.45, 'thud', -7],
      [60.25, 'tap', -8],
      [60.55, 'pop-back', -7],
      [60.6, 'bell', -8],
    ],
  },
};
