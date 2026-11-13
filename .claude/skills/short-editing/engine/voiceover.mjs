#!/usr/bin/env node
/**
 * ElevenLabs French Voiceover Generator for video-agent-skills.
 * Reads ELEVENLABS_API_KEY from .env / environment and generates:
 *   - MP3 voiceover track (eleven_multilingual_v2)
 *   - Word-level timestamps JSON (from /with-timestamps character alignment)
 *
 * Default Free-Plan API premade voice:
 *   - TX3LPaxmHKxFdv7VOQHJ (Liam - Energetic, Social Media Creator, great French cadence)
 *   - Alternatives Free-Plan premade: pNInz6obpgDQGcFmaJgB (Adam), JBFqnCBsd6RMkjVDRZzb (George)
 *
 * Usage:
 *   node voiceover.mjs --text "..." --out public/audio/voice/out.mp3 --align public/audio/voice/align.json [--voice TX3LPaxmHKxFdv7VOQHJ]
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const DEFAULT_FREE_VOICE_ID = 'TX3LPaxmHKxFdv7VOQHJ';

export function resolveVoiceId(candidate) {
  const cleaned = typeof candidate === 'string' ? candidate.trim() : '';
  return /^[A-Za-z0-9]{15,32}$/.test(cleaned) ? cleaned : DEFAULT_FREE_VOICE_ID;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

export function buildWordsFromAlignment(alignment) {
  const chars = alignment?.characters || [];
  const starts = alignment?.character_start_times_seconds || [];
  const ends = alignment?.character_end_times_seconds || [];
  const words = [];
  let buf = '';
  let wStart = null;
  let wEnd = null;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\s/.test(ch)) {
      if (buf.length > 0 && wStart !== null) {
        words.push({ text: buf, start: Number(wStart.toFixed(3)), end: Number(wEnd.toFixed(3)) });
        buf = '';
        wStart = null;
        wEnd = null;
      }
    } else {
      if (wStart === null) wStart = starts[i];
      wEnd = ends[i];
      buf += ch;
    }
  }
  if (buf.length > 0 && wStart !== null) {
    words.push({ text: buf, start: Number(wStart.toFixed(3)), end: Number(wEnd.toFixed(3)) });
  }
  return words;
}

export async function synthesizeElevenLabs({
  text,
  voiceId = resolveVoiceId(process.env.ELEVENLABS_VOICE_ID),
  apiKey = process.env.ELEVENLABS_API_KEY,
  modelId = 'eleven_multilingual_v2',
  stability = 0.42,
  similarityBoost = 0.78,
  style = 0.25,
}) {
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY manquant dans .env ou les variables d’environnement.');
  }

  let activeVoice = resolveVoiceId(voiceId);
  const requestTts = (vId) =>
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vId)}/with-timestamps`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: true,
        },
      }),
    });

  let res = await requestTts(activeVoice);
  if ((res.status === 402 || res.status === 404) && activeVoice !== DEFAULT_FREE_VOICE_ID) {
    activeVoice = DEFAULT_FREE_VOICE_ID;
    res = await requestTts(activeVoice);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const audioBuffer = Buffer.from(data.audio_base64, 'base64');
  const alignment = data.normalized_alignment || data.alignment;
  const words = buildWordsFromAlignment(alignment);
  const duration = words.length ? words[words.length - 1].end : 0;

  return { audioBuffer, words, alignment, duration, voiceId: activeVoice };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  const text = args.file ? fs.readFileSync(args.file, 'utf8') : args.text;
  if (!text) {
    console.error('Usage: node voiceover.mjs --text "..." --out out.mp3 [--align words.json] [--voice ID]');
    process.exit(1);
  }
  const outMp3 = args.out || 'voiceover.mp3';
  const outAlign = args.align;
  const result = await synthesizeElevenLabs({
    text,
    voiceId: resolveVoiceId(args.voice || process.env.ELEVENLABS_VOICE_ID),
  });

  fs.mkdirSync(path.dirname(outMp3), { recursive: true });
  fs.writeFileSync(outMp3, result.audioBuffer);

  if (outAlign) {
    fs.mkdirSync(path.dirname(outAlign), { recursive: true });
    fs.writeFileSync(
      outAlign,
      JSON.stringify({ voiceId: result.voiceId, duration: result.duration, words: result.words }, null, 2)
    );
  }
  console.log(`Generated ${outMp3} with voice ${result.voiceId} (${result.duration.toFixed(2)}s, ${result.words.length} words)`);
}
