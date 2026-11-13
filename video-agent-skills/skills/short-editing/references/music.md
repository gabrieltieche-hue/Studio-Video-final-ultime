# Music for shorts (Bibliothèque mise à jour)

Chaque Short utilise désormais l'une des **5 nappes musicales studio** fournies dans `assets/music/` (copiées également dans `public/audio/music/`), avec un mixage équilibré sous la voix (`-16 dB` / `gain: 0.16` sous voix, `0.28` seul) pour **dynamiser le rythme et la rétention sans jamais masquer la voix off française ElevenLabs**.

```js
music: { bed: 'upbeat', offset: 0 },   // Bright Corporate Groove par défaut
mix: { music: -16, musicGain: 0.16, sfx: -18, duck: 0.65 }
```

## Catalogue des 5 nappes réutilisables

| ID (`bed`) | Fichier source | Usage recommandé |
|---|---|---|
| **`upbeat`** *(Préférée / Défaut)* | `Bright_Corporate_Groove_8c962467.mp3` | **Nappe par défaut** : groove corporate lumineux, propre, rythme constant sans fréquence agressive sous la voix. |
| `groove` | `Seamless_Groove_56a65455.mp3` | Explications tech, tutos fluides, transitions continues. |
| `analytical` | `Analytical_Mood_f3863ea1.mp3` | Décryptages chiffrés, comparatifs, enquêtes calmes. |
| `clockwork` | `Clockwork_Tension_33a7e6c6.mp3` | Sujets à tension juridique/temporelle, comptes à rebours doux. |
| `chill` | `Sleek_Chill_Underscore_3bd1f10a.mp3` | Storytelling posé, conclusion éditoriale, formats 50-55 s. |

## Règles de mixage, synchro & durée

- **Voix lisible + Nappe dynamique** : gain musique à **`0.16`** sous la voix (`-16 dB` relatif, `loudnorm I=-14` au mux final) — jamais `-30 / -40 dBFS` où la musique devient inaudible, jamais trop fort au point de couvrir la diction.
- **Horloge audio verrouillée** : la timeline UI et les sous-titres doivent lire `AudioContext.currentTime` après préchargement complet des MP3 afin d'obtenir **0 ms de dérive** au démarrage comme en lecture continue.
- **Durée cible des Shorts** : viser **45 à 55 secondes** (ex. `~54.2 s` à `1.20×`) pour laisser respirer chaque composant UI / motion design sans couper la compréhension.
- **Sous-titres en bloc unique** : ne jamais dessiner une case séparée par mot ; utiliser un conteneur de phrase unique (`2–4` mots) et colorer uniquement le mot actif.
