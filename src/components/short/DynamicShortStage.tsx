import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCaptionChunks,
  clamp,
  getActiveCaptionChunk,
  seg,
  spring,
  type WordCue,
} from '../../engine/math';
import { buildDynamicBeatsFromProject } from '../../engine/transcriptUtils';
import { CREATOR_PROFILE, type LookPreset } from '../../data/shortSpec';
import type { ShortProject } from '../../types/studio';

interface DynamicShortStageProps {
  project: ShortProject;
  t: number;
  look: LookPreset;
  showSafeZones: boolean;
}

export const DynamicShortStage: React.FC<DynamicShortStageProps> = ({
  project,
  t,
  look,
  showSafeZones,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.32);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / 1080);
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const beats = useMemo(() => buildDynamicBeatsFromProject(project), [project]);
  const activeBeat =
    beats.find((b) => t >= b.from && t < b.to) || beats[beats.length - 1];

  const wordCues: WordCue[] = useMemo(
    () =>
      (project.transcript || [])
        .filter((w) => !w.isCut)
        .map((w) => ({
          text: w.word,
          start: w.start,
          end: w.end,
          emph: w.word.length >= 7 || /\d|%/.test(w.word),
        })),
    [project.transcript]
  );

  const chunks = useMemo(() => buildCaptionChunks(wordCues, 4, 24), [wordCues]);
  const activeChunk = getActiveCaptionChunk(t, chunks, []);

  const beatLocalT = Math.max(0, t - activeBeat.from);
  const beatSpan = Math.max(0.5, activeBeat.to - activeBeat.from);
  const enter = activeBeat.index === 1 && beatLocalT < 0.05 ? 1 : spring(beatLocalT, 12);
  const cardOpacity =
    activeBeat.index === 1 && beatLocalT < 0.05 ? 1 : 0.8 + 0.2 * seg(beatLocalT, 0, 0.2);
  const progress = clamp((t / Math.max(1, project.duration || 45)) * 100, 0, 100);
  const beatProgress = clamp((beatLocalT / beatSpan) * 100, 0, 100);

  return (
    <div
      ref={containerRef}
      data-testid="dynamic-short-stage"
      className="relative w-full h-full aspect-[9/16] rounded-[20px] overflow-hidden border border-[#E3DED3] bg-[#F1EEE6] select-none"
    >
      <div
        style={{
          width: '1080px',
          height: '1920px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: look.paper,
        }}
        className="relative overflow-hidden"
      >
        {look.grain && <div className="absolute inset-0 paper-grain opacity-85 pointer-events-none" />}

        {/* Subtle ambient blue aura */}
        <div
          className="absolute w-[820px] h-[820px] rounded-full blur-[36px] pointer-events-none"
          style={{
            left: `${(130 + Math.sin(t * 0.45) * 280).toFixed(1)}px`,
            top: `${(-60 + Math.cos(t * 0.35) * 200).toFixed(1)}px`,
            background:
              'radial-gradient(circle, rgba(37,142,255,0.20) 0%, rgba(96,165,250,0.08) 45%, rgba(37,142,255,0) 72%)',
          }}
        />

        {/* Top Editorial Meta Strip */}
        <div className="relative z-20 px-[64px] pt-[120px] flex items-center justify-between text-[#5C5F68]">
          <div className="flex items-center gap-[16px]">
            <span
              className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center text-[24px] font-extrabold text-white"
              style={{ backgroundColor: look.accent, fontFamily: look.fontDisplay }}
            >
              {CREATOR_PROFILE.initial}
            </span>
            <div>
              <div className="text-[28px] font-bold text-[#14161B] leading-tight">
                {project.topicCategory || 'Studio Short'}
              </div>
              <div className="text-[22px] font-mono text-[#5C5F68]">
                {project.currentVersion} · Beat {activeBeat.index}/{beats.length}
              </div>
            </div>
          </div>

          <div className="text-[24px] font-mono font-bold text-[#14161B] tabular-nums">
            {t.toFixed(1)}s / {(project.duration || 45).toFixed(1)}s
          </div>
        </div>

        {/* Main Motion Card */}
        <div
          className="relative z-20 mx-[64px] mt-[56px] rounded-[36px] border-2 p-[56px] shadow-xl"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            transform: `translateY(${((1 - enter) * 42).toFixed(1)}px) scale(${(0.95 + enter * 0.05).toFixed(3)})`,
            opacity: cardOpacity,
          }}
        >
          <div className="flex items-center justify-between mb-[28px]">
            <span
              className="text-[26px] font-mono font-bold uppercase tracking-[0.08em]"
              style={{ color: look.accent }}
            >
              {activeBeat.screenLabel}
            </span>
            <span className="text-[24px] font-mono text-[#5C5F68] tabular-nums">
              {Math.round(beatProgress)}%
            </span>
          </div>

          <h2
            className="text-[64px] font-extrabold leading-[1.08] tracking-tight mb-[32px]"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            {activeBeat.index === 1 ? project.title : activeBeat.title}
          </h2>

          <p className="text-[36px] leading-[1.42] font-medium text-[#5C5F68]">
            {activeBeat.spokenLine || project.hookText || 'Aperçu du scénario en cours.'}
          </p>

          {/* Beat Progress Gauge */}
          <div className="mt-[44px] h-[12px] w-full rounded-full bg-[#EAE7DF] overflow-hidden">
            <div
              className="h-full rounded-full transition-none"
              style={{
                width: `${progress.toFixed(1)}%`,
                backgroundColor: look.accent,
              }}
            />
          </div>
        </div>

        {/* Unified 4-word Captions Block */}
        {activeChunk && (
          <div
            className="absolute inset-x-0 z-30 flex justify-center px-[56px] pointer-events-none"
            style={{ top: '1120px' }}
          >
            <div
              className="px-[34px] py-[18px] rounded-[22px] shadow-lg flex flex-wrap items-center justify-center gap-x-[14px]"
              style={{
                backgroundColor: look.ink,
              }}
            >
              {activeChunk.words.map((w, idx) => {
                const isSpoken = idx === activeChunk.activeIndex;
                return (
                  <span
                    key={`${w.text}-${idx}`}
                    className="text-[46px] font-extrabold leading-tight"
                    style={{
                      fontFamily: look.fontDisplay,
                      color: isSpoken ? look.accent : '#FFFFFF',
                    }}
                  >
                    {w.text}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Editorial Context Card */}
        <div
          className="absolute inset-x-[64px] bottom-[150px] z-20 rounded-[28px] border p-[40px]"
          style={{
            backgroundColor: '#14161B',
            borderColor: '#2A2E37',
          }}
        >
          <div className="text-[22px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-[12px]">
            {project.mode === 'split_screen_clips' ? 'Zone Rush Facecam (9:16)' : 'Contexte & Sources'}
          </div>
          <div className="text-[32px] font-bold text-white leading-snug line-clamp-2">
            {project.hookText || project.title}
          </div>
        </div>

        {/* Safe Zones Overlay */}
        {showSafeZones && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-[220px] bg-red-500/18 border-b-2 border-dashed border-red-500 flex items-end justify-center pb-[18px]">
              <span className="text-[28px] font-bold text-red-700 bg-white/90 px-[16px] py-[4px] rounded-[8px]">
                Zone exclue haut · 220 px
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[420px] bg-red-500/18 border-t-2 border-dashed border-red-500 flex items-start justify-center pt-[18px]">
              <span className="text-[28px] font-bold text-red-700 bg-white/90 px-[16px] py-[4px] rounded-[8px]">
                Zone exclue bas · 420 px
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
