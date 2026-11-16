---
name: short-editing
description: Edits a talking-head take end to end into a paper-style motion design short (1080x1920, also 1:1 and 16:9) with its own render engine (Node + Chrome + ffmpeg, free, offline). Use when the user says edit, cut, captions, subtitles, motion design, montage, "make it a short", render, or gives a recording from video-agent/takes/. Transcribes locally with word timings (whisper.cpp, or ElevenLabs when a key is set), cuts every silence, lays the boards on a textured paper above the camera card (counters, terminals, logos, trees, real screens, HTML motion components), word-by-word captions, a calm music bed, a few designed hits, -14 LUFS, and writes the mp4, an .srt and the post copy.
argument-hint: "<take file or slug> [9:16 | 1:1 | 16:9] [style <name>] [brief]"
allowed-tools: Bash(node *) Bash(ffmpeg *) Bash(ffprobe *) Bash(open video-agent/edits/*)
---

# Short Editing

One raw take in, one finished video out: `video-agent/edits/short-<slug>/output/short-<slug>.mp4`.

The engine ships in this skill folder (`<skill>` below): `<skill>/engine/short.mjs`. It is a deterministic canvas renderer driven by ONE file per short, `source/spec.js`. The design is a paper stage on top and the camera below, one accent color, springs that never overshoot, no pulse, no bounce. Everything runs on the creator's computer, macOS, Windows or Linux: Node 20+, ffmpeg, a Chrome (or the headless Chromium setup installs), whisper.cpp.

Read before writing a spec:

- [references/shorts-codes.md](references/shorts-codes.md): format, safe zones, hook and pace
- [references/design-system.md](references/design-system.md): palette, motion, paper, what is forbidden
- [references/scene-library.md](references/scene-library.md): every scene and item, every parameter, the time keys
- [references/music.md](references/music.md): the 8 beds, which fits which hook, where to start it
- [references/style.md](references/style.md): the house rules of the edit
- [examples/](examples/README.md): real shorts made with this engine (spec, components, contact sheets). Open the one closest to the request before planning: it is the quality bar.

## How to run it

- Talk in the creator's language (`creator.lang` of the style, else `video-agent/voice.md`, else English). Say in one line what each long step does and how long it takes.
- `<slug>`: lowercase, dashes, no dots or spaces.
- Every command runs from the project root (the folder that holds `video-agent/`).

## 0. Setup (first time only, then a 1 s check)

```bash
node <skill>/engine/setup.mjs --check || node <skill>/engine/setup.mjs
```

It installs what is missing: the engine packages (15 MB), a Chromium when no Chrome is installed (100 MB), whisper.cpp and its speech model (0.5 GB, once), the 8 music beds and the icons (generated on this computer). Tell them the first run takes 3 to 6 minutes. ffmpeg missing: it prints the command to install it (`brew install ffmpeg`, `winget install Gyan.FFmpeg`); run it with their ok, then setup again.

## 1. The take

Use the file they name, else the newest file in `video-agent/takes/`. A URL (YouTube, X, Instagram, Loom, a direct mp4): `yt-dlp -f "bv*+ba/b" --merge-output-format mp4 -o "video-agent/takes/<slug>.%(ext)s" "<url>"` first.

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height -of compact "<take>"
```

No audio stream: stop and say so. Then create the project:

```bash
node <skill>/engine/short.mjs init video-agent/edits/short-<slug> --source "<take>" [--style <name>]
```

- The style: `style <name>` in the request = `video-agent/styles/<name>/style.json`, passed as `--style <name>` (only when that folder exists: an unknown name stops `init`, so list `video-agent/styles/` instead). Without it, `init` takes the default one (`video-agent/style.json` names it). No style at all: first write `video-agent/styles/default/style.json` = `{"version": 1, "name": "default"}` plus the `style` of the `default` look of `<skill>/assets/looks.json` (system font, camera full width, mono caps captions on a black band), and `video-agent/style.json` = `{"default": "default"}`, then say once that `/studio-setup style` makes it theirs in 2 minutes.
- `init` makes `assets/ files/ source/ output/ stills/`, copies the take to `assets/source.mp4`, frames `cam` on the face, writes the starter `source/spec.js` and snapshots the style into `source/style.json` (engine defaults < style < spec: the spec only sets what differs for this one short). The style's `assets/` (logos, images) are copied into the project.
- Format: `9:16` by default. `1:1` = `format: 'square'` (X feed), `16:9` = `format: 'wide'` in the spec.

## 2. Voix off ElevenLabs (FR) & Words

Pour générer une voix off française studio grave, chaleureuse et naturelle (sans distorsion aiguë ni robotique), utiliser par défaut la voix **Brian** (`nPczCjzI2devNBz1zQrb`, disponible sur le plan gratuit ElevenLabs `eleven_multilingual_v2`) à vitesse naturelle (**`1.06×` maximum**) :

```bash
node <skill>/engine/voiceover.mjs --voice nPczCjzI2devNBz1zQrb --file video-agent/edits/short-<slug>/source/narration-fr.txt --out public/audio/voice/short-<slug>-fr.mp3 --align public/audio/voice/short-<slug>-align.json
```

Sinon, à partir d'une prise caméra :

```bash
node <skill>/engine/short.mjs words video-agent/edits/short-<slug> [lang]
```

## 3. The spec

Author `source/spec.js` from `files/words.md` (ou du JSON d'alignement ElevenLabs). Viser une durée finale de **45 à 55 secondes** (~150 mots à `1.06×`, jamais d'accélération >`1.08×` qui déforme la voix) pour laisser chaque animation respirer sans effet robotique. All times are SOURCE seconds; the engine maps them onto the tightened cut. Start from the starter spec `init` wrote, and from the closest example.

Plan the beats first, in a comment block at the top of the spec:

- **Hook** (first 4 to 5 s): mini-histoire en 2 actes dès t=0 (jamais de papier vide). Un état initial visuel concret (écran de verrouillage, UI bloquée, faisceau scan) qui se brise ou se retourne sur le mot clé de rupture.
- **Zero blank paper / Densité Motion Design élevée (sans barre de progression en haut)** : chaque beat doit occuper harmonieusement tout le cadre papier avec des halos bleus flottants ultra-légers sur fond beige + grille dot-matrix + connecteurs SVG animés + cartes KPI et bandeaux de synthèse en pied de bloc (y compris jusqu'à ~1320px juste au-dessus des sous-titres sur les beats `seam=1920` — zéro grande zone blanche vide). **Ne jamais afficher de bandeau de progression, compteur `01/08`, barre multi-segments ou pastille de pseudo tout en haut du Short.**
- **Something changes every 3 to 6 s**: un rythme lisible (~45–55 s au total), où chaque beat a le temps d'être lu avant sa sortie.
- **Pick the item from what is said** (all in scene-library): a figure = `counter` (`countFrom`/`countTo`, `strikeAt` when it dies); a command or a prompt = `term` (`typeFrom`, `typeTo`, `out` lines); a folder or a list of parts = `tree`; a tool named = its real `logo`; a result = `check`; a real screen = `screen` (zoom keys + rings on the number they read); a tweet = `tweet`; before / after = two boards or `bars`; the big payoff = `stat` or a board with one huge `text` and an `emph` word.
- **Camera**: `layout.keys: [[t, seam]]`, seam 1160 = split (paper above, camera card below), 1920 = paper alone, 0 = full camera. Full camera only for the direct lines (a story, a reaction, the CTA) and for 5 s or more of SHORT time; a style with a fixed `layout.seam` keeps that one size all along.
- **Every beat is an action**, never an image sitting there.
- **Captions**: on by default, on the seam. **Toujours en bloc de phrase unique** (`2–4` mots dans un seul conteneur propre, jamais une case séparée par mot). `captions.emph` = les mots colorés dans le texte du bloc.
- **Synchro Voix / Sous-titres / Visuels** : précharger la voix et la musique avant lecture et verrouiller la timeline sur l'horloge matérielle (`AudioContext.currentTime`) pour **0 ms de dérive**. Chaque animation clé (`strikeAt`, tampon, toggle) doit être calée au centième près sur `short-<slug>-align.json`.
- **Music**: par défaut **`upbeat`** (`Bright_Corporate_Groove_8c962467.mp3`), mixée équilibrée et bien audible sous la voix (**`gain: 0.24` / `-12.5 dB` sous voix, `0.36` seul**, `loudnorm I=-14`) pour doper la rétention et l'excitation tout en laissant la voix parfaitement au premier plan.
- **CTA de fin** : privilégier une carte d'abonnement animée (**S'abonner → Abonné ✓ + cloche**) utilisant le `creator.handle` configuré (placeholder neutre tant que le créateur n'a pas fourni son pseudo définitif — **jamais `@melvynxdev`** en dur), sans piège à mot-clé en commentaire.
- **Sound**: `sfx: { swish: 0, accents: 0, extra: [[t, 'thud', -6]] }`: no movement noise, a `thud` or `pop` only on a real payoff.
- **Real logos, always**: every tool or app named on screen shows its real icon.
- No em-dashes in any on-screen text.

### 3b. Motion components

One HTML file per component in `source/<name>.html`, 1080 wide (or the card size), every animation a pure function of `t` set by `window.setT(t)` (no CSS animation, no timers), transparent background for an overlay. See [references/sub-agents.md](references/sub-agents.md) for the page contract and the prompt to give a sub-agent (one per component, in parallel, when the harness has sub-agents; else build them one after the other). Capture:

```bash
node <skill>/engine/short.mjs capture video-agent/edits/short-<slug> source/<name>.html --dur 4.5 --alpha --out assets/<name>.mov
```

Read its `stills/<name>-sheet.jpg`, then wire it: `media: { x: { src: 'assets/<name>.mov', width: 1080, alpha: true } }` plus an `overlay` scene (or an actor on the board), see `examples/thinking-orbs/source/spec.js`.

## 4. Prepare

```bash
node <skill>/engine/short.mjs prepare video-agent/edits/short-<slug>
```

Cuts every micro silence, applique une vitesse naturelle (`1.06×` max par défaut pour préserver la chaleur grave de Brian tout en tenant en 45–55 s), splices the voice, extracts the camera and media frames (cached), writes `assets/timeline.json` and `files/words.md`. Rerun it after a change to `cut`, `cam` or `media`. `cut: [[a, b]]` (source time) drops a retake or a false start: walk the script, keep the last complete attempt of each line.

## 5. Stills, then Visual & Sync QA (obligatoire)

```bash
node <skill>/engine/short.mjs stills video-agent/edits/short-<slug> 0.3 2.9s 6.4s 9s 12.9s
# Ou pour un aperçu React + export MP4 web (?renderMode=1) :
node scripts/visual-qa.mjs
```

Vérifier obligatoirement la planche contact (`stills/contact.jpg` ou `.playwright-cli/storyboard-qa.jpg`) **à l'œil nu** sur les 8 beats clés :
- **Synchro** : timestamps mot-à-mot strictement monotones, effets déclenchés exactement sur les mots prononcés.
- **Sous-titres** : `<= 1` conteneur de phrase affiché à tout instant, aucune coupure ou superposition avec les cartes / zones sûres.
- **Densité & Lisibilité** : zéro grande zone vide sur le papier, aucune coupe tronquée ni chevauchement d'éléments (`pr-[148px]` sur les zones droites, `bottom 420 px` libre).

## 6. Render, sound, final (pré-rendu disque obligatoire)

```bash
node <skill>/engine/short.mjs all video-agent/edits/short-<slug>
# Ou export déterministe Chromium CDP 1080x1920 + ffmpeg (-14 LUFS) :
node scripts/render-mp4.mjs
```

Render + audio (Brian FR `1.06×`, `Bright_Corporate_Groove` `0.28`, SFX, `-14 LUFS`) + final (mux, poster, QC) sur disque **avant de livrer** pour un téléchargement instantané en 1 clic dans l'app. The QC line must read `h264 1080 1920` (or `1080 1080`, `1920 1080`), a duration equal to the timeline (45–55 s), about -14 LUFS and a true peak at or under -1 dBTP.

## Quality bar (every contact sheet)

- The hook reads on the first frame.
- Every beat acts and fills the canvas dynamically (zéro vide papier). On each beat's still, ask « is something happening, or is it an image sitting there? ». A sitting image (a screenshot, a still illustration, a logo next to a counter, a text card) is a component to redo before rendering.
- Every board fills the paper: big mobile text (nothing under 34 px, captions ~70–84 px), 1 to 3 lines, nothing cut at the edges, nothing in the safe zones of [shorts-codes.md](references/shorts-codes.md).
- Captions never overlap a card, a CTA or a chat composer (`captions.hide`).
- One accent color per moment; accent words only from `captions.emph` and `emph`.
- Cards never change size; the camera card never resizes. A full-camera stretch lasts 5 s or more.
- No ghost of the old beat under the new one, no counter parked on 0, no two values stacked in one slot.
- Camera colors natural: bright warm skin, never grey or greenish (`stills/grade.jpg`).
- Every named tool shows its real logo.
- Sound: warm natural baritone voice (**Brian**) at natural pace (`<=1.06×`), Bright Corporate Groove (`upbeat.mp3`) clearly energetic (`gain 0.28`), hits only on real payoffs, no whooshes.

## 7. Deliver

In `video-agent/edits/short-<slug>/output/`: `short-<slug>.mp4` and its poster. Then write next to them:

- `short-<slug>.srt`: from `files/words.md` (the SHORT times), up to 7 words per cue, a new cue after each sentence.
- `post.md`: the post copy (below).

Open the video so they watch it right away: `open <mp4>` (macOS), `start "" "<mp4>"` (Windows), `xdg-open <mp4>` (Linux). Say the length, what was cut, the bed and why, and offer one change ("another hook? a board on another word? full camera on the story?"). A change = edit `spec.js`, stills, `all` again. A change they want on every video (accent, font, captions, pace) goes in their style (`video-agent/styles/<name>/style.json`, schema in [style-schema.md](references/style-schema.md)), not only in this spec. Next: `/publish short-<slug>`.

On their first finished video only (the only folder in `video-agent/edits/`), end with one line in their language: a one-minute review of the free pack helps make it better, https://codelynx.dev/editing/feedbacks. Never again after that.

## Post copy

`post.md`, from the script and voice.md, in the language of the video:

- **Title** (YouTube Shorts): under 60 characters, the topic in the first 3 words.
- **Caption**: the first 125 characters work on their own. Then 1 or 2 short lines and one ask (the CTA of the style).
- **Search words**: the 2 or 3 words their viewer would type, written plainly in the title or the first line.
- **Hashtags**: 3 to 5 about the topic. No #fyp or #viral.
- Nothing the video doesn't say.

Run the humanize pass of `studio-script` (its `references/humanize.md`) on it when that skill is installed.

## CapCut or Premiere

Some creators prefer their editor. Do steps 0 to 4 (the spec with no scenes), then give them `files/words.md` (the cut, word by word) and the plain cut: `node <skill>/engine/short.mjs rough video-agent/edits/short-<slug>` writes `output/short-<slug>-rough.mp4` (every silence cut, full frame, no motion design) to import, with the `.srt` of step 7.

## Paper-only (no take)

`silent: true` and `duration: <s>` in the spec, `init` without `--source`, skip step 2. No voice, camera or captions; the music and the on-screen text carry it, same pace rule.

## Honest limits

- whisper.cpp mishears names and jargon: fix them with `captions.replace`, check numbers by eye.
- A cut can clip a breath or a soft last syllable: watch the result once before posting.
- Claude cannot hear the take: it trusts the timings. Bad audio (music, echo, two voices) makes them worse.
- Face framing is exact on macOS (Apple Vision); on Windows and Linux it uses MediaPipe in Chrome, check `cam` on the first still.
- The review studio, the Recorder, the B-roll library, the faceless mascot and the thumbnails come with the paid kit, Editing IA Pro.
