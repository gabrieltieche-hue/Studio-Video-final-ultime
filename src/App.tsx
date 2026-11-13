/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Loader2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ShortStage } from './components/short/ShortStage';
import {
  BEATS,
  DEFAULT_PLAYBACK_SPEED,
  LOOK_PRESETS,
  LookId,
  SHORT_DURATION,
} from './data/shortSpec';
import { audioEngine } from './engine/audioEngine';
import { clamp, formatClock } from './engine/math';

declare global {
  interface Window {
    __setShortTime?: (nextT: number) => void;
    __setShortLook?: (nextLook: LookId) => void;
    __SHORT_READY?: boolean;
  }
}

export default function App() {
  const isRenderMode =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('renderMode') === '1';

  const [t, setT] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed] = useState(DEFAULT_PLAYBACK_SPEED);
  const [lookId, setLookId] = useState<LookId>('papier');
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [downloadingMp4, setDownloadingMp4] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);

  const tRef = useRef(0);
  const lastRafRef = useRef<number | null>(null);
  const mp4BlobUrlRef = useRef<string | null>(null);
  const mp4FetchPromiseRef = useRef<Promise<string> | null>(null);
  const look = LOOK_PRESETS[lookId];

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const fetchVerifiedMp4BlobUrl = useCallback(async (): Promise<string> => {
    if (mp4BlobUrlRef.current) return mp4BlobUrlRef.current;
    if (mp4FetchPromiseRef.current) return mp4FetchPromiseRef.current;

    mp4FetchPromiseRef.current = (async () => {
      const res = await fetch('/api/download-mp4', { credentials: 'same-origin' });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('video/mp4')) {
        throw new Error('Le serveur vidéo redémarre — réessayez dans 2 secondes.');
      }
      const buf = await res.arrayBuffer();
      const head = new Uint8Array(buf.slice(0, 12));
      const isFtypMp4 =
        buf.byteLength > 200_000 &&
        head[4] === 0x66 &&
        head[5] === 0x74 &&
        head[6] === 0x79 &&
        head[7] === 0x70;
      if (!isFtypMp4) {
        throw new Error('Réponse vidéo invalide (page HTML interceptée). Réessayez.');
      }
      const blobUrl = URL.createObjectURL(new Blob([buf], { type: 'video/mp4' }));
      mp4BlobUrlRef.current = blobUrl;
      return blobUrl;
    })().finally(() => {
      mp4FetchPromiseRef.current = null;
    });

    return mp4FetchPromiseRef.current;
  }, []);

  // Preload voiceover + Bright Corporate Groove (upbeat) + ready MP4 binary on mount
  useEffect(() => {
    if (isRenderMode) {
      window.__setShortTime = (nextT: number) => {
        const clamped = clamp(nextT, 0, SHORT_DURATION);
        tRef.current = clamped;
        setT(clamped);
      };
      window.__setShortLook = (nextLook: LookId) => {
        setLookId(nextLook);
      };
      window.__SHORT_READY = true;
      return;
    }
    void audioEngine.preload();
    fetch('/api/download-mp4/status', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((st: { ready?: boolean } | null) => {
        if (st?.ready) {
          void fetchVerifiedMp4BlobUrl().catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      if (mp4BlobUrlRef.current) {
        URL.revokeObjectURL(mp4BlobUrlRef.current);
        mp4BlobUrlRef.current = null;
      }
    };
  }, [isRenderMode, fetchVerifiedMp4BlobUrl]);

  useEffect(() => {
    audioEngine.setOptions({ musicEnabled, sfxEnabled, voiceEnabled });
  }, [musicEnabled, sfxEnabled, voiceEnabled]);

  useEffect(() => {
    if (!isPlaying || isRenderMode) {
      if (lastRafRef.current !== null) cancelAnimationFrame(lastRafRef.current);
      lastRafRef.current = null;
      audioEngine.stop();
      return;
    }

    let cancelled = false;

    const runLoop = async () => {
      await audioEngine.start(tRef.current, speed);
      if (cancelled) return;

      let prevTs = performance.now();

      const frame = (now: number) => {
        if (cancelled) return;
        const prevT = tRef.current;

        // Lock visual timeline strictly to Web Audio hardware clock to avoid drift
        const synced = audioEngine.getSyncedTime(speed);
        const dt = Math.min(0.1, (now - prevTs) / 1000) * speed;
        prevTs = now;
        let nextT = synced !== null ? synced : prevT + dt;

        if (nextT >= SHORT_DURATION) {
          nextT = 0;
          audioEngine.seekWhilePlaying(0, speed);
        }

        audioEngine.tick(prevT, nextT);
        tRef.current = nextT;
        setT(nextT);
        lastRafRef.current = requestAnimationFrame(frame);
      };

      lastRafRef.current = requestAnimationFrame(frame);
    };

    void runLoop();

    return () => {
      cancelled = true;
      if (lastRafRef.current !== null) cancelAnimationFrame(lastRafRef.current);
      audioEngine.stop();
    };
  }, [isPlaying, speed, isRenderMode]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleSeek = useCallback(
    (nextT: number) => {
      const clamped = clamp(nextT, 0, SHORT_DURATION);
      tRef.current = clamped;
      setT(clamped);
      if (isPlaying) {
        audioEngine.seekWhilePlaying(clamped, speed);
      } else {
        audioEngine.resetTriggersBefore(clamped);
      }
    },
    [isPlaying, speed]
  );

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    tRef.current = 0;
    setT(0);
    audioEngine.resetTriggersBefore(0);
  }, []);

  const triggerBlobSave = useCallback((blobUrl: string) => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'short-interdiction-15-ans-hd.mp4';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadDone(true);
    setTimeout(() => setDownloadDone(false), 3500);
  }, []);

  const handleDownloadMp4 = useCallback(async () => {
    if (downloadingMp4) return;
    setDownloadError(null);

    if (mp4BlobUrlRef.current) {
      triggerBlobSave(mp4BlobUrlRef.current);
      return;
    }

    setDownloadingMp4(true);
    try {
      const blobUrl = await fetchVerifiedMp4BlobUrl();
      triggerBlobSave(blobUrl);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Erreur export MP4');
    } finally {
      setDownloadingMp4(false);
    }
  }, [downloadingMp4, fetchVerifiedMp4BlobUrl, triggerBlobSave]);

  // Keyboard shortcuts (Space: play/pause, Left/Right: scrub 1s)
  useEffect(() => {
    if (isRenderMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(tRef.current + 1.0);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(tRef.current - 1.0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRenderMode, handleTogglePlay, handleSeek]);

  // Pure full-bleed 1080x1920 stage for deterministic MP4 capture & visual QA
  if (isRenderMode) {
    return (
      <div id="short-render-root" className="w-[1080px] h-[1920px] overflow-hidden bg-[#F1EEE6]">
        <ShortStage t={t} look={look} showSafeZones={false} renderMode />
      </div>
    );
  }

  const activeBeat = BEATS.find((b) => t >= b.from && t < b.to) || BEATS[BEATS.length - 1];
  const progressPct = clamp((t / SHORT_DURATION) * 100, 0, 100);
  const displayTime = t / speed;
  const displayDuration = SHORT_DURATION / speed;

  return (
    <div className="min-h-screen bg-[#F6F5F1] text-[#14161B] flex flex-col items-center justify-center px-4 py-3 sm:py-4">
      <main className="w-full max-w-[420px] flex flex-col items-center gap-3">
        {/* Minimal Title Line */}
        <div className="w-full flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <h1
              className="text-base sm:text-lg font-extrabold tracking-tight text-[#14161B] truncate"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Interdire les réseaux avant 15 ans
            </h1>
            <p className="text-xs text-[#5C5F68] tabular-nums">
              1080×1920 · {displayDuration.toFixed(1)} s · Beat {activeBeat.index}/8 ({activeBeat.shortLabel})
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#5C5F68] tabular-nums shrink-0">
            {speed.toFixed(2)}×
          </span>
        </div>

        {/* 9:16 Short Stage Preview sized to stay above the fold */}
        <div className="w-[300px] sm:w-[340px] mx-auto">
          <ShortStage t={t} look={look} showSafeZones={false} />
        </div>

        {/* Transport Bar */}
        <div className="w-full bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-3 flex items-center gap-2.5 shadow-sm">
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Mettre en pause' : 'Lire le Short'}
            className="w-11 h-11 rounded-xl bg-[#14161B] text-white flex items-center justify-center hover:bg-[#258EFF] transition-colors cursor-pointer shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Revenir à 0.0 s"
            className="w-10 h-11 rounded-xl border border-[#E3DED3] bg-white text-[#14161B] flex items-center justify-center hover:bg-[#F6F5F1] transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 flex flex-col gap-1 px-1">
            <label htmlFor="short-scrubber" className="sr-only">
              Position dans la timeline
            </label>
            <input
              id="short-scrubber"
              type="range"
              min={0}
              max={SHORT_DURATION}
              step={0.05}
              value={t}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full cursor-pointer accent-[#258EFF]"
              style={{
                background: `linear-gradient(to right, #258EFF ${progressPct}%, #E3DED3 ${progressPct}%)`,
              }}
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-[#5C5F68] tabular-nums">
              <span>{formatClock(displayTime)}</span>
              <span>{formatClock(displayDuration)}</span>
            </div>
          </div>
        </div>

        {/* Compact Audio Switches + Primary MP4 HD Download Button */}
        <div className="w-full flex flex-col gap-3">
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setVoiceEnabled((v) => !v)}
                aria-pressed={voiceEnabled}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  voiceEnabled
                    ? 'bg-[#258EFF] text-white border-[#258EFF]'
                    : 'bg-[#FCFBF8] text-[#5C5F68] border-[#E3DED3]'
                }`}
              >
                {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                Voix FR
              </button>

              <button
                type="button"
                onClick={() => setMusicEnabled((v) => !v)}
                aria-pressed={musicEnabled}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  musicEnabled
                    ? 'bg-[#14161B] text-white border-[#14161B]'
                    : 'bg-[#FCFBF8] text-[#5C5F68] border-[#E3DED3]'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                Bright Groove
              </button>

              <button
                type="button"
                onClick={() => setSfxEnabled((v) => !v)}
                aria-pressed={sfxEnabled}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  sfxEnabled
                    ? 'bg-[#14161B] text-white border-[#14161B]'
                    : 'bg-[#FCFBF8] text-[#5C5F68] border-[#E3DED3]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                SFX
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadMp4}
            disabled={downloadingMp4}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-70 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
          >
            {downloadingMp4 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Préparation du MP4 HD (1080×1920)…
              </>
            ) : downloadDone ? (
              <>
                <Check className="w-4 h-4" />
                MP4 haute qualité téléchargé
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Télécharger en haute qualité MP4 (1080×1920)
              </>
            )}
          </button>

          {downloadError && (
            <p className="text-xs text-[#DC2626] text-center">{downloadError}</p>
          )}
        </div>
      </main>
    </div>
  );
}
