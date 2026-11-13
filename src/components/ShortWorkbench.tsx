import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  Mic,
  MicOff,
  FileCode2,
  Captions,
} from 'lucide-react';
import {
  BEATS,
  BeatMeta,
  LOOK_PRESETS,
  LookId,
  MUSIC_BEDS,
  MusicBedId,
  SHORT_DURATION,
} from '../data/shortSpec';
import { formatTimecode } from '../engine/math';
import { ShortStage } from './short/ShortStage';

interface ShortWorkbenchProps {
  t: number;
  isPlaying: boolean;
  speed: number;
  lookId: LookId;
  bed: MusicBedId;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  voiceEnabled: boolean;
  showSafeZones: boolean;
  onTogglePlay: () => void;
  onSeek: (nextT: number) => void;
  onReset: () => void;
  onChangeSpeed: (s: number) => void;
  onChangeLook: (id: LookId) => void;
  onChangeBed: (bed: MusicBedId) => void;
  onToggleMusic: () => void;
  onToggleSfx: () => void;
  onToggleVoice: () => void;
  onToggleSafeZones: () => void;
  onJumpBeat: (beat: BeatMeta) => void;
  onDownloadSrt: () => void;
  onDownloadSpec: () => void;
}

export const ShortWorkbench: React.FC<ShortWorkbenchProps> = ({
  t,
  isPlaying,
  speed,
  lookId,
  bed,
  musicEnabled,
  sfxEnabled,
  voiceEnabled,
  showSafeZones,
  onTogglePlay,
  onSeek,
  onReset,
  onChangeSpeed,
  onChangeLook,
  onChangeBed,
  onToggleMusic,
  onToggleSfx,
  onToggleVoice,
  onToggleSafeZones,
  onJumpBeat,
  onDownloadSrt,
  onDownloadSpec,
}) => {
  const look = LOOK_PRESETS[lookId];

  const activeBeat = useMemo(() => {
    return BEATS.find((b) => t >= b.from && t < b.to) || BEATS[BEATS.length - 1];
  }, [t]);

  const effectiveDuration = SHORT_DURATION / speed;

  return (
    <main className="max-w-[1360px] mx-auto px-6 py-7 grid grid-cols-1 lg:grid-cols-[410px_1fr] gap-10 items-start">
      {/* Left Focal Column: 9:16 Player + Transport */}
      <section aria-label="Lecteur Short 9:16" className="w-full max-w-[410px] mx-auto lg:mx-0">
        <ShortStage t={t} look={look} showSafeZones={showSafeZones} />

        {/* Player transport controls */}
        <div className="mt-4 bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Mettre en pause' : 'Lire le Short'}
              className="w-11 h-11 rounded-xl bg-[#14161B] text-white flex items-center justify-center hover:bg-[#258EFF] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#258EFF]"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={onReset}
              aria-label="Revenir à 0.0 s"
              className="w-11 h-11 rounded-xl border border-[#E3DED3] bg-white text-[#14161B] flex items-center justify-center hover:border-[#14161B] transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              <label htmlFor="short-timeline-scrubber" className="sr-only">
                Position dans la timeline
              </label>
              <input
                id="short-timeline-scrubber"
                type="range"
                min={0}
                max={SHORT_DURATION}
                step={0.05}
                value={t}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full accent-[#258EFF] cursor-pointer"
              />
              <div className="flex items-center justify-between text-xs text-[#5C5F68] font-mono tabular-nums mt-0.5">
                <span>{formatTimecode(t / speed)}</span>
                <span>{formatTimecode(effectiveDuration)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onChangeSpeed(speed === 1.08 ? 1.0 : speed === 1.0 ? 1.15 : 1.08)}
              aria-label="Changer la cadence de lecture"
              className="px-3 h-11 rounded-xl border border-[#E3DED3] bg-white text-xs font-mono font-bold text-[#14161B] hover:border-[#258EFF] transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
            >
              {speed.toFixed(2)}×
            </button>
          </div>
        </div>
      </section>

      {/* Right Workbench Column: Active Beat, Look Switcher, Beat Timeline */}
      <section className="min-w-0 space-y-7">
        {/* Header block */}
        <div className="border-b border-[#E3DED3] pb-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C5F68]">
            <span>Format 1080×1920</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{effectiveDuration.toFixed(1)} s (8 beats)</span>
            <span aria-hidden="true">·</span>
            <span>Voix FR ElevenLabs</span>
            <span aria-hidden="true">·</span>
            <span>Nappe Bright Groove (upbeat)</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#14161B] mt-2 text-balance"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Interdire les réseaux aux moins de 15 ans
          </h1>
          <p className="text-sm text-[#5C5F68] mt-2 max-w-2xl leading-relaxed">
            Short viral en motion design calibré sur <strong className="font-semibold text-[#14161B]">@melvynxdev</strong> :
            hook verrou parental en 2 actes, voix off française ElevenLabs synchronisée au mot près, sous-titres en phrase unifiée et nappe studio douce.
          </p>
        </div>

        {/* Look, Music Bed & Audio Controls */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 border-b border-[#E3DED3] pb-6">
          <div>
            <div className="text-xs font-semibold text-[#5C5F68] mb-2">
              Style (assets/looks.json)
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-[#EAE7DF] rounded-xl">
              {(Object.keys(LOOK_PRESETS) as LookId[]).map((id) => {
                const active = lookId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeLook(id)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      active ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm' : 'text-[#5C5F68] hover:text-[#14161B]'
                    }`}
                  >
                    {LOOK_PRESETS[id].label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#5C5F68] mt-2">{look.subtitle}</p>
          </div>

          <div>
            <div className="text-xs font-semibold text-[#5C5F68] mb-2">
              Audio Studio (Voix ElevenLabs &amp; 5 Nappes)
            </div>
            <div className="flex flex-col items-start gap-2.5">
              <div className="w-full max-w-sm">
                <label htmlFor="music-bed-select" className="sr-only">
                  Nappe musicale de fond
                </label>
                <select
                  id="music-bed-select"
                  value={bed}
                  onChange={(e) => onChangeBed(e.target.value as MusicBedId)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E3DED3] bg-[#FCFBF8] text-xs font-semibold text-[#14161B] focus:outline-2 focus:outline-[#258EFF] cursor-pointer"
                >
                  {MUSIC_BEDS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}{m.preferred ? ' · Par défaut' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleVoice}
                  aria-pressed={voiceEnabled}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    voiceEnabled
                      ? 'bg-[#258EFF] border-[#258EFF] text-white'
                      : 'bg-transparent border-[#E3DED3] text-[#5C5F68]'
                  }`}
                >
                  {voiceEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  Voix FR (ElevenLabs)
                </button>

                <button
                  type="button"
                  onClick={onToggleMusic}
                  aria-pressed={musicEnabled}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    musicEnabled
                      ? 'bg-[#FCFBF8] border-[#14161B] text-[#14161B]'
                      : 'bg-transparent border-[#E3DED3] text-[#5C5F68]'
                  }`}
                >
                  {musicEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  Nappe douce
                </button>

                <button
                  type="button"
                  onClick={onToggleSfx}
                  aria-pressed={sfxEnabled}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    sfxEnabled
                      ? 'bg-[#FCFBF8] border-[#14161B] text-[#14161B]'
                      : 'bg-transparent border-[#E3DED3] text-[#5C5F68]'
                  }`}
                >
                  SFX
                </button>

                <button
                  type="button"
                  onClick={onToggleSafeZones}
                  aria-pressed={showSafeZones}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    showSafeZones
                      ? 'bg-[#258EFF] border-[#258EFF] text-white'
                      : 'bg-transparent border-[#E3DED3] text-[#5C5F68]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Zones sûres
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active beat focus readout */}
        <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C5F68]">
            <span className="font-semibold text-[#258EFF]">
              Beat {activeBeat.index} sur {BEATS.length} · {activeBeat.viewLabel} (seam {activeBeat.seam})
            </span>
            <span className="font-mono tabular-nums">
              {activeBeat.from.toFixed(1)}s – {activeBeat.to.toFixed(1)}s
            </span>
          </div>
          <p className="text-base font-semibold text-[#14161B] mt-2 leading-snug">
            « {activeBeat.spokenLine} »
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5C5F68] mt-3">
            <span>Mécanique : {activeBeat.mechanism}</span>
            <span aria-hidden="true">·</span>
            <span>Rétention : {activeBeat.retentionLever}</span>
          </div>
        </div>

        {/* Interactive 8-Beat Timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-lg font-bold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Séquençage des 8 Beats
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDownloadSrt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] text-xs font-medium text-[#14161B] hover:border-[#258EFF] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Captions className="w-3.5 h-3.5" />
                Sous-titres .srt
              </button>
              <button
                type="button"
                onClick={onDownloadSpec}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] text-xs font-medium text-[#14161B] hover:border-[#258EFF] transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                spec.js
              </button>
            </div>
          </div>

          <div className="border border-[#E3DED3] rounded-2xl bg-[#FCFBF8] divide-y divide-[#E3DED3] overflow-hidden">
            {BEATS.map((beat) => {
              const isCurrent = activeBeat.id === beat.id;
              return (
                <button
                  key={beat.id}
                  type="button"
                  onClick={() => onJumpBeat(beat)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                    isCurrent ? 'bg-[#E6F0FD]/65' : 'hover:bg-[#F6F5F1]'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-3.5">
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 tabular-nums ${
                        isCurrent ? 'bg-[#258EFF] text-white' : 'bg-[#F1EEE6] text-[#14161B]'
                      }`}
                    >
                      0{beat.index}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#14161B] truncate">
                        {beat.title}
                      </div>
                      <div className="text-xs text-[#5C5F68] truncate mt-0.5">
                        {beat.viewLabel} · {beat.sfxNotes.join(' · ')}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#5C5F68] tabular-nums whitespace-nowrap shrink-0">
                    {beat.from.toFixed(1)}s – {beat.to.toFixed(1)}s
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
};
