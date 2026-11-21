import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { sanitizeScriptText } from '../engine/batchShortBuilder';
import { normalizeFrenchForSpeech } from '../engine/frenchSpeechNormalizer';
import {
  parseEdgeWordBoundariesToWords,
  parseVerboseWordsToWhisperWords,
  realignWordsToSourceBeatText,
  type VoiceEngineProvider,
  type VoiceStudioConfig,
} from '../engine/voiceAlignment';
import type { WhisperWord } from '../types/studio';
import {
  applyVoiceSpeedMp3,
  concatBeatMp3sWithPadding,
  probeAudioDurationSec,
} from './batchRenderer';
import { STORAGE_DIR, writeJsonAtomic } from './storageManager';

export const VOICE_CONFIG_FILE = path.join(STORAGE_DIR, 'voice-config.json');

export interface EdgeVoiceOption {
  id: string;
  label: string;
  gender: 'male' | 'female';
  description: string;
}

export const EDGE_FR_VOICES: EdgeVoiceOption[] = [
  {
    id: 'fr-FR-RemyMultilingualNeural',
    label: 'Rémy Neural FR',
    gender: 'male',
    description: 'Voix masculine claire, naturelle et dynamique (par défaut)',
  },
  {
    id: 'fr-FR-HenriNeural',
    label: 'Henri Neural FR',
    gender: 'male',
    description: 'Voix masculine posée et grave style documentaire',
  },
  {
    id: 'fr-FR-VivienneMultilingualNeural',
    label: 'Vivienne Neural FR',
    gender: 'female',
    description: 'Voix féminine fluide et expressive',
  },
  {
    id: 'fr-FR-DeniseNeural',
    label: 'Denise Neural FR',
    gender: 'female',
    description: 'Voix éditoriale posée et articulée',
  },
];

export interface VoiceStudioProbeResult {
  reachable: boolean;
  url: string;
  models: string[];
  voices: Array<{ id: string; name: string }>;
  profiles: Array<{ id: string; name: string }>;
  error?: string;
}

export interface UnifiedVoiceResult {
  providerUsed: 'voicestudio' | 'edge_neural' | 'elevenlabs' | 'synthetic';
  voiceUsed: string;
  voiceMp3Path?: string;
  audioTrackUrl?: string;
  words: WhisperWord[];
  durationSec: number;
}

const DEFAULT_ELEVENLABS_VOICE_ID = 'nPczCjzI2devNBz1zQrb';

export function getDefaultVoiceConfig(): VoiceStudioConfig {
  const envEngine = (process.env.VOICE_ENGINE || 'auto').trim().toLowerCase();
  const engine: VoiceEngineProvider =
    envEngine === 'voicestudio' || envEngine === 'edge_neural' || envEngine === 'elevenlabs'
      ? envEngine
      : 'auto';

  return {
    engine,
    voicestudioUrl: (process.env.VOICESTUDIO_URL || 'http://127.0.0.1:8787').replace(/\/+$/, ''),
    voicestudioModel: (process.env.VOICESTUDIO_MODEL || 'omnivoice').trim() || 'omnivoice',
    voicestudioVoice: (process.env.VOICESTUDIO_VOICE || 'default').trim() || 'default',
    voicestudioLanguage: (process.env.VOICESTUDIO_LANGUAGE || 'fr').trim() || 'fr',
    voicestudioInstruct: (
      process.env.VOICESTUDIO_INSTRUCT || 'Ton direct, clair, posé et rythmé en français'
    ).trim(),
    edgeVoice: (process.env.EDGE_TTS_VOICE || 'fr-FR-RemyMultilingualNeural').trim(),
  };
}

export function readVoiceConfig(): VoiceStudioConfig {
  const defaults = getDefaultVoiceConfig();
  if (!fs.existsSync(VOICE_CONFIG_FILE)) return defaults;
  try {
    const parsed = JSON.parse(fs.readFileSync(VOICE_CONFIG_FILE, 'utf-8')) as Partial<VoiceStudioConfig>;
    return {
      ...defaults,
      ...parsed,
      voicestudioUrl: (parsed.voicestudioUrl || defaults.voicestudioUrl).replace(/\/+$/, ''),
    };
  } catch {
    return defaults;
  }
}

export function saveVoiceConfig(patch: Partial<VoiceStudioConfig>): VoiceStudioConfig {
  const current = readVoiceConfig();
  const next: VoiceStudioConfig = {
    engine:
      patch.engine === 'voicestudio' ||
      patch.engine === 'edge_neural' ||
      patch.engine === 'elevenlabs' ||
      patch.engine === 'auto'
        ? patch.engine
        : current.engine,
    voicestudioUrl: (patch.voicestudioUrl ?? current.voicestudioUrl).trim().replace(/\/+$/, ''),
    voicestudioModel: (patch.voicestudioModel ?? current.voicestudioModel).trim() || 'omnivoice',
    voicestudioVoice: (patch.voicestudioVoice ?? current.voicestudioVoice).trim() || 'default',
    voicestudioLanguage: (patch.voicestudioLanguage ?? current.voicestudioLanguage).trim() || 'fr',
    voicestudioInstruct: (patch.voicestudioInstruct ?? current.voicestudioInstruct).trim(),
    edgeVoice: (patch.edgeVoice ?? current.edgeVoice).trim() || 'fr-FR-RemyMultilingualNeural',
  };
  writeJsonAtomic(VOICE_CONFIG_FILE, next);
  return next;
}

function buildVoiceStudioHeaders(apiKey?: string): Record<string, string> {
  const key = (apiKey ?? process.env.VOICESTUDIO_API_KEY ?? '').trim();
  const headers: Record<string, string> = {};
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export async function probeVoiceStudio(
  urlOverride?: string,
  apiKeyOverride?: string
): Promise<VoiceStudioProbeResult> {
  const cfg = readVoiceConfig();
  const baseUrl = (urlOverride || cfg.voicestudioUrl || 'http://127.0.0.1:8787').replace(/\/+$/, '');
  const headers = buildVoiceStudioHeaders(apiKeyOverride);

  try {
    const modelsRes = await fetch(`${baseUrl}/v1/models`, {
      headers,
      signal: AbortSignal.timeout(2500),
    });

    if (!modelsRes.ok) {
      return {
        reachable: false,
        url: baseUrl,
        models: [],
        voices: [],
        profiles: [],
        error: `HTTP ${modelsRes.status} sur /v1/models`,
      };
    }

    const modelsData = (await modelsRes.json().catch(() => ({}))) as {
      data?: Array<{ id?: string }>;
    };
    const models = (modelsData.data || []).map((m) => String(m.id || '')).filter(Boolean);

    let voices: Array<{ id: string; name: string }> = [];
    let profiles: Array<{ id: string; name: string }> = [];

    try {
      const voicesRes = await fetch(`${baseUrl}/v1/audio/voices`, {
        headers,
        signal: AbortSignal.timeout(2500),
      });
      if (voicesRes.ok) {
        const vJson = (await voicesRes.json().catch(() => ({}))) as {
          voices?: Array<{ id?: string; voice_id?: string; name?: string }>;
        };
        voices = (vJson.voices || [])
          .map((v) => ({
            id: String(v.id || v.voice_id || v.name || ''),
            name: String(v.name || v.id || v.voice_id || ''),
          }))
          .filter((v) => Boolean(v.id));
      }
    } catch {
      // optional extension endpoint
    }

    try {
      const profRes = await fetch(`${baseUrl}/profiles`, {
        headers,
        signal: AbortSignal.timeout(2500),
      });
      if (profRes.ok) {
        const pJson = (await profRes.json().catch(() => ([]))) as
          | Array<{ id?: string; name?: string }>
          | { profiles?: Array<{ id?: string; name?: string }> };
        const arr = Array.isArray(pJson) ? pJson : pJson.profiles || [];
        profiles = arr
          .map((p) => ({ id: String(p.id || p.name || ''), name: String(p.name || p.id || '') }))
          .filter((p) => Boolean(p.id));
      }
    } catch {
      // optional profiles endpoint
    }

    return {
      reachable: true,
      url: baseUrl,
      models: models.length > 0 ? models : ['omnivoice', 'voxcpm2', 'cosyvoice', 'kittentts'],
      voices,
      profiles,
    };
  } catch (err) {
    return {
      reachable: false,
      url: baseUrl,
      models: [],
      voices: [],
      profiles: [],
      error: err instanceof Error ? err.message : 'Serveur VoiceStudio inaccessible',
    };
  }
}

async function transcribeWithVoiceStudio(
  baseUrl: string,
  headers: Record<string, string>,
  audioPath: string,
  language: string
): Promise<Array<{ word?: string; text?: string; start?: number; end?: number }> | undefined> {
  try {
    const fileBuf = fs.readFileSync(audioPath);
    const form = new FormData();
    form.append('file', new Blob([fileBuf], { type: 'audio/mpeg' }), path.basename(audioPath));
    form.append('model', 'whisper-1');
    form.append('language', language || 'fr');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');

    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      words?: Array<{ word?: string; text?: string; start?: number; end?: number }>;
    };
    return Array.isArray(json.words) && json.words.length > 0 ? json.words : undefined;
  } catch {
    return undefined;
  }
}

export async function synthesizeWithVoiceStudio(params: {
  projectDir: string;
  fullText: string;
  speed: number;
  voiceFilename: string;
  config: VoiceStudioConfig;
}): Promise<UnifiedVoiceResult | null> {
  const baseUrl = (params.config.voicestudioUrl || '').replace(/\/+$/, '');
  if (!baseUrl) return null;

  const headers = {
    'Content-Type': 'application/json',
    ...buildVoiceStudioHeaders(),
  };

  try {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: params.config.voicestudioModel || 'omnivoice',
        input: params.fullText,
        voice: params.config.voicestudioVoice || 'default',
        response_format: 'mp3',
        speed: 1.0,
        language: params.config.voicestudioLanguage || 'fr',
        instruct: params.config.voicestudioInstruct || undefined,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      console.warn(`VoiceStudio /v1/audio/speech failed (${res.status}): ${msg.slice(0, 200)}`);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 1024) return null;

    fs.mkdirSync(params.projectDir, { recursive: true });
    const rawMp3Path = path.join(params.projectDir, `raw-${params.voiceFilename}`);
    const voiceMp3Path = path.join(params.projectDir, params.voiceFilename);
    fs.writeFileSync(rawMp3Path, buf);

    const actualDuration = applyVoiceSpeedMp3(rawMp3Path, voiceMp3Path, params.speed);
    fs.rmSync(rawMp3Path, { force: true });

    const verboseWords = await transcribeWithVoiceStudio(
      baseUrl,
      buildVoiceStudioHeaders(),
      voiceMp3Path,
      params.config.voicestudioLanguage || 'fr'
    );
    const words = parseVerboseWordsToWhisperWords(verboseWords, params.fullText, actualDuration);
    const lastEnd = words.length > 0 ? words[words.length - 1].end : actualDuration;
    const durationSec = Number(Math.max(actualDuration + 0.35, lastEnd + 0.5).toFixed(2));

    return {
      providerUsed: 'voicestudio',
      voiceUsed: `${params.config.voicestudioModel}:${params.config.voicestudioVoice}`,
      voiceMp3Path,
      audioTrackUrl: `/storage/projects/${path.basename(params.projectDir)}/${params.voiceFilename}`,
      words,
      durationSec,
    };
  } catch (err) {
    console.warn(
      'VoiceStudio unreachable, falling back:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export function sanitizeTextForEdgeSsml(text: string): string {
  return String(text || '')
    .replace(/&/g, ' et ')
    .replace(/[<>]/g, ' ')
    .replace(/["`]/g, "'")
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function synthesizeWithEdgeNeural(params: {
  projectDir: string;
  fullText: string;
  speed: number;
  voiceFilename: string;
  edgeVoice?: string;
}): Promise<UnifiedVoiceResult | null> {
  const selectedVoice = params.edgeVoice || 'fr-FR-RemyMultilingualNeural';
  const tts = new MsEdgeTTS();
  const ssmlSafeText = sanitizeTextForEdgeSsml(params.fullText);

  try {
    await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    });

    const { audioStream, metadataStream } = tts.toStream(ssmlSafeText);

    const audioChunks: Buffer[] = [];
    const metaChunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Edge Neural TTS stream timeout (90s)'));
      }, 90_000);

      let audioEnded = false;
      let metaEnded = !metadataStream;
      let postAudioGraceId: NodeJS.Timeout | undefined;

      const finishIfDone = () => {
        if (audioEnded && metaEnded) {
          clearTimeout(timeoutId);
          if (postAudioGraceId) clearTimeout(postAudioGraceId);
          resolve();
        }
      };

      const markMetaDone = () => {
        metaEnded = true;
        finishIfDone();
      };

      audioStream.on('data', (chunk: Buffer) => audioChunks.push(Buffer.from(chunk)));
      audioStream.once('end', () => {
        audioEnded = true;
        finishIfDone();
        if (!metaEnded) {
          postAudioGraceId = setTimeout(markMetaDone, 800);
        }
      });
      audioStream.once('error', (err: Error) => {
        clearTimeout(timeoutId);
        if (postAudioGraceId) clearTimeout(postAudioGraceId);
        reject(err);
      });

      if (metadataStream) {
        metadataStream.on('data', (chunk: Buffer) => metaChunks.push(Buffer.from(chunk)));
        metadataStream.once('end', markMetaDone);
        metadataStream.once('close', markMetaDone);
        metadataStream.once('error', markMetaDone);
      }
    });

    const audioBuf = Buffer.concat(audioChunks);
    if (audioBuf.byteLength < 1024) {
      return null;
    }

    fs.mkdirSync(params.projectDir, { recursive: true });
    const rawMp3Path = path.join(params.projectDir, `raw-${params.voiceFilename}`);
    const voiceMp3Path = path.join(params.projectDir, params.voiceFilename);
    fs.writeFileSync(rawMp3Path, audioBuf);

    const actualDuration = applyVoiceSpeedMp3(rawMp3Path, voiceMp3Path, params.speed);
    fs.rmSync(rawMp3Path, { force: true });

    const metaText = Buffer.concat(metaChunks).toString('utf-8');
    const words = parseEdgeWordBoundariesToWords(
      metaText,
      ssmlSafeText,
      params.speed,
      actualDuration
    );
    const lastEnd = words.length > 0 ? words[words.length - 1].end : actualDuration;
    const durationSec = Number(Math.max(actualDuration + 0.4, lastEnd + 0.5).toFixed(2));

    return {
      providerUsed: 'edge_neural',
      voiceUsed: selectedVoice,
      voiceMp3Path,
      audioTrackUrl: `/storage/projects/${path.basename(params.projectDir)}/${params.voiceFilename}`,
      words,
      durationSec,
    };
  } catch (err) {
    console.warn('Edge Neural TTS failed:', err instanceof Error ? err.message : err);
    return null;
  } finally {
    try {
      tts.close();
    } catch {
      // ignore close errors
    }
  }
}

async function synthesizeWithElevenLabsFast(params: {
  projectDir: string;
  fullText: string;
  speed: number;
  voiceFilename: string;
}): Promise<UnifiedVoiceResult | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;

  const requestedVoice =
    process.env.ELEVENLABS_VOICE_ID?.trim() &&
    /^[A-Za-z0-9]{15,32}$/.test(process.env.ELEVENLABS_VOICE_ID.trim())
      ? process.env.ELEVENLABS_VOICE_ID.trim()
      : DEFAULT_ELEVENLABS_VOICE_ID;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(requestedVoice)}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: params.fullText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.44, similarity_boost: 0.78, style: 0.22 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 1024) return null;

    fs.mkdirSync(params.projectDir, { recursive: true });
    const rawMp3Path = path.join(params.projectDir, `raw-${params.voiceFilename}`);
    const voiceMp3Path = path.join(params.projectDir, params.voiceFilename);
    fs.writeFileSync(rawMp3Path, buf);
    const actualDuration = applyVoiceSpeedMp3(rawMp3Path, voiceMp3Path, params.speed);
    fs.rmSync(rawMp3Path, { force: true });

    const words = parseEdgeWordBoundariesToWords('', params.fullText, params.speed, actualDuration);
    const lastEnd = words.length > 0 ? words[words.length - 1].end : actualDuration;
    return {
      providerUsed: 'elevenlabs',
      voiceUsed: requestedVoice,
      voiceMp3Path,
      audioTrackUrl: `/storage/projects/${path.basename(params.projectDir)}/${params.voiceFilename}`,
      words,
      durationSec: Number(Math.max(actualDuration + 0.4, lastEnd + 0.5).toFixed(2)),
    };
  } catch {
    return null;
  }
}

export async function synthesizeVoiceoverUnified(params: {
  projectDir: string;
  fullText: string;
  speed: number;
  voiceFilename?: string;
}): Promise<UnifiedVoiceResult> {
  const cfg = readVoiceConfig();
  const cleanText = sanitizeScriptText(params.fullText).slice(0, 1800);
  const voiceFilename = params.voiceFilename || 'voice_v1.mp3';
  const clampedSpeed = Math.min(1.25, Math.max(0.95, params.speed || 1.10));

  if (cfg.engine === 'voicestudio' || cfg.engine === 'auto') {
    const probe = await probeVoiceStudio(cfg.voicestudioUrl);
    if (probe.reachable) {
      const vsResult = await synthesizeWithVoiceStudio({
        projectDir: params.projectDir,
        fullText: cleanText,
        speed: clampedSpeed,
        voiceFilename,
        config: cfg,
      });
      if (vsResult) return vsResult;
    }
  }

  if (cfg.engine === 'elevenlabs') {
    const elResult = await synthesizeWithElevenLabsFast({
      projectDir: params.projectDir,
      fullText: cleanText,
      speed: clampedSpeed,
      voiceFilename,
    });
    if (elResult) return elResult;
  }

  // Built-in reliable zero-quota neural French TTS (msedge-tts)
  const edgeResult = await synthesizeWithEdgeNeural({
    projectDir: params.projectDir,
    fullText: cleanText,
    speed: clampedSpeed,
    voiceFilename,
    edgeVoice: cfg.edgeVoice,
  });
  if (edgeResult) return edgeResult;

  // Last-resort secondary female voice attempt if primary voice errored
  if (cfg.edgeVoice !== 'fr-FR-HenriNeural') {
    const backupEdge = await synthesizeWithEdgeNeural({
      projectDir: params.projectDir,
      fullText: cleanText,
      speed: clampedSpeed,
      voiceFilename,
      edgeVoice: 'fr-FR-HenriNeural',
    });
    if (backupEdge) return backupEdge;
  }

  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const estDuration = Math.max(16, Math.round((wordCount / (2.55 * clampedSpeed)) * 10) / 10);
  const words = parseEdgeWordBoundariesToWords('', cleanText, clampedSpeed, estDuration);
  return {
    providerUsed: 'synthetic',
    voiceUsed: 'synthetic',
    words,
    durationSec: estDuration,
  };
}

export interface BeatVoiceSynthesisResult extends UnifiedVoiceResult {
  beatWindows: Array<{ from: number; to: number }>;
}

/**
 * Beat-by-beat neural voice synthesis pipeline:
 * 1) Applies `normalizeFrenchForSpeech` strictly to TTS input (leaving subtitle punctuation pristine)
 * 2) Synthesizes & trims (`-48dB`) each beat separately with `atempo=1.100`
 * 3) Measures real `ffprobe` MP3 duration per beat & realigns words onto punctuated source tokens
 * 4) Concatenates beats with crisp `0.08s` breath gaps -> 0.00s cumulative drift
 */
export async function synthesizeVoiceoverByBeats(params: {
  projectDir: string;
  beats: Array<{ id: string; spokenLine: string }>;
  speed: number;
  voiceFilename?: string;
}): Promise<BeatVoiceSynthesisResult> {
  if (!params.beats || params.beats.length === 0) {
    throw new Error('Aucun beat à synthétiser.');
  }

  fs.mkdirSync(params.projectDir, { recursive: true });
  const beatsWorkDir = path.join(params.projectDir, '.voice_beats_tmp');
  fs.mkdirSync(beatsWorkDir, { recursive: true });

  const voiceFilename = params.voiceFilename || 'voice_v1.mp3';
  const finalVoicePath = path.join(params.projectDir, voiceFilename);
  const clampedSpeed = Math.min(1.25, Math.max(0.95, params.speed || 1.10));

  const beatMp3Paths: string[] = [];
  const rawBeatOutputs: Array<{
    sourceText: string;
    rawWords: WhisperWord[];
    measuredDur: number;
    providerUsed: UnifiedVoiceResult['providerUsed'];
    voiceUsed: string;
  }> = [];

  try {
    for (let i = 0; i < params.beats.length; i++) {
      const beat = params.beats[i];
      const sourceText = sanitizeScriptText(beat.spokenLine);
      const speechText = normalizeFrenchForSpeech(sourceText);
      const beatFile = `beat_${String(i + 1).padStart(2, '0')}.mp3`;

      const res = await synthesizeVoiceoverUnified({
        projectDir: beatsWorkDir,
        fullText: speechText,
        speed: clampedSpeed,
        voiceFilename: beatFile,
      });

      if (!res.voiceMp3Path || !fs.existsSync(res.voiceMp3Path) || res.providerUsed === 'synthetic') {
        throw new Error(`Synthèse vocale échouée sur le beat ${i + 1} ("${sourceText.slice(0, 48)}").`);
      }

      const measuredDur = probeAudioDurationSec(res.voiceMp3Path, res.durationSec);
      beatMp3Paths.push(res.voiceMp3Path);
      rawBeatOutputs.push({
        sourceText,
        rawWords: res.words,
        measuredDur,
        providerUsed: res.providerUsed,
        voiceUsed: res.voiceUsed,
      });
    }

    const { totalDurationSec, beatWindows } = concatBeatMp3sWithPadding(
      beatMp3Paths,
      finalVoicePath,
      0.08
    );

    const alignedWords: WhisperWord[] = [];
    for (let i = 0; i < rawBeatOutputs.length; i++) {
      const bOut = rawBeatOutputs[i];
      const win = beatWindows[i];
      const realigned = realignWordsToSourceBeatText({
        rawBeatWords: bOut.rawWords,
        sourceBeatText: bOut.sourceText,
        beatStartOffsetSec: win.from,
        beatDurationSec: bOut.measuredDur,
        idPrefix: `b${i + 1}`,
      });
      alignedWords.push(...realigned);
    }

    const lastOut = rawBeatOutputs[rawBeatOutputs.length - 1];
    return {
      providerUsed: lastOut.providerUsed,
      voiceUsed: lastOut.voiceUsed,
      voiceMp3Path: finalVoicePath,
      audioTrackUrl: `/storage/projects/${path.basename(params.projectDir)}/${voiceFilename}`,
      words: alignedWords,
      durationSec: Number(Math.max(totalDurationSec + 0.15, beatWindows[beatWindows.length - 1]?.to || totalDurationSec).toFixed(2)),
      beatWindows,
    };
  } finally {
    fs.rmSync(beatsWorkDir, { recursive: true, force: true });
  }
}

export async function previewVoiceSample(sampleText?: string): Promise<{
  providerUsed: string;
  voiceUsed: string;
  audioDataUrl: string;
  durationSec: number;
}> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-preview-'));
  try {
    const text =
      normalizeFrenchForSpeech(
        sanitizeScriptText(
          sampleText ||
            'Voici un aperçu net de la nouvelle voix studio en français, rapide, claire et prête pour tes Shorts.'
        )
      ) || 'Aperçu de la voix studio.';
    const res = await synthesizeVoiceoverUnified({
      projectDir: tmpDir,
      fullText: text,
      speed: 1.10,
      voiceFilename: 'preview.mp3',
    });
    if (!res.voiceMp3Path || !fs.existsSync(res.voiceMp3Path)) {
      throw new Error('Impossible de générer l’échantillon audio.');
    }
    const base64 = fs.readFileSync(res.voiceMp3Path).toString('base64');
    return {
      providerUsed: res.providerUsed,
      voiceUsed: res.voiceUsed,
      audioDataUrl: `data:audio/mpeg;base64,${base64}`,
      durationSec: probeAudioDurationSec(res.voiceMp3Path, res.durationSec),
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
