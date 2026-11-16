import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolveBrollAsset } from '../../data/brollLibrary';
import { CREATOR_PROFILE, type LookPreset } from '../../data/shortSpec';
import {
  buildCaptionChunks,
  clamp,
  getActiveCaptionChunk,
  getLayoutSeam,
  leave,
  seg,
  spring,
  type WordCue,
} from '../../engine/math';
import { buildDynamicBeatsFromProject, type DynamicBeat } from '../../engine/transcriptUtils';
import type { DynamicIconKind } from '../../types/batch';
import type { ShortProject } from '../../types/studio';

interface DynamicShortStageProps {
  project: ShortProject;
  t: number;
  look: LookPreset;
  showSafeZones: boolean;
  renderMode?: boolean;
}

const SHARDS = [
  { x: -290, y: -170, r: -34, w: 118, h: 82, color: '#14161B' },
  { x: 260, y: -190, r: 28, w: 108, h: 78, color: '#258EFF' },
  { x: -320, y: 75, r: -44, w: 98, h: 90, color: '#E1306C' },
  { x: 300, y: 88, r: 38, w: 112, h: 82, color: '#F59E0B' },
  { x: -160, y: 195, r: -22, w: 90, h: 70, color: '#14161B' },
  { x: 170, y: 190, r: 34, w: 100, h: 76, color: '#258EFF' },
  { x: -20, y: -210, r: 16, w: 68, h: 50, color: '#DC2626' },
  { x: 52, y: 215, r: -18, w: 76, h: 52, color: '#DC2626' },
];

function BeatVectorIcon({
  kind = 'ai',
  size = 54,
  color = '#FFFFFF',
}: {
  kind?: DynamicIconKind;
  size?: number;
  color?: string;
}) {
  const s = String(size);
  if (kind === 'calendar') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 15l2.5 2.5L16 12.5" />
      </svg>
    );
  }
  if (kind === 'clock') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    );
  }
  if (kind === 'euro') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6.5a7 7 0 1 0 0 11" />
        <line x1="4" y1="10" x2="14" y2="10" />
        <line x1="4" y1="14" x2="13" y2="14" />
      </svg>
    );
  }
  if (kind === 'law') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" />
        <path d="M5 7h14" />
        <path d="M3 14l2.5-7L8 14a2.8 2.8 0 0 1-5 0z" />
        <path d="M16 14l2.5-7L21 14a2.8 2.8 0 0 1-5 0z" />
        <path d="M8 21h8" />
      </svg>
    );
  }
  if (kind === 'chart') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 4 3 5-7" />
        <circle cx="20" cy="7" r="1.5" fill={color} />
      </svg>
    );
  }
  if (kind === 'terminal') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <polyline points="7 10 10 13 7 16" />
        <line x1="12" y1="16" x2="17" y2="16" />
      </svg>
    );
  }
  if (kind === 'phone') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <line x1="10" y1="18" x2="14" y2="18" />
      </svg>
    );
  }
  if (kind === 'lock') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    );
  }
  if (kind === 'rocket') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      </svg>
    );
  }
  if (kind === 'shield') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (kind === 'warning') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}

function animateStatValue(rawStat: string | undefined, progress: number): string {
  const s = String(rawStat || '2026');
  const m = s.match(/^([^\d\-+]*)([\-+]?\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return s;
  const prefix = m[1] || '';
  const numStr = m[2].replace(',', '.');
  const suffix = m[3] || '';
  const target = Number(numStr);
  if (!Number.isFinite(target)) return s;
  const val = target * progress;
  const hasDecimal = numStr.includes('.');
  const formatted = hasDecimal ? val.toFixed(1).replace('.', ',') : String(Math.round(val));
  return `${prefix}${formatted}${suffix}`;
}

function renderHighlightedText(
  quote: string,
  highlightPhrase: string | undefined,
  sweepProgress: number,
  accent: string
) {
  if (!highlightPhrase) return <span>{quote}</span>;
  const idx = quote.toLowerCase().indexOf(highlightPhrase.toLowerCase());
  if (idx === -1) return <span>{quote}</span>;
  const before = quote.slice(0, idx);
  const match = quote.slice(idx, idx + highlightPhrase.length);
  const after = quote.slice(idx + highlightPhrase.length);

  const startsWithPunct = /^[.,;:!?…]/.test(after);
  return (
    <span>
      {before}
      <span
        className="relative inline-block"
        style={{
          paddingLeft: '8px',
          paddingRight: startsWithPunct ? '2px' : '8px',
          marginLeft: '2px',
          marginRight: startsWithPunct ? '0px' : '2px',
        }}
      >
        <span
          className="absolute inset-y-[4px] left-0 rounded-[10px]"
          style={{
            width: `${(clamp(sweepProgress, 0, 1) * 100).toFixed(1)}%`,
            backgroundColor: `${accent}30`,
          }}
        />
        <span className="relative font-extrabold" style={{ color: accent }}>
          {match}
        </span>
      </span>
      {after}
    </span>
  );
}

function renderDynamicBeatScene(
  beat: DynamicBeat,
  localT: number,
  beatSpan: number,
  look: LookPreset
) {
  const vType = beat.visualType || 'hook_shatter';
  const enter = beat.index === 1 && localT < 0.05 ? 1 : spring(localT, 14);
  const exit = leave(localT, beatSpan, 0.24);
  const iconKind: DynamicIconKind = beat.iconKind || 'ai';

  // 1A. HOOK SHATTER (3 topic-grounded cards + shockwave shatter)
  if (vType === 'hook_shatter') {
    const splitAt = clamp(beatSpan * 0.46, 1.35, 2.25);
    const exploded = localT >= splitAt;
    const scanBeam = (localT * 190) % 270;
    const hitP = seg(localT, splitAt, splitAt + 0.72);
    const stampP = spring(localT - splitAt, 22);
    const shockP = seg(localT, splitAt, splitAt + 0.65);
    const statP = spring(localT - (splitAt + 0.45), 16);
    const shakeAmt =
      localT >= splitAt && localT <= splitAt + 0.46
        ? Math.sin((localT - splitAt) * 90) * (1 - seg(localT, splitAt, splitAt + 0.46)) * 14
        : 0;

    const cards =
      beat.hookCards && beat.hookCards.length >= 3
        ? beat.hookCards.slice(0, 3)
        : [
            { label: beat.comparisonLeft?.label || 'Avant', sub: beat.comparisonLeft?.value || 'Ancien réflexe', iconKind: 'clock' as DynamicIconKind, tone: 'dark' as const },
            { label: beat.statValue || '2026', sub: beat.statLabel || 'Signal clé', iconKind, tone: 'light' as const },
            { label: beat.comparisonRight?.label || 'Maintenant', sub: beat.comparisonRight?.value || 'Nouveau cap', iconKind: 'rocket' as DynamicIconKind, tone: 'accent' as const },
          ];

    const kpi1 = beat.subStats?.[0] || { value: beat.statValue || '2026', label: beat.statLabel || 'Point de bascule' };
    const kpi2 = beat.subStats?.[1] || { value: beat.stampWord || 'ACTIF', label: beat.brollCaption || 'Impact terrain' };

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translate(${shakeAmt.toFixed(1)}px, ${(-30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div
          className="w-full rounded-[22px] px-[26px] py-[15px] border flex items-center justify-between mb-[20px]"
          style={{
            backgroundColor: look.sheet,
            borderColor: exploded ? '#DC2626' : look.line,
            borderWidth: exploded ? '2.5px' : '1.5px',
            boxShadow: '0 16px 36px -12px rgba(20,22,27,0.14)',
          }}
        >
          <div className="flex items-center gap-[14px] min-w-0">
            <span
              className="w-[16px] h-[16px] rounded-full shrink-0"
              style={{
                backgroundColor: exploded ? '#DC2626' : look.accent,
                transform: `scale(${(0.85 + 0.25 * Math.abs(Math.sin(localT * 6))).toFixed(2)})`,
              }}
            />
            <span
              className="text-[30px] font-extrabold tracking-[-0.02em] truncate"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {beat.title}
            </span>
          </div>
          <span
            className="text-[24px] font-mono font-bold tabular-nums shrink-0 ml-[12px]"
            style={{ color: exploded ? '#DC2626' : look.accent }}
          >
            {exploded ? (beat.stampWord || 'BASCULE') : beat.screenLabel}
          </span>
        </div>

        <div className="relative w-full h-[435px] flex items-center justify-center">
          {exploded && shockP < 1 && (
            <>
              <div
                className="absolute rounded-full border-[7px]"
                style={{
                  width: `${240 + shockP * 580}px`,
                  height: `${240 + shockP * 580}px`,
                  borderColor: look.accent,
                  opacity: (1 - shockP) * 0.72,
                }}
              />
              <div
                className="absolute rounded-full border-[5px] border-dashed"
                style={{
                  width: `${170 + shockP * 440}px`,
                  height: `${170 + shockP * 440}px`,
                  borderColor: '#DC2626',
                  opacity: (1 - shockP) * 0.6,
                  transform: `rotate(${(shockP * 45).toFixed(1)}deg)`,
                }}
              />
            </>
          )}

          {localT < splitAt + 0.1 && (
            <div
              className="relative w-full flex items-center justify-center gap-[20px]"
              style={{
                opacity: !exploded ? 1 : 1 - seg(localT, splitAt, splitAt + 0.1),
                transform: `scale(${(1 - 0.04 * seg(localT, 0.2, splitAt)).toFixed(3)})`,
              }}
            >
              {cards.map((card, idx) => {
                const isMain = idx === 1;
                const bg = card.tone === 'dark' ? '#14161B' : card.tone === 'accent' ? look.accent : look.sheet;
                const fg = card.tone === 'light' ? look.ink : '#FFFFFF';
                const rot = idx === 0 ? -4 : idx === 2 ? 4 : 0;
                return (
                  <div
                    key={idx}
                    className="relative rounded-[32px] px-[14px] flex flex-col items-center justify-center gap-[12px] border overflow-hidden text-center"
                    style={{
                      width: isMain ? '262px' : '226px',
                      height: isMain ? '276px' : '246px',
                      backgroundColor: bg,
                      borderColor: isMain ? look.line : 'rgba(255,255,255,0.16)',
                      boxShadow: '0 24px 48px -14px rgba(20,22,27,0.22)',
                      transform: `rotate(${(rot + Math.sin(localT * 3 + idx) * 1.6).toFixed(2)}deg) translateY(${(isMain ? -10 : 4 * Math.cos(localT * 3 + idx)).toFixed(1)}px)`,
                    }}
                  >
                    <div
                      className="w-[78px] h-[78px] rounded-[22px] flex items-center justify-center"
                      style={{ backgroundColor: isMain ? `${look.accent}18` : 'rgba(255,255,255,0.14)' }}
                    >
                      <BeatVectorIcon kind={card.iconKind || iconKind} size={44} color={isMain ? look.accent : fg} />
                    </div>
                    <div
                      className="text-[36px] font-extrabold leading-tight tracking-tight tabular-nums line-clamp-1 max-w-full"
                      style={{ color: fg, fontFamily: look.fontDisplay }}
                    >
                      {card.label}
                    </div>
                    <div
                      className="text-[21px] font-semibold opacity-80 leading-tight line-clamp-1 max-w-full"
                      style={{ color: fg }}
                    >
                      {card.sub}
                    </div>
                    <div
                      className="absolute inset-x-0 h-[4px] opacity-75"
                      style={{ top: `${((scanBeam + idx * 80) % 270).toFixed(0)}px`, backgroundColor: '#DC2626' }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {exploded &&
            SHARDS.map((s, idx) => (
              <div
                key={idx}
                className="absolute rounded-[14px]"
                style={{
                  width: `${s.w}px`,
                  height: `${s.h}px`,
                  backgroundColor: s.color,
                  opacity: clamp(1 - seg(localT, splitAt + 0.35, splitAt + 0.8), 0, 1),
                  transform: `translate(${(s.x * hitP).toFixed(1)}px, ${(s.y * hitP).toFixed(1)}px) rotate(${(s.r * hitP).toFixed(1)}deg) scale(${(1 - 0.3 * hitP).toFixed(3)})`,
                  boxShadow: '0 12px 24px rgba(20,22,27,0.16)',
                }}
              />
            ))}

          {exploded && (
            <div
              className="absolute px-[44px] py-[28px] rounded-[30px] border-[6px] flex flex-col items-center text-center"
              style={{
                backgroundColor: look.sheet,
                borderColor: look.accent,
                opacity: clamp(stampP * 3, 0, 1),
                transform: `translateY(${(-22 * clamp(seg(localT, splitAt + 0.4, splitAt + 0.9), 0, 1)).toFixed(1)}px) scale(${(1.26 - 0.26 * stampP).toFixed(3)}) rotate(-2deg)`,
                boxShadow: '0 32px 60px -16px rgba(20,22,27,0.32)',
              }}
            >
              <div
                className="text-[70px] font-extrabold leading-none tracking-[-0.04em] uppercase"
                style={{ color: look.ink, fontFamily: look.fontDisplay }}
              >
                {beat.stampWord || 'BASCULE'}{' '}
                <span style={{ color: look.accent }}>{beat.statValue || '2026'}</span>
              </div>
              <div className="text-[28px] font-semibold mt-[10px]" style={{ color: look.ink2 }}>
                {beat.statLabel || beat.title}
              </div>
            </div>
          )}
        </div>

        {!exploded || localT < splitAt + 0.45 ? (
          <div
            className="w-full mt-[10px] rounded-[24px] px-[28px] py-[20px] border grid grid-cols-3 gap-[16px]"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.line,
              boxShadow: '0 18px 36px -14px rgba(20,22,27,0.12)',
              opacity: localT < splitAt ? 1 : 1 - seg(localT, splitAt, splitAt + 0.45),
            }}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[21px] font-semibold truncate" style={{ color: look.ink3 }}>{kpi1.label}</span>
              <span className="text-[30px] font-extrabold truncate tabular-nums" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {kpi1.value}
              </span>
            </div>
            <div className="flex flex-col border-l pl-[16px] min-w-0" style={{ borderColor: look.line }}>
              <span className="text-[21px] font-semibold truncate" style={{ color: look.ink3 }}>Contexte</span>
              <span className="text-[28px] font-extrabold truncate" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
                {beat.brollCaption || beat.shortLabel || 'Analyse'}
              </span>
            </div>
            <div className="flex flex-col border-l pl-[16px] min-w-0" style={{ borderColor: look.line }}>
              <span className="text-[21px] font-semibold truncate" style={{ color: look.ink3 }}>Verdict</span>
              <span className="text-[28px] font-extrabold truncate" style={{ color: '#DC2626', fontFamily: look.fontDisplay }}>
                {beat.stampWord || 'SIGNAL'}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="w-full mt-[10px] grid grid-cols-2 gap-[22px]"
            style={{
              opacity: clamp(statP * 2, 0, 1),
              transform: `translateY(${(24 * (1 - statP)).toFixed(1)}px)`,
            }}
          >
            {[kpi1, kpi2].map((kpi, idx) => (
              <div
                key={idx}
                className="px-[28px] py-[20px] rounded-[26px] border flex items-center gap-[18px]"
                style={{
                  backgroundColor: look.sheet,
                  borderColor: look.line,
                  boxShadow: '0 22px 44px -14px rgba(20,22,27,0.14)',
                }}
              >
                <span
                  className="text-[58px] font-extrabold leading-none tracking-[-0.04em] tabular-nums shrink-0"
                  style={{ color: idx === 0 ? look.accent : look.ink, fontFamily: look.fontDisplay }}
                >
                  {kpi.value}
                </span>
                <div className="text-[25px] font-bold leading-tight min-w-0" style={{ color: look.ink }}>
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 1B. HOOK STAT (Giant radial hero counter + 2 proof cards — dedicated visual design)
  if (vType === 'hook_stat') {
    const countP = seg(localT, 0.1, Math.min(1.6, beatSpan * 0.55));
    const animatedStat = animateStatValue(beat.statValue || '×3', countP);
    const kpi1 = beat.subStats?.[0] || { value: beat.statValue || '×3', label: beat.statLabel || 'Chiffre clé' };
    const kpi2 = beat.subStats?.[1] || { value: beat.stampWord || '2026', label: beat.brollCaption || 'Terrain' };

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(30 * (1 - enter) - 28 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[18px]">
          <span className="text-[24px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
            {beat.screenLabel}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[22px] font-mono font-bold" style={{ backgroundColor: look.ink, color: '#FFFFFF' }}>
            {beat.stampWord || 'MESURÉ'}
          </span>
        </div>

        <div
          className="w-full rounded-[34px] p-[38px] border-2 flex items-center justify-between gap-[24px] mb-[20px]"
          style={{
            backgroundColor: '#14161B',
            borderColor: look.accent,
            boxShadow: '0 28px 58px -18px rgba(20,22,27,0.32)',
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[36px] font-extrabold text-white leading-[1.12] mb-[14px]" style={{ fontFamily: look.fontDisplay }}>
              {beat.title}
            </div>
            <div className="text-[24px] font-semibold text-white/75 leading-snug">
              {beat.statLabel || 'Écart observé sur le terrain'}
            </div>
          </div>
          <div className="relative w-[220px] h-[220px] shrink-0 flex items-center justify-center">
            <svg width="220" height="220" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r="92" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="14" />
              <circle
                cx="110"
                cy="110"
                r="92"
                fill="none"
                stroke={look.accent}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${(578 * clamp(countP * 0.85 + 0.12, 0.12, 0.96)).toFixed(1)} 600`}
                transform="rotate(-90 110 110)"
              />
            </svg>
            <span
              className="absolute text-[62px] font-extrabold text-white tracking-[-0.04em] tabular-nums"
              style={{ fontFamily: look.fontDisplay }}
            >
              {animatedStat}
            </span>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-[18px]">
          {[kpi1, kpi2].map((kpi, idx) => (
            <div
              key={idx}
              className="rounded-[26px] border px-[26px] py-[22px] flex items-center gap-[16px]"
              style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 18px 36px -14px rgba(20,22,27,0.12)' }}
            >
              <div className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${look.accent}18` }}>
                <BeatVectorIcon kind={idx === 0 ? iconKind : 'chart'} size={30} color={look.accent} />
              </div>
              <div className="min-w-0">
                <div className="text-[36px] font-extrabold leading-none tabular-nums truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                  {kpi.value}
                </div>
                <div className="text-[22px] font-semibold truncate mt-[4px]" style={{ color: look.ink2 }}>
                  {kpi.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 1C. HOOK VS BATTLE (Split Versus Arena: Dark Option A vs Accent Option B + Slamming VS Bolt)
  if (vType === 'hook_vs_battle') {
    const clashAt = clamp(beatSpan * 0.36, 0.85, 1.5);
    const clashed = localT >= clashAt;
    const vsP = spring(localT - clashAt, 20);
    const leftCard = beat.hookCards?.[0] || {
      label: beat.comparisonLeft?.label || 'Option A',
      sub: beat.comparisonLeft?.value || 'Réflexe classique',
      iconKind: 'clock' as DynamicIconKind,
    };
    const secondCard = beat.hookCards?.[1];
    const pickedRight =
      secondCard && secondCard.label?.trim().toUpperCase() !== 'VS'
        ? secondCard
        : beat.hookCards?.[2] || secondCard;
    const rightCard = pickedRight || {
      label: beat.comparisonRight?.label || 'Option B',
      sub: beat.comparisonRight?.value || beat.statValue || 'Choix optimisé',
      iconKind: iconKind,
    };

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(28 * (1 - enter) - 28 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[18px]">
          <span className="text-[38px] font-extrabold tracking-[-0.02em] truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[22px] font-mono font-bold border shrink-0" style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.accent }}>
            {beat.screenLabel}
          </span>
        </div>

        <div className="relative w-full grid grid-cols-2 gap-[20px] items-stretch h-[390px]">
          <div
            className="rounded-[32px] p-[30px] flex flex-col justify-between border border-white/15"
            style={{
              backgroundColor: '#14161B',
              boxShadow: '0 26px 52px -18px rgba(20,22,27,0.28)',
              transform: `translateX(${((1 - enter) * -32).toFixed(1)}px) rotate(${clashed ? '-1.5' : '0'}deg)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[22px] font-mono font-bold text-white/55">OPTION 01</span>
              <BeatVectorIcon kind={leftCard.iconKind || 'clock'} size={36} color="#FFFFFF" />
            </div>
            <div>
              <div className="text-[48px] font-extrabold text-white leading-[1.05]" style={{ fontFamily: look.fontDisplay }}>
                {leftCard.label}
              </div>
              <div className="text-[26px] font-semibold text-white/75 mt-[10px]">
                {leftCard.sub}
              </div>
            </div>
            <div className="h-[10px] rounded-full bg-white/15 overflow-hidden">
              <div className="h-full bg-white/60 rounded-full" style={{ width: `${Math.round(clamp(beat.comparisonLeft?.ratio ?? 0.55, 0.2, 0.95) * 100)}%` }} />
            </div>
          </div>

          <div
            className="rounded-[32px] p-[30px] flex flex-col justify-between border-2"
            style={{
              backgroundColor: look.accent,
              borderColor: '#FFFFFF',
              boxShadow: '0 26px 52px -18px rgba(37,142,255,0.34)',
              transform: `translateX(${((1 - enter) * 32).toFixed(1)}px) rotate(${clashed ? '1.5' : '0'}deg)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[22px] font-mono font-bold text-white/80">OPTION 02</span>
              <BeatVectorIcon kind={rightCard.iconKind || iconKind} size={36} color="#FFFFFF" />
            </div>
            <div>
              <div className="text-[48px] font-extrabold text-white leading-[1.05]" style={{ fontFamily: look.fontDisplay }}>
                {rightCard.label}
              </div>
              <div className="text-[26px] font-semibold text-white/90 mt-[10px]">
                {rightCard.sub}
              </div>
            </div>
            <div className="h-[10px] rounded-full bg-black/20 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${Math.round(clamp(beat.comparisonRight?.ratio ?? 0.88, 0.2, 0.98) * 100)}%` }} />
            </div>
          </div>

          {/* Center slamming VS medal */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[112px] h-[112px] rounded-full border-[6px] flex items-center justify-center font-extrabold text-[42px]"
            style={{
              backgroundColor: look.sheet,
              borderColor: clashed ? '#DC2626' : look.ink,
              color: clashed ? '#DC2626' : look.ink,
              fontFamily: look.fontDisplay,
              boxShadow: '0 22px 44px rgba(20,22,27,0.28)',
              transform: `translate(-50%, -50%) scale(${(clashed ? 1.2 - 0.14 * vsP : 0.9).toFixed(3)}) rotate(${(clashed ? -6 : 0).toFixed(1)}deg)`,
            }}
          >
            VS
          </div>
        </div>

        <div
          className="w-full mt-[18px] rounded-[24px] px-[28px] py-[18px] border flex items-center justify-between"
          style={{ backgroundColor: look.sheet, borderColor: look.line }}
        >
          <span className="text-[27px] font-bold" style={{ color: look.ink }}>
            {beat.statLabel || 'Arbitrage chiffré en direct'}
          </span>
          <span className="text-[34px] font-extrabold font-mono tabular-nums" style={{ color: look.accent }}>
            {beat.statValue || 'VERDICT'}
          </span>
        </div>
      </div>
    );
  }

  // 1D. HOOK MYTH BUST ("IDÉE REÇUE" dark card slashed in red -> flips to "RÉALITÉ")
  if (vType === 'hook_myth_bust') {
    const bustAt = clamp(beatSpan * 0.44, 1.1, 2.0);
    const busted = localT >= bustAt;
    const slashP = seg(localT, bustAt - 0.15, bustAt + 0.35);
    const flipP = spring(localT - bustAt, 18);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(28 * (1 - enter) - 28 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[18px]">
          <span className="text-[36px] font-extrabold tracking-tight truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span
            className="px-[16px] py-[6px] rounded-[12px] text-[22px] font-mono font-bold shrink-0"
            style={{ backgroundColor: busted ? '#059669' : '#DC2626', color: '#FFFFFF' }}
          >
            {busted ? 'VÉRIFIÉ ✓' : 'IDÉE REÇUE'}
          </span>
        </div>

        <div
          className="relative w-full rounded-[34px] p-[38px] border-2 mb-[18px] overflow-hidden"
          style={{
            backgroundColor: '#14161B',
            borderColor: busted ? '#DC2626' : '#2E3340',
            boxShadow: '0 24px 48px -16px rgba(20,22,27,0.26)',
          }}
        >
          <div className="flex items-center justify-between mb-[12px]">
            <span className="text-[22px] font-mono font-bold text-[#FCA5A5] uppercase">
              Ce qu’on entend partout
            </span>
            <BeatVectorIcon kind="warning" size={34} color="#F87171" />
          </div>
          <div className="text-[40px] font-extrabold text-white leading-[1.15]" style={{ fontFamily: look.fontDisplay, opacity: busted ? 0.45 : 1 }}>
            {beat.quoteText || beat.title}
          </div>

          {slashP > 0 && (
            <div
              className="absolute left-[4%] top-[52%] h-[10px] rounded-full"
              style={{
                width: `${(92 * slashP).toFixed(1)}%`,
                backgroundColor: '#EF4444',
                transform: 'rotate(-6deg)',
                boxShadow: '0 0 18px rgba(239,68,68,0.65)',
              }}
            />
          )}
        </div>

        <div
          className="w-full rounded-[32px] p-[32px] border-2 flex items-center justify-between gap-[20px]"
          style={{
            backgroundColor: look.sheet,
            borderColor: busted ? '#059669' : look.line,
            opacity: busted ? clamp(0.25 + flipP * 0.75, 0, 1) : 0.35,
            transform: `translateY(${((1 - (busted ? flipP : 0)) * 22).toFixed(1)}px) scale(${(busted ? 0.96 + 0.04 * flipP : 0.96).toFixed(3)})`,
            boxShadow: '0 24px 48px -18px rgba(20,22,27,0.16)',
          }}
        >
          <div className="min-w-0">
            <div className="text-[22px] font-mono font-bold uppercase" style={{ color: '#059669' }}>
              RÉALITÉ CHIFFRÉE · {beat.quoteSource || '2026'}
            </div>
            <div className="text-[36px] font-extrabold leading-tight mt-[6px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.statLabel || 'Les chiffres prouvent l’inverse'}
            </div>
          </div>
          <div
            className="px-[28px] py-[18px] rounded-[22px] text-[50px] font-extrabold font-mono tabular-nums shrink-0"
            style={{ backgroundColor: look.accent, color: '#FFFFFF', fontFamily: look.fontDisplay }}
          >
            {beat.statValue || beat.stampWord || 'FAUX'}
          </div>
        </div>
      </div>
    );
  }

  // 1E. HOOK ALERT CARD (Editorial dossier breaking card with animated highlight sweep)
  if (vType === 'hook_alert_card') {
    const sweepP = seg(localT, 0.35, Math.min(1.6, beatSpan * 0.55));
    const kpi1 = beat.subStats?.[0] || { value: beat.statValue || '2026', label: beat.statLabel || 'Impact' };
    const kpi2 = beat.subStats?.[1] || { value: beat.stampWord || 'ACTU', label: beat.quoteSource || 'Source' };

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(28 * (1 - enter) - 28 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div
          className="w-full rounded-[34px] p-[36px] border-2 mb-[20px]"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.ink,
            boxShadow: '0 28px 56px -18px rgba(20,22,27,0.2)',
          }}
        >
          <div className="flex items-center justify-between pb-[18px] mb-[20px] border-b" style={{ borderColor: look.line }}>
            <div className="flex items-center gap-[12px]">
              <span className="w-[14px] h-[14px] rounded-full bg-[#DC2626]" />
              <span className="text-[24px] font-mono font-extrabold uppercase tracking-wider" style={{ color: '#DC2626' }}>
                {beat.screenLabel}
              </span>
            </div>
            <BeatVectorIcon kind={iconKind} size={36} color={look.accent} />
          </div>

          <div
            className="text-[48px] font-extrabold leading-[1.12] tracking-[-0.02em] mb-[20px]"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            {renderHighlightedText(
              beat.quoteText || beat.title,
              beat.highlightPhrase || beat.title,
              sweepP,
              look.accent
            )}
          </div>

          <div className="flex items-center justify-between pt-[16px] border-t" style={{ borderColor: look.line }}>
            <span className="text-[24px] font-mono font-semibold" style={{ color: look.ink3 }}>
              {beat.quoteSource || 'Analyse France · 2026'}
            </span>
            <span
              className="px-[18px] py-[6px] rounded-[12px] text-[24px] font-mono font-extrabold"
              style={{ backgroundColor: look.ink, color: '#FFFFFF' }}
            >
              {beat.stampWord || 'DOSSIER'}
            </span>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-[18px]">
          {[kpi1, kpi2].map((kpi, idx) => (
            <div
              key={idx}
              className="rounded-[24px] border px-[26px] py-[20px] flex items-center justify-between"
              style={{ backgroundColor: idx === 0 ? '#14161B' : look.sheet, borderColor: look.line }}
            >
              <span className="text-[24px] font-semibold truncate mr-[10px]" style={{ color: idx === 0 ? 'rgba(255,255,255,0.75)' : look.ink2 }}>
                {kpi.label}
              </span>
              <span className="text-[40px] font-extrabold font-mono tabular-nums shrink-0" style={{ color: idx === 0 ? '#60A5FA' : look.accent }}>
                {kpi.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. COUNTER FLIP
  if (vType === 'counter_flip') {
    const countP = seg(localT, 0.2, Math.min(2.1, beatSpan * 0.45));
    const strikeP = seg(localT, Math.min(2.3, beatSpan * 0.48), Math.min(2.9, beatSpan * 0.6));
    const flowDash = (localT * 64) % 24;
    const switched = localT >= Math.min(2.4, beatSpan * 0.52);
    const rippleP = seg(localT, Math.min(2.4, beatSpan * 0.52), Math.min(3.1, beatSpan * 0.72));
    const animatedStat = animateStatValue(beat.statValue || '2026', countP);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[16px]">
          <div className="flex items-center gap-[14px] min-w-0">
            <div
              className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: look.accent, color: look.onAccent }}
            >
              <BeatVectorIcon kind={iconKind} size={26} color={look.onAccent} />
            </div>
            <span className="text-[34px] font-extrabold tracking-[-0.02em] truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.title}
            </span>
          </div>
          <span
            className="px-[16px] py-[6px] rounded-[12px] text-[24px] font-mono font-bold border shrink-0 ml-[10px]"
            style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.ink2 }}
          >
            {beat.screenLabel}
          </span>
        </div>

        <div
          className="w-full rounded-[32px] px-[38px] py-[30px] border flex items-center justify-between gap-[16px]"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 24px 48px -16px rgba(20,22,27,0.16)',
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[30px] font-extrabold leading-tight truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.statLabel || 'Chiffre mesuré'}
            </div>
            <div className="w-full max-w-[320px] h-[10px] rounded-full mt-[16px] overflow-hidden" style={{ backgroundColor: look.paper }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(countP * 85)}%`, backgroundColor: look.accent }} />
            </div>
          </div>
          <div className="relative flex items-baseline shrink-0">
            <span
              className="text-[96px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {animatedStat}
            </span>
            {strikeP > 0 && (
              <div
                className="absolute left-0 top-[52%] h-[6px] rounded-full"
                style={{
                  width: `${(190 * strikeP).toFixed(1)}px`,
                  backgroundColor: '#DC2626',
                  transform: 'rotate(-13deg)',
                }}
              />
            )}
          </div>
        </div>

        <div className="h-[34px] w-full flex items-center justify-center">
          <svg width="240" height="34" viewBox="0 0 240 34">
            <line
              x1="120"
              y1="2"
              x2="120"
              y2="32"
              stroke={look.accent}
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeDashoffset={-flowDash}
            />
            <circle cx="120" cy="17" r="6" fill={switched ? '#059669' : look.accent} />
          </svg>
        </div>

        <div
          className="relative w-full rounded-[32px] p-[32px] border"
          style={{
            backgroundColor: look.sheet,
            borderColor: switched ? '#059669' : look.line,
            borderWidth: switched ? '2.5px' : '1.5px',
            boxShadow: '0 28px 56px -18px rgba(20,22,27,0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-[18px]">
            <span className="text-[32px] font-extrabold truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {switched ? (beat.comparisonRight?.label || 'Nouvelle norme') : (beat.comparisonLeft?.label || 'Avant')}
            </span>
            <span
              className="text-[24px] font-bold px-[16px] py-[6px] rounded-[12px] shrink-0"
              style={{
                backgroundColor: switched ? '#059669' : look.paper,
                color: switched ? '#FFFFFF' : look.ink2,
              }}
            >
              {switched ? 'Confirmé ✓' : 'Initial'}
            </span>
          </div>

          <div className="flex items-center gap-[18px]">
            <div className="flex-1 rounded-[20px] px-[24px] py-[16px] border flex items-center justify-between min-w-0" style={{ backgroundColor: look.paper, borderColor: look.line }}>
              <span className="text-[26px] font-medium shrink-0" style={{ color: look.ink2 }}>Impact</span>
              <span className="text-[38px] font-extrabold tabular-nums truncate ml-[10px]" style={{ color: switched ? '#059669' : look.ink, fontFamily: look.fontDisplay }}>
                {switched ? (beat.comparisonRight?.value || beat.statValue || 'Optimisé') : (beat.comparisonLeft?.value || 'Subi')}
              </span>
            </div>
            <div
              className="relative px-[28px] py-[18px] rounded-[20px] text-[28px] font-bold shrink-0"
              style={{
                backgroundColor: switched ? '#059669' : look.ink,
                color: '#FFFFFF',
              }}
            >
              {switched ? 'Basculé' : 'Basculer'}
              {switched && rippleP < 1 && (
                <span
                  className="absolute inset-0 rounded-[20px] border-4"
                  style={{
                    borderColor: '#059669',
                    transform: `scale(${(1 + rippleP * 0.45).toFixed(2)})`,
                    opacity: 1 - rippleP,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. TIMELINE STEPS
  if (vType === 'timeline_steps') {
    const steps = (beat.steps && beat.steps.length >= 3 ? beat.steps : ['Repérer', 'Chiffrer', 'Arbitrer', 'Stabiliser']).slice(0, 4);
    const fillProg = seg(localT, 0.2, beatSpan * 0.78);
    const stamped = localT >= beatSpan * 0.62;
    const stampP = spring(localT - beatSpan * 0.62, 22);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div
          className="w-full rounded-[24px] px-[28px] py-[20px] border mb-[20px]"
          style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 14px 30px -12px rgba(20,22,27,0.12)' }}
        >
          <div className="relative flex items-center justify-between">
            <div className="absolute left-[24px] right-[24px] top-[16px] h-[5px] rounded-full" style={{ backgroundColor: look.paper }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(fillProg * 100).toFixed(1)}%`, backgroundColor: stamped ? '#059669' : look.accent }}
              />
            </div>
            {steps.map((label, idx) => {
              const reached = fillProg >= idx / Math.max(1, steps.length - 1);
              const isLast = idx === steps.length - 1 && reached;
              return (
                <div key={label + idx} className="relative z-10 flex flex-col items-center gap-[8px]">
                  <div
                    className="w-[34px] h-[34px] rounded-full border-4 flex items-center justify-center"
                    style={{
                      backgroundColor: isLast ? '#059669' : reached ? look.accent : look.sheet,
                      borderColor: isLast ? '#059669' : reached ? look.accent : look.line,
                    }}
                  >
                    {reached && <span className="w-[10px] h-[10px] rounded-full bg-white" />}
                  </div>
                  <span
                    className="text-[23px] font-extrabold tracking-[-0.01em]"
                    style={{ color: isLast ? '#059669' : reached ? look.ink : look.ink3, fontFamily: look.fontDisplay }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="relative w-full rounded-[34px] p-[36px] border overflow-hidden"
          style={{
            backgroundColor: look.sheet,
            borderColor: stamped ? '#059669' : look.line,
            borderWidth: stamped ? '2.5px' : '1.5px',
            boxShadow: '0 28px 56px -18px rgba(20,22,27,0.18)',
          }}
        >
          <div className="flex items-center justify-between mb-[22px]">
            <div className="min-w-0 pr-[16px]">
              <div className="text-[24px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
                {beat.screenLabel}
              </div>
              <div className="text-[50px] font-extrabold leading-[1.06] mt-[6px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {beat.title}
              </div>
            </div>
            <div
              className="w-[92px] h-[92px] rounded-[24px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${look.accent}18` }}
            >
              <BeatVectorIcon kind={iconKind} size={50} color={look.accent} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[16px]">
            {steps.map((st, idx) => {
              const active = fillProg >= idx / Math.max(1, steps.length - 1);
              return (
                <div
                  key={idx}
                  className="rounded-[20px] px-[22px] py-[18px] border flex items-center gap-[14px]"
                  style={{
                    backgroundColor: active ? look.paper : '#FFFFFF',
                    borderColor: active ? look.accent : look.line,
                    opacity: active ? 1 : 0.45,
                  }}
                >
                  <span
                    className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center text-[22px] font-mono font-extrabold shrink-0"
                    style={{
                      backgroundColor: active ? look.accent : look.line,
                      color: active ? '#FFFFFF' : look.ink2,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[27px] font-bold truncate" style={{ color: look.ink }}>
                    {st}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="mt-[22px] rounded-[20px] px-[28px] py-[18px] flex items-center justify-between"
            style={{
              backgroundColor: '#14161B',
              color: '#FFFFFF',
              transform: stamped ? `scale(${(0.96 + stampP * 0.04).toFixed(3)})` : undefined,
            }}
          >
            <div className="flex items-center gap-[12px]">
              <span
                className="w-[12px] h-[12px] rounded-full"
                style={{ backgroundColor: stamped ? '#34D399' : look.accent }}
              />
              <span className="text-[27px] font-bold">
                {stamped ? (beat.brollCaption || 'Séquence confirmée') : 'Chronologie en cours'}
              </span>
            </div>
            <span
              className="text-[26px] font-mono font-extrabold tabular-nums"
              style={{ color: stamped ? '#34D399' : '#60A5FA' }}
            >
              {stamped ? (beat.stampWord || 'VALIDÉ ✓') : `${Math.max(1, Math.min(4, Math.ceil(fillProg * 4)))}/4`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 4. GAUGE (Real topic cards instead of skeleton bars + 270° Speedometer Needle + 3 Pillar Cards + Dynamic Insight Bar)
  if (vType === 'gauge') {
    const gaugeTarget = clamp(beat.gaugePct ?? 84, 15, 99) / 100;
    const gaugeP = seg(localT, 0.25, Math.max(1.8, beatSpan * 0.72));
    const gaugeVal = gaugeTarget * (1 - Math.pow(1 - gaugeP, 2.2));
    const needleAngle = -135 + gaugeVal * 270;
    const scrollOffset = (localT * 110) % 180;
    const rowP = spring(localT - 0.55, 14);
    const pillars = (beat.bullets && beat.bullets.length > 0
      ? beat.bullets
      : ['Signal direct', 'Impact mesuré', 'Effet durable']
    ).slice(0, 3);
    const feedCards = [
      { tag: '01 · SIGNAL', text: pillars[0] || beat.title, metric: beat.statValue || `${beat.gaugePct ?? 84}%` },
      { tag: '02 · MÉCANISME', text: pillars[1] || beat.statLabel || 'Facteur clé', metric: 'ACTIF' },
      { tag: '03 · IMPACT', text: pillars[2] || beat.brollCaption || 'Effet direct', metric: beat.stampWord || 'VALIDÉ' },
      { tag: '04 · SYNTHÈSE', text: beat.statLabel || beat.title, metric: 'LIVE' },
    ];

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(36 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full text-center mb-[22px]">
          <div className="text-[28px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
            {beat.screenLabel}
          </div>
          <div
            className="text-[78px] font-extrabold leading-[1.02] tracking-[-0.04em] mt-[6px]"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            {beat.title}
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-[22px] items-stretch">
          {/* Left: Real Topic Signal Feed (no gray skeleton blocks!) */}
          <div
            className="rounded-[30px] p-[24px] border flex flex-col"
            style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 24px 48px -18px rgba(20,22,27,0.16)' }}
          >
            <div className="flex items-center justify-between mb-[14px]">
              <span className="text-[26px] font-bold" style={{ color: look.ink }}>Points clés</span>
              <span className="text-[22px] font-mono font-bold" style={{ color: look.accent }}>
                {beat.stampWord || 'ANALYSE'}
              </span>
            </div>
            <div className="relative h-[480px] rounded-[22px] overflow-hidden border" style={{ backgroundColor: '#14161B', borderColor: look.line }}>
              <div style={{ transform: `translateY(${-scrollOffset.toFixed(1)}px)` }}>
                {feedCards.map((fc, idx) => (
                  <div
                    key={idx}
                    className="mx-[14px] my-[14px] min-h-[150px] rounded-[18px] p-[18px] flex flex-col justify-between border border-white/12"
                    style={{ backgroundColor: idx % 2 === 0 ? '#1E222B' : '#232834' }}
                  >
                    <div className="flex items-center justify-between gap-[8px]">
                      <span className="text-[19px] font-mono font-bold text-[#60A5FA]">{fc.tag}</span>
                      <span className="text-[20px] font-mono font-extrabold text-[#34D399] tabular-nums">{fc.metric}</span>
                    </div>
                    <div className="text-[26px] font-extrabold text-white leading-tight" style={{ fontFamily: look.fontDisplay }}>
                      {fc.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[76px] bg-gradient-to-t from-[#14161B] to-transparent" />
            </div>
          </div>

          {/* Right: Tachometer Needle Gauge */}
          <div
            className="rounded-[30px] p-[26px] border flex flex-col items-center justify-between"
            style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 24px 48px -18px rgba(20,22,27,0.16)' }}
          >
            <div className="w-full text-[27px] font-bold truncate" style={{ color: look.ink }}>
              {beat.statLabel || 'Indice mesuré'}
            </div>
            <div className="relative w-[300px] h-[300px] flex items-center justify-center">
              <svg width="300" height="300" viewBox="0 0 360 360">
                <circle
                  cx="180"
                  cy="180"
                  r="138"
                  fill="none"
                  stroke={look.line}
                  strokeWidth="26"
                  strokeLinecap="round"
                  strokeDasharray="650 1000"
                  transform="rotate(135 180 180)"
                />
                <circle
                  cx="180"
                  cy="180"
                  r="138"
                  fill="none"
                  stroke={look.accent}
                  strokeWidth="26"
                  strokeLinecap="round"
                  strokeDasharray={`${(gaugeVal * 650).toFixed(1)} 1000`}
                  transform="rotate(135 180 180)"
                />
                {Array.from({ length: 21 }).map((_, i) => {
                  const ang = (-135 + (i / 20) * 270) * (Math.PI / 180) - Math.PI / 2;
                  const r1 = 104;
                  const r2 = i % 5 === 0 ? 118 : 112;
                  return (
                    <line
                      key={i}
                      x1={180 + Math.cos(ang) * r1}
                      y1={180 + Math.sin(ang) * r1}
                      x2={180 + Math.cos(ang) * r2}
                      y2={180 + Math.sin(ang) * r2}
                      stroke={look.ink3}
                      strokeWidth={i % 5 === 0 ? 4 : 2}
                      strokeLinecap="round"
                    />
                  );
                })}
                <g transform={`rotate(${needleAngle.toFixed(1)} 180 180)`}>
                  <line x1="180" y1="194" x2="180" y2="70" stroke={look.ink} strokeWidth="9" strokeLinecap="round" />
                  <circle cx="180" cy="180" r="16" fill={look.ink} />
                </g>
              </svg>
              <div className="absolute bottom-[18px] text-center">
                <div
                  className="text-[68px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
                  style={{ color: look.ink, fontFamily: look.fontDisplay }}
                >
                  {Math.round(gaugeVal * 100)}
                  <span style={{ color: look.accent }}>%</span>
                </div>
              </div>
            </div>
            <div className="text-[25px] font-semibold" style={{ color: look.ink2 }}>
              {beat.brollCaption || 'Niveau confirmé'}
            </div>
          </div>
        </div>

        <div
          className="w-full grid grid-cols-3 gap-[16px] mt-[20px]"
          style={{ opacity: clamp(0.35 + rowP * 0.65, 0, 1), transform: `translateY(${(18 * (1 - rowP)).toFixed(1)}px)` }}
        >
          {pillars.map((txt, i) => (
            <div
              key={i}
              className="rounded-[22px] px-[20px] py-[18px] border"
              style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 16px 32px -14px rgba(20,22,27,0.12)' }}
            >
              <div className="flex items-center justify-between mb-[6px]">
                <span className="text-[20px] font-mono font-bold" style={{ color: look.accent }}>0{i + 1}</span>
                <span className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: look.accent }} />
              </div>
              <div className="text-[26px] font-extrabold leading-tight" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {txt}
              </div>
            </div>
          ))}
        </div>

        <div
          className="w-full mt-[18px] rounded-[22px] px-[26px] py-[20px] flex items-center justify-between"
          style={{ backgroundColor: look.ink, color: '#FFFFFF', boxShadow: '0 18px 38px -14px rgba(20,22,27,0.22)' }}
        >
          <div className="flex items-center gap-[14px] min-w-0">
            <span className="w-[14px] h-[14px] rounded-full shrink-0" style={{ backgroundColor: look.accent }} />
            <span className="text-[26px] font-bold truncate">{beat.statLabel || beat.title}</span>
          </div>
          <span className="text-[24px] font-mono font-bold text-[#60A5FA] shrink-0 ml-[12px]">
            {beat.statValue || `${beat.gaugePct ?? 84}%`}
          </span>
        </div>
      </div>
    );
  }

  // 5. COMPARISON BARS
  if (vType === 'comparison_bars') {
    const left = beat.comparisonLeft || { label: 'Option classique', value: 'Base', ratio: 0.84 };
    const right = beat.comparisonRight || { label: 'Option optimisée', value: beat.statValue || 'Écart net', ratio: 0.28 };
    const b1 = spring(localT - 0.15, 13);
    const b2 = spring(localT - 0.45, 11);
    const bottomP = spring(localT - 0.85, 14);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-end justify-between mb-[24px] gap-[16px]">
          <div className="min-w-0">
            <div className="text-[28px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
              {beat.screenLabel}
            </div>
            <div
              className="text-[70px] font-extrabold leading-none tracking-[-0.04em] mt-[8px]"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {beat.title}
            </div>
          </div>

          <div
            className="px-[26px] py-[16px] rounded-[24px] border text-right shrink-0"
            style={{ backgroundColor: look.sheet, borderColor: look.accent, borderWidth: '2px', boxShadow: '0 20px 40px -14px rgba(20,22,27,0.14)' }}
          >
            <div className="text-[22px] font-semibold" style={{ color: look.ink3 }}>Écart</div>
            <div
              className="text-[52px] font-extrabold leading-none tabular-nums"
              style={{ color: look.accent, fontFamily: look.fontDisplay }}
            >
              {beat.multiplierBadge || beat.statValue || 'NET'}
            </div>
          </div>
        </div>

        <div
          className="w-full rounded-[34px] p-[42px] border space-y-[42px]"
          style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 30px 60px -18px rgba(20,22,27,0.18)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-[12px]">
              <span className="text-[33px] font-bold" style={{ color: look.ink2, fontFamily: look.fontDisplay }}>
                {left.label}
              </span>
              <span className="text-[36px] font-extrabold tabular-nums" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {left.value}
              </span>
            </div>
            <div className="h-[72px] rounded-[20px] overflow-hidden" style={{ backgroundColor: look.paper }}>
              <div
                className="h-full rounded-[20px]"
                style={{ width: `${clamp(left.ratio * b1 * 100, 8, 100).toFixed(1)}%`, backgroundColor: look.ink3 }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-[12px]">
              <span className="text-[33px] font-bold" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {right.label}
              </span>
              <span className="text-[40px] font-extrabold tabular-nums" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
                {right.value}
              </span>
            </div>
            <div className="h-[72px] rounded-[20px] overflow-hidden" style={{ backgroundColor: look.paper }}>
              <div
                className="h-full rounded-[20px]"
                style={{ width: `${clamp(right.ratio * b2 * 100, 8, 100).toFixed(1)}%`, backgroundColor: look.accent }}
              />
            </div>
          </div>
        </div>

        <div
          className="w-full mt-[22px] rounded-[26px] px-[32px] py-[24px] flex items-center justify-between"
          style={{
            backgroundColor: look.ink,
            color: '#FFFFFF',
            opacity: clamp(0.4 + bottomP * 0.6, 0, 1),
            transform: `translateY(${(18 * (1 - bottomP)).toFixed(1)}px)`,
          }}
        >
          <div className="min-w-0 pr-[12px]">
            <div className="text-[22px] font-mono uppercase text-[#9CA3AF]">Bilan mesuré</div>
            <div className="text-[32px] font-extrabold truncate">{beat.statLabel || beat.title}</div>
          </div>
          <div className="text-[52px] font-extrabold font-mono text-[#60A5FA] tabular-nums shrink-0">
            {beat.statValue || right.value}
          </div>
        </div>
      </div>
    );
  }

  // 6. LEDGER BREAKDOWN (Multi-row quantified table with animated staggered rows & summary total bar)
  if (vType === 'ledger_breakdown') {
    const rows = (
      beat.ledgerRows && beat.ledgerRows.length > 0
        ? beat.ledgerRows
        : [
            { label: beat.comparisonLeft?.label || 'Référence initiale', value: beat.comparisonLeft?.value || 'Base', delta: 'Avant' },
            { label: beat.comparisonRight?.label || 'Ajustement clé', value: beat.comparisonRight?.value || beat.statValue || 'Optimisé', delta: 'Impact', highlight: true },
            { label: beat.statLabel || 'Résultat net', value: beat.statValue || 'Confirmé', delta: '2026' },
          ]
    ).slice(0, 4);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-end justify-between mb-[22px]">
          <div className="min-w-0">
            <div className="text-[26px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
              {beat.screenLabel}
            </div>
            <div className="text-[62px] font-extrabold leading-none tracking-[-0.03em] mt-[6px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.title}
            </div>
          </div>
          <div className="w-[74px] h-[74px] rounded-[20px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${look.accent}18` }}>
            <BeatVectorIcon kind={iconKind} size={40} color={look.accent} />
          </div>
        </div>

        <div
          className="w-full rounded-[34px] p-[28px] border space-y-[16px]"
          style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 28px 56px -18px rgba(20,22,27,0.16)' }}
        >
          {rows.map((r, idx) => {
            const rowAt = idx * 0.42 + 0.15;
            const rp = spring(localT - rowAt, 15);
            return (
              <div
                key={idx}
                className="rounded-[22px] px-[26px] py-[22px] border flex items-center justify-between gap-[16px]"
                style={{
                  backgroundColor: r.highlight ? '#14161B' : look.paper,
                  borderColor: r.highlight ? look.accent : look.line,
                  borderWidth: r.highlight ? '2.5px' : '1.5px',
                  opacity: localT >= rowAt ? clamp(rp * 1.6, 0, 1) : 0.2,
                  transform: `translateX(${((1 - rp) * 26).toFixed(1)}px)`,
                }}
              >
                <div className="min-w-0">
                  <div
                    className="text-[31px] font-extrabold truncate"
                    style={{ color: r.highlight ? '#FFFFFF' : look.ink, fontFamily: look.fontDisplay }}
                  >
                    {r.label}
                  </div>
                  {r.delta && (
                    <div
                      className="text-[22px] font-mono font-semibold mt-[4px]"
                      style={{ color: r.highlight ? '#60A5FA' : look.ink3 }}
                    >
                      {r.delta}
                    </div>
                  )}
                </div>
                <div
                  className="text-[40px] font-extrabold font-mono tabular-nums shrink-0"
                  style={{ color: r.highlight ? '#34D399' : look.accent, fontFamily: look.fontDisplay }}
                >
                  {r.value}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="w-full mt-[20px] rounded-[24px] px-[30px] py-[20px] flex items-center justify-between"
          style={{ backgroundColor: look.ink, color: '#FFFFFF' }}
        >
          <span className="text-[28px] font-bold truncate">{beat.statLabel || 'Synthèse chiffrée'}</span>
          <span className="text-[42px] font-extrabold font-mono text-[#60A5FA] tabular-nums shrink-0 ml-[12px]">
            {beat.statValue || rows[rows.length - 1]?.value || 'NET'}
          </span>
        </div>
      </div>
    );
  }

  // 7. VERDICT QUOTE (Editorial paper card with animated highlighter sweep + source attribution + stamp)
  if (vType === 'verdict_quote') {
    const sweepP = seg(localT, 0.35, Math.max(1.2, beatSpan * 0.55));
    const stampAt = Math.min(beatSpan * 0.55, 1.4);
    const stamped = localT >= stampAt;
    const stampP = spring(localT - stampAt, 20);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[18px]">
          <span className="text-[26px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
            {beat.screenLabel}
          </span>
          <span className="text-[24px] font-mono font-bold" style={{ color: look.ink3 }}>
            {beat.shortLabel || 'À RETENIR'}
          </span>
        </div>

        <div
          className="relative w-full rounded-[34px] p-[40px] border-2"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.ink,
            boxShadow: '0 28px 56px -18px rgba(20,22,27,0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-[18px]">
            <div className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center" style={{ backgroundColor: '#14161B' }}>
              <BeatVectorIcon kind={iconKind} size={36} color="#FFFFFF" />
            </div>
            <div
              className="px-[22px] py-[10px] rounded-[14px] border-[3px] text-[26px] font-extrabold font-mono uppercase"
              style={{
                borderColor: look.accent,
                color: look.accent,
                opacity: stamped ? clamp(stampP * 2, 0, 1) : 0.25,
                transform: `rotate(-4deg) scale(${(stamped ? 1.12 - 0.12 * stampP : 1).toFixed(3)})`,
              }}
            >
              {beat.stampWord || 'VERDICT'}
            </div>
          </div>

          <div
            className="text-[48px] font-extrabold leading-[1.16] tracking-[-0.02em] mb-[26px]"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            « {renderHighlightedText(
              beat.quoteText || beat.spokenLine || beat.title,
              beat.highlightPhrase,
              sweepP,
              look.accent
            )} »
          </div>

          <div className="pt-[18px] border-t flex items-center justify-between" style={{ borderColor: look.line }}>
            <span className="text-[25px] font-semibold" style={{ color: look.ink2 }}>
              {beat.quoteSource || beat.brollCaption || 'Synthèse terrain'}
            </span>
            <span className="text-[32px] font-extrabold font-mono tabular-nums" style={{ color: look.accent }}>
              {beat.statValue || '2026'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 8. RADAR PILLARS (Animated 3-pillar triangular SVG radar + 3 dynamic pillar bars)
  if (vType === 'radar_pillars') {
    const pillars = (beat.bullets && beat.bullets.length >= 3
      ? beat.bullets
      : ['Impact réel', 'Coût maîtrisé', 'Durabilité']
    ).slice(0, 3);
    const growP = seg(localT, 0.08, Math.min(1.1, beatSpan * 0.35));
    const scores = [0.88, 0.76, 0.92].map((s, i) => {
      const sub = beat.subStats?.[i]?.value || '';
      const outOf10 = sub.match(/(\d+(?:[.,]\d+)?)\s*\/\s*10\b/);
      if (outOf10) return clamp(Number(outOf10[1].replace(',', '.')) / 10, 0.25, 0.98);
      const outOf5 = sub.match(/(\d+(?:[.,]\d+)?)\s*\/\s*5\b/);
      if (outOf5) return clamp(Number(outOf5[1].replace(',', '.')) / 5, 0.25, 0.98);
      const pctOr100 = sub.match(/(\d+(?:[.,]\d+)?)\s*(?:%|\/\s*100\b)/);
      if (pctOr100) return clamp(Number(pctOr100[1].replace(',', '.')) / 100, 0.25, 0.98);
      const plain = sub.match(/\b(\d{2,3})\b/);
      if (plain) {
        const val = Number(plain[1]);
        if (val >= 25 && val <= 100) return clamp(val / 100, 0.25, 0.98);
      }
      return s;
    });

    // Triangle vertices at 120 deg intervals centered at (160, 160), max r=112
    const pts = scores.map((sc, i) => {
      const ang = (-90 + i * 120) * (Math.PI / 180);
      const r = 112 * sc * growP;
      return `${(160 + Math.cos(ang) * r).toFixed(1)},${(160 + Math.sin(ang) * r).toFixed(1)}`;
    }).join(' ');

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-end justify-between mb-[22px]">
          <div className="min-w-0">
            <div className="text-[26px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
              {beat.screenLabel}
            </div>
            <div className="text-[64px] font-extrabold leading-none tracking-[-0.03em] mt-[6px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.title}
            </div>
          </div>
          <span className="px-[18px] py-[8px] rounded-[14px] text-[24px] font-mono font-bold shrink-0" style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}>
            3 CRITÈRES
          </span>
        </div>

        <div className="w-full grid grid-cols-12 gap-[20px] items-stretch">
          {/* Radar SVG Card */}
          <div
            className="col-span-5 rounded-[30px] p-[22px] border flex flex-col items-center justify-center"
            style={{ backgroundColor: '#14161B', borderColor: '#2B313D', boxShadow: '0 24px 48px -18px rgba(20,22,27,0.28)' }}
          >
            <svg width="320" height="320" viewBox="0 0 320 320">
              {[0.35, 0.68, 1].map((ring, idx) => (
                <circle key={idx} cx="160" cy="160" r={112 * ring} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
              ))}
              {[0, 1, 2].map((i) => {
                const ang = (-90 + i * 120) * (Math.PI / 180);
                return (
                  <line
                    key={i}
                    x1="160"
                    y1="160"
                    x2={160 + Math.cos(ang) * 112}
                    y2={160 + Math.sin(ang) * 112}
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="2"
                  />
                );
              })}
              <polygon points={pts} fill={`${look.accent}55`} stroke={look.accent} strokeWidth="5" strokeLinejoin="round" />
            </svg>
            <div className="text-[24px] font-mono font-bold text-[#60A5FA] mt-[6px]">
              {beat.statLabel || 'Équilibre mesuré'}
            </div>
          </div>

          {/* 3 Pillar Bars */}
          <div className="col-span-7 flex flex-col justify-between gap-[16px]">
            {pillars.map((pText, idx) => {
              const pct = Math.round(scores[idx] * 100 * growP);
              const subBadge = beat.subStats?.[idx]?.value;
              return (
                <div
                  key={idx}
                  className="rounded-[24px] px-[24px] py-[20px] border"
                  style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 16px 32px -14px rgba(20,22,27,0.12)' }}
                >
                  <div className="flex items-baseline justify-between gap-[10px] mb-[10px]">
                    <span className="text-[24px] font-extrabold truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                      0{idx + 1} · {pText}
                    </span>
                    <span className="text-[22px] font-mono font-extrabold tabular-nums shrink-0" style={{ color: look.accent }}>
                      {subBadge || `${pct}%`}
                    </span>
                  </div>
                  <div className="h-[14px] rounded-full overflow-hidden" style={{ backgroundColor: look.paper }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: look.accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 9. CHECKLIST ACTION (3 concrete actionable items checking off sequentially)
  if (vType === 'checklist_action') {
    const items = (beat.bullets && beat.bullets.length > 0
      ? beat.bullets
      : ['Poser un repère chiffré', 'Supprimer la friction', 'Vérifier sous 30 jours']
    ).slice(0, 3);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[20px]">
          <span className="text-[50px] font-extrabold leading-none tracking-tight truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[24px] font-mono font-bold border shrink-0 ml-[10px]" style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.accent }}>
            {beat.screenLabel}
          </span>
        </div>

        <div className="w-full space-y-[18px]">
          {items.map((txt, idx) => {
            const checkAt = Math.min(beatSpan - 0.5, 0.45 + idx * 0.65);
            const checked = localT >= checkAt;
            const popP = spring(localT - checkAt, 18);

            return (
              <div
                key={idx}
                className="w-full rounded-[26px] border-2 px-[28px] py-[24px] flex items-center justify-between gap-[20px]"
                style={{
                  backgroundColor: checked ? '#14161B' : look.sheet,
                  borderColor: checked ? '#059669' : look.line,
                  boxShadow: '0 20px 40px -16px rgba(20,22,27,0.14)',
                }}
              >
                <div className="flex items-center gap-[18px] min-w-0">
                  <div
                    className="w-[54px] h-[54px] rounded-[16px] flex items-center justify-center shrink-0 font-mono font-extrabold text-[26px]"
                    style={{
                      backgroundColor: checked ? '#059669' : look.paper,
                      color: checked ? '#FFFFFF' : look.ink,
                      transform: `scale(${(checked ? 0.9 + 0.1 * popP : 1).toFixed(3)})`,
                    }}
                  >
                    {checked ? '✓' : idx + 1}
                  </div>
                  <span
                    className="text-[32px] font-extrabold leading-tight truncate"
                    style={{ color: checked ? '#FFFFFF' : look.ink, fontFamily: look.fontDisplay }}
                  >
                    {txt}
                  </span>
                </div>
                <span
                  className="text-[22px] font-mono font-bold shrink-0"
                  style={{ color: checked ? '#34D399' : look.ink3 }}
                >
                  {checked ? 'FAIT' : 'À FAIRE'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 10. TOGGLES SWITCH
  if (vType === 'toggles_switch' || vType === 'key_points') {
    const items =
      beat.toggles && beat.toggles.length > 0
        ? beat.toggles.slice(0, 3)
        : (beat.bullets || ['Règle 1 activée', 'Synthèse automatique', 'Suivi en direct']).slice(0, 3).map((b) => ({
            label: b,
            before: 'MANUEL',
            after: 'AUTO',
            activeAfter: true,
          }));

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[20px]">
          <span className="text-[50px] font-extrabold leading-none tracking-tight truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[24px] font-mono font-bold border shrink-0 ml-[10px]" style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.accent }}>
            {beat.screenLabel}
          </span>
        </div>

        <div className="w-full space-y-[18px]">
          {items.map((item, idx) => {
            const flipAt = Math.min(beatSpan - 0.6, 0.5 + idx * 0.72);
            const flipped = localT >= flipAt;
            const slideAnim = spring(localT - flipAt, 16);
            const knobPos = flipped ? 54 * slideAnim : 0;

            return (
              <div
                key={idx}
                className="w-full rounded-[26px] border-2 px-[30px] py-[24px] flex items-center justify-between gap-[20px]"
                style={{
                  backgroundColor: look.sheet,
                  borderColor: flipped ? (item.activeAfter ? '#059669' : '#DC2626') : look.line,
                  boxShadow: '0 20px 40px -16px rgba(20,22,27,0.14)',
                }}
              >
                <div className="min-w-0">
                  <div className="text-[32px] font-extrabold leading-tight truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                    {item.label}
                  </div>
                  <div
                    className="text-[23px] font-mono font-bold mt-[4px]"
                    style={{ color: flipped ? (item.activeAfter ? '#059669' : '#DC2626') : look.ink3 }}
                  >
                    {flipped ? item.after : item.before}
                  </div>
                </div>

                <div
                  className="relative w-[108px] h-[54px] rounded-full shrink-0 p-[5px]"
                  style={{
                    backgroundColor: flipped ? (item.activeAfter ? '#059669' : '#DC2626') : look.line,
                  }}
                >
                  <div
                    className="w-[44px] h-[44px] rounded-full bg-white shadow"
                    style={{ transform: `translateX(${knobPos.toFixed(1)}px)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 11. TERMINAL FLOW (Dev/Code topics only)
  if (vType === 'terminal_flow') {
    const cmd = beat.terminalCmd || '> audit --pipeline-2026';
    const typedLen = Math.floor(cmd.length * seg(localT, 0.15, Math.min(1.4, beatSpan * 0.35)));
    const outLines = beat.terminalOut || ['✓ Goulot identifié', '✓ Latence réduite', '✓ Pipeline vérifié'];

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[18px]">
          <span className="text-[50px] font-extrabold leading-none truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[24px] font-mono font-bold border shrink-0 ml-[10px]" style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.accent }}>
            {beat.screenLabel}
          </span>
        </div>

        <div
          className="w-full rounded-[30px] p-[34px] border border-white/10"
          style={{ backgroundColor: '#14161B', boxShadow: '0 28px 56px -18px rgba(20,22,27,0.28)' }}
        >
          <div className="flex items-center gap-[10px] mb-[20px]">
            <span className="w-[14px] h-[14px] rounded-full bg-[#EF4444]" />
            <span className="w-[14px] h-[14px] rounded-full bg-[#F59E0B]" />
            <span className="w-[14px] h-[14px] rounded-full bg-[#10B981]" />
            <span className="ml-[12px] text-[22px] font-mono text-white/45">workflow · cli</span>
          </div>

          <div className="text-[32px] font-mono font-bold text-[#60A5FA] mb-[20px]">
            {cmd.slice(0, typedLen)}
            <span className="inline-block w-[14px] h-[30px] bg-white/80 ml-[6px] align-middle" />
          </div>

          <div className="space-y-[12px]">
            {outLines.slice(0, 3).map((line, idx) => {
              const showAt = Math.min(beatSpan * 0.72, 1.1 + idx * 0.55);
              const lineP = spring(localT - showAt, 15);
              return (
                <div
                  key={idx}
                  className="text-[29px] font-mono font-semibold text-white/95 rounded-[14px] px-[20px] py-[12px] bg-white/5"
                  style={{
                    opacity: localT >= showAt ? clamp(lineP * 1.4, 0, 1) : 0.12,
                    transform: `translateX(${((1 - lineP) * 18).toFixed(1)}px)`,
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="w-full mt-[20px] rounded-[26px] border px-[32px] py-[22px] flex items-center justify-between"
          style={{ backgroundColor: look.sheet, borderColor: look.accent, borderWidth: '2px' }}
        >
          <div className="flex items-center gap-[16px] min-w-0">
            <div className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${look.accent}18` }}>
              <BeatVectorIcon kind={iconKind} size={32} color={look.accent} />
            </div>
            <span className="text-[29px] font-bold truncate" style={{ color: look.ink }}>
              {beat.statLabel || 'Résultat mesuré'}
            </span>
          </div>
          <span className="text-[54px] font-extrabold font-mono tabular-nums shrink-0 ml-[12px]" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
            {beat.statValue || 'VALIDÉ'}
          </span>
        </div>
      </div>
    );
  }

  // 12. CTA CARD
  const clickAt = Math.min(1.1, beatSpan * 0.35);
  const clicked = localT >= clickAt;
  const waveP = seg(localT, clickAt, clickAt + 0.85);
  const bellShake = clicked && localT < clickAt + 0.65 ? Math.sin((localT - clickAt) * 35) * 14 : 0;

  return (
    <div
      className="w-full flex flex-col items-center justify-center pt-[70px]"
      style={{
        opacity: clamp(enter * 2.8, 0, 1) * exit,
        transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      <div className="text-[30px] font-mono font-bold uppercase tracking-wider mb-[18px]" style={{ color: look.accent }}>
        {beat.screenLabel || 'PROCHAIN ÉPISODE'}
      </div>
      <div
        className="text-[64px] font-extrabold text-center leading-[1.04] mb-[40px]"
        style={{ color: look.ink, fontFamily: look.fontDisplay }}
      >
        {beat.title}
      </div>

      <div
        className="relative w-full rounded-[34px] border-2 px-[42px] py-[40px] flex items-center justify-between gap-[24px]"
        style={{
          backgroundColor: '#14161B',
          borderColor: clicked ? '#059669' : '#2A2E37',
          boxShadow: '0 32px 64px -18px rgba(20,22,27,0.34)',
        }}
      >
        <div className="flex items-center gap-[24px] min-w-0">
          <div
            className="w-[92px] h-[92px] rounded-[24px] flex items-center justify-center text-[46px] font-extrabold shrink-0"
            style={{ backgroundColor: look.accent, color: look.onAccent, fontFamily: look.fontDisplay }}
          >
            {CREATOR_PROFILE.initial}
          </div>
          <div className="min-w-0">
            <div className="text-[40px] font-extrabold text-white truncate" style={{ fontFamily: look.fontDisplay }}>
              {beat.statValue || CREATOR_PROFILE.handle}
            </div>
            <div className="text-[25px] text-[#9CA3AF] truncate">
              {beat.statLabel || CREATOR_PROFILE.tagline}
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-[14px] shrink-0">
          <div
            className="px-[34px] py-[20px] rounded-[20px] text-[30px] font-extrabold"
            style={{
              backgroundColor: clicked ? '#059669' : look.accent,
              color: '#FFFFFF',
            }}
          >
            {clicked ? 'Abonné ✓' : 'S’abonner'}
          </div>
          <div
            className="w-[62px] h-[62px] rounded-[18px] bg-white/10 flex items-center justify-center"
            style={{ transform: `rotate(${bellShake.toFixed(1)}deg)` }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={clicked ? '#34D399' : '#FFFFFF'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          {clicked && waveP < 1 && (
            <span
              className="absolute inset-0 rounded-[20px] border-4 pointer-events-none"
              style={{
                borderColor: '#059669',
                transform: `scale(${(1 + waveP * 0.4).toFixed(2)})`,
                opacity: 1 - waveP,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export const DynamicShortStage: React.FC<DynamicShortStageProps> = ({
  project,
  t,
  look,
  showSafeZones,
  renderMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(renderMode ? 1 : 0.32);

  useEffect(() => {
    if (renderMode) {
      setScale(1);
      return;
    }
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
  }, [renderMode]);

  const beats = useMemo(() => buildDynamicBeatsFromProject(project), [project]);
  const activeBeat =
    beats.find((b) => t >= b.from && t < b.to) || beats[beats.length - 1];

  const layoutKeys = useMemo<Array<[number, number]>>(
    () =>
      beats.map((b) => [
        b.from,
        b.layout === 'fullscreen' ? 1920 : 1160,
      ]),
    [beats]
  );

  const seam = getLayoutSeam(t, layoutKeys, 0.34);
  const brollAsset = resolveBrollAsset(
    activeBeat.brollKey,
    project.topicCategory,
    project.title,
    activeBeat.index
  );

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
  const beatNorm = clamp(beatLocalT / beatSpan, 0, 1);

  // Per-beat Ken Burns variety so consecutive B-Rolls don't pan identically
  const motionMode = activeBeat.index % 4;
  const kbScale =
    motionMode === 0
      ? 1.04 + beatNorm * 0.06
      : motionMode === 1
        ? 1.1 - beatNorm * 0.05
        : 1.06 + Math.sin(beatNorm * Math.PI) * 0.03;
  const kbX =
    motionMode === 2
      ? -12 + beatNorm * 24
      : motionMode === 3
        ? 12 - beatNorm * 24
        : 0;

  const gridShiftY = (t * 20) % 44;
  const gridShiftX = Math.sin(t * 0.28) * 14;

  // Unified caption Y coordinate matched to ShortCaptions.tsx
  let captionTopY = 1130;
  if (seam >= 1650) captionTopY = 1365;
  else if (seam <= 300) captionTopY = 1230;
  else captionTopY = seam - 24;
  const overVideo = seam <= 600;

  return (
    <div
      ref={containerRef}
      data-testid="dynamic-short-stage"
      className={
        renderMode
          ? 'relative w-[1080px] h-[1920px] overflow-hidden bg-[#F1EEE6] select-none'
          : 'relative w-full h-full aspect-[9/16] rounded-[20px] overflow-hidden border border-[#E3DED3] bg-[#F1EEE6] select-none'
      }
    >
      <div
        style={{
          width: '1080px',
          height: '1920px',
          transform: renderMode ? undefined : `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: look.paper,
        }}
        className="relative overflow-hidden"
      >
        {/* Paper Grain */}
        {look.grain && <div className="absolute inset-0 paper-grain opacity-85 pointer-events-none" />}

        {/* Dot-matrix grid + 3 drifting ambient sky-blue glows */}
        {seam > 200 && (
          <div className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none" style={{ height: `${seam.toFixed(1)}px` }}>
            <div
              className="absolute inset-0 opacity-28"
              style={{
                backgroundImage: `radial-gradient(${look.ink3} 1.5px, transparent 1.5px)`,
                backgroundSize: '44px 44px',
                backgroundPosition: `${gridShiftX.toFixed(1)}px ${gridShiftY.toFixed(1)}px`,
              }}
            />

            <div
              className="absolute w-[840px] h-[840px] rounded-full blur-[34px]"
              style={{
                left: `${(120 + Math.sin(t * 0.48) * 320).toFixed(1)}px`,
                top: `${(-90 + Math.cos(t * 0.34) * 260).toFixed(1)}px`,
                background:
                  'radial-gradient(circle, rgba(37,142,255,0.22) 0%, rgba(96,165,250,0.09) 42%, rgba(37,142,255,0) 72%)',
                transform: `scale(${(1 + 0.08 * Math.sin(t * 0.62)).toFixed(3)})`,
              }}
            />
            <div
              className="absolute w-[720px] h-[720px] rounded-full blur-[38px]"
              style={{
                left: `${(220 + Math.cos(t * 0.39 + 1.4) * 340).toFixed(1)}px`,
                top: `${(seam * 0.42 - 120 + Math.sin(t * 0.3 + 0.7) * 240).toFixed(1)}px`,
                background:
                  'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(147,197,253,0.07) 48%, rgba(56,189,248,0) 74%)',
                transform: `scale(${(1 + 0.07 * Math.cos(t * 0.5)).toFixed(3)})`,
              }}
            />
            <div
              className="absolute w-[580px] h-[580px] rounded-full blur-[30px]"
              style={{
                left: `${(240 + Math.sin(t * 0.27 + 2.5) * 280).toFixed(1)}px`,
                top: `${(160 + Math.sin(t * 0.44 + 1.1) * 290).toFixed(1)}px`,
                background:
                  'radial-gradient(circle, rgba(37,142,255,0.14) 0%, rgba(191,219,254,0.05) 52%, rgba(37,142,255,0) 76%)',
              }}
            />
          </div>
        )}

        {/* Lower Split-Screen B-Roll Panel */}
        {seam < 1918 && (
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden z-10"
            style={{
              top: `${seam.toFixed(1)}px`,
              borderTopLeftRadius: seam > 20 ? '36px' : '0px',
              borderTopRightRadius: seam > 20 ? '36px' : '0px',
              boxShadow: seam > 20 ? '0 -24px 52px rgba(20, 22, 27, 0.22)' : 'none',
            }}
          >
            <img
              src={brollAsset.src}
              alt={activeBeat.brollCaption || brollAsset.defaultCaption}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{
                transform: `scale(${kbScale.toFixed(4)}) translateX(${kbX.toFixed(1)}px)`,
                transformOrigin: 'center center',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/22 to-black/38" />

            {seam > 300 && (
              <div className="absolute bottom-[64px] left-[56px] right-[180px] flex items-center justify-between text-white/95">
                <div className="flex items-center gap-[14px]">
                  <span
                    className="w-[14px] h-[14px] rounded-full"
                    style={{
                      backgroundColor: look.accent,
                      transform: `scale(${(0.85 + 0.3 * Math.abs(Math.sin(t * 4.5))).toFixed(2)})`,
                    }}
                  />
                  <div className="text-[30px] font-bold tracking-[-0.01em] drop-shadow">
                    {activeBeat.brollCaption || brollAsset.defaultCaption}
                  </div>
                </div>
                <span className="text-[26px] font-mono font-bold text-white/80 tabular-nums">
                  {t.toFixed(1)} s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Upper Kinetic Motion Stage (z-20, right-rail safe pr-[148px]) */}
        <div className="relative z-20 w-full h-full pt-[192px] pl-[58px] pr-[148px] pointer-events-none">
          {renderDynamicBeatScene(activeBeat, beatLocalT, beatSpan, look)}
        </div>

        {/* Unified 4-word Captions Capsule on seam (z-30) */}
        {activeChunk && (
          <div
            className="absolute inset-x-0 flex justify-center items-center px-[56px] pointer-events-none z-30"
            style={{ top: `${captionTopY.toFixed(1)}px`, transform: 'translateY(-50%)' }}
          >
            <div
              className="inline-flex flex-wrap items-baseline justify-center gap-x-[15px] px-[38px] py-[18px] rounded-[24px] border max-w-[920px]"
              style={{
                backgroundColor: overVideo ? 'rgba(20, 22, 27, 0.86)' : 'rgba(252, 251, 248, 0.96)',
                borderColor: overVideo ? 'rgba(255, 255, 255, 0.14)' : look.line,
                boxShadow: '0 18px 42px -12px rgba(20, 22, 27, 0.24)',
              }}
            >
              {activeChunk.words.map((w, idx) => {
                const isActive = idx === activeChunk.activeIndex;
                const isPast = idx < activeChunk.activeIndex;
                const highlightColor = overVideo ? '#5EA8FF' : look.accent;
                const baseColor = overVideo
                  ? isPast
                    ? '#FFFFFF'
                    : 'rgba(255, 255, 255, 0.72)'
                  : isPast
                    ? look.ink
                    : look.ink2;

                return (
                  <span
                    key={`${w.text}-${idx}`}
                    className="font-extrabold leading-[1.12] tracking-[-0.03em]"
                    style={{
                      fontFamily: look.fontDisplay,
                      fontSize: '66px',
                      color: isActive || w.emph ? highlightColor : baseColor,
                    }}
                  >
                    {w.text}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Safe Zones Overlay (Studio inspection only) */}
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
            <div className="absolute right-0 top-[900px] bottom-[420px] w-[140px] bg-amber-500/20 border-l-2 border-dashed border-amber-500" />
          </div>
        )}
      </div>
    </div>
  );
};
