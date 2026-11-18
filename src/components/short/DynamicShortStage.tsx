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
  if (kind === 'shield') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (kind === 'bank') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 9 12 3 21 9 3 9" />
        <line x1="6" y1="13" x2="6" y2="18" />
        <line x1="10" y1="13" x2="10" y2="18" />
        <line x1="14" y1="13" x2="14" y2="18" />
        <line x1="18" y1="13" x2="18" y2="18" />
        <line x1="3" y1="21" x2="21" y2="21" />
      </svg>
    );
  }
  if (kind === 'alert') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (kind === 'scale') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="3" x2="12" y2="21" />
        <path d="M4 7h16" />
        <path d="M2 14l2.5-7L7 14a2.8 2.8 0 0 1-5 0z" />
        <path d="M17 14l2.5-7L22 14a2.8 2.8 0 0 1-5 0z" />
      </svg>
    );
  }
  if (kind === 'users') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  // Default: AI Neural Spark
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}

function animateStatValue(rawStat: string | undefined, progress: number): string {
  const s = String(rawStat || '80 %');
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

function CursorPointer({
  x,
  y,
  pressing = false,
  visible = true,
}: {
  x: number;
  y: number;
  pressing?: boolean;
  visible?: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="absolute z-40 pointer-events-none"
      style={{
        left: `${x.toFixed(1)}px`,
        top: `${y.toFixed(1)}px`,
        transform: `translate(-4px, -3px) scale(${pressing ? 0.84 : 1})`,
        filter: 'drop-shadow(0 10px 18px rgba(17,24,39,0.34))',
      }}
    >
      <svg width="42" height="48" viewBox="0 0 28 32" fill="none">
        <path
          d="M4 2.5L23.5 16.5L14.4 18.2L18.6 26.8L14.4 28.8L10.2 20.1L4 25.4V2.5Z"
          fill="#111827"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function ClickRipple({
  x,
  y,
  progress,
  color = '#258EFF',
}: {
  x: number;
  y: number;
  progress: number;
  color?: string;
}) {
  if (progress <= 0 || progress >= 1) return null;
  const size = 28 + progress * 92;
  return (
    <div
      className="absolute z-30 rounded-full border-4 pointer-events-none"
      style={{
        left: `${x.toFixed(1)}px`,
        top: `${y.toFixed(1)}px`,
        width: `${size.toFixed(1)}px`,
        height: `${size.toFixed(1)}px`,
        borderColor: color,
        transform: 'translate(-50%, -50%)',
        opacity: clamp(1 - progress, 0, 1) * 0.85,
      }}
    />
  );
}

function HighlighterSweep({
  text,
  highlight,
  progress,
  highlightColor = '#FDE047',
}: {
  text: string;
  highlight?: string;
  progress: number;
  highlightColor?: string;
}) {
  const cleanHighlight = (highlight || '').trim();
  const sweepPct = Math.round(clamp(progress, 0, 1) * 100);
  if (!cleanHighlight) {
    return <span>{text}</span>;
  }
  const idx = text.toLowerCase().indexOf(cleanHighlight.toLowerCase());
  if (idx === -1) {
    return (
      <span>
        {text}{' '}
        <span
          className="px-[8px] py-[2px] rounded-[8px] font-extrabold"
          style={{
            backgroundImage: `linear-gradient(90deg, ${highlightColor} ${sweepPct}%, transparent ${sweepPct}%)`,
          }}
        >
          {cleanHighlight}
        </span>
      </span>
    );
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + cleanHighlight.length);
  const after = text.slice(idx + cleanHighlight.length);
  return (
    <span>
      {before}
      <span
        className="px-[6px] py-[1px] rounded-[8px] font-extrabold"
        style={{
          backgroundImage: `linear-gradient(90deg, ${highlightColor} ${sweepPct}%, rgba(253,224,71,0.14) ${sweepPct}%)`,
        }}
      >
        {match}
      </span>
      {after}
    </span>
  );
}

function MacWindowChrome({
  url,
  badge,
  dark = false,
  children,
}: {
  url: string;
  badge?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="w-full rounded-[30px] border-2 overflow-hidden"
      style={{
        backgroundColor: dark ? '#14161B' : '#FFFFFF',
        borderColor: dark ? 'rgba(255,255,255,0.14)' : '#D9D3C7',
        boxShadow: '0 28px 56px -18px rgba(20,22,27,0.22)',
      }}
    >
      <div
        className="px-[24px] py-[14px] border-b flex items-center justify-between gap-[16px]"
        style={{
          backgroundColor: dark ? '#1C2029' : '#F6F4EE',
          borderColor: dark ? 'rgba(255,255,255,0.08)' : '#E4DFD4',
        }}
      >
        <div className="flex items-center gap-[9px] shrink-0">
          <span className="w-[14px] h-[14px] rounded-full bg-[#FF5F56]" />
          <span className="w-[14px] h-[14px] rounded-full bg-[#FFBD2E]" />
          <span className="w-[14px] h-[14px] rounded-full bg-[#27C93F]" />
        </div>
        <div
          className="flex-1 mx-[14px] rounded-[12px] px-[18px] py-[7px] text-[22px] font-mono truncate text-center border"
          style={{
            backgroundColor: dark ? '#111318' : '#FFFFFF',
            borderColor: dark ? 'rgba(255,255,255,0.08)' : '#E4DFD4',
            color: dark ? '#93C5FD' : '#4B5563',
          }}
        >
          🔒 {url}
        </div>
        {badge && (
          <span
            className="text-[20px] font-mono font-bold px-[12px] py-[4px] rounded-[10px] shrink-0"
            style={{
              backgroundColor: dark ? 'rgba(37,142,255,0.18)' : 'rgba(37,142,255,0.12)',
              color: dark ? '#60A5FA' : '#258EFF',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function renderDynamicBeatScene(
  beat: DynamicBeat,
  localT: number,
  beatSpan: number,
  look: LookPreset
) {
  const vType = beat.visualType || 'hook_shatter';
  const enter = beat.index === 1 && localT < 0.05 ? 1 : clamp(spring(localT, 20) * 1.15, 0.18, 1);
  const exit = Math.max(0.18, leave(localT, beatSpan, 0.14));
  const iconKind: DynamicIconKind = beat.iconKind || 'ai';

  // 1A. HOOK ALERT (Breaking rule / Date countdown / Official flash)
  if (vType === 'hook_alert') {
    const splitAt = clamp(beatSpan * 0.45, 1.35, 2.2);
    const flipped = localT >= splitAt;
    const pulse = 0.85 + 0.25 * Math.abs(Math.sin(localT * 7));
    const dateP = spring(localT - 0.1, 18);
    const cardP = spring(localT - splitAt, 20);
    const dateBadge = beat.dateBadge || 'DÈS 2026';

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(18 * (1 - enter) - 16 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div
          className="w-full rounded-[28px] p-[30px] border-2 mb-[20px] flex items-center justify-between"
          style={{
            backgroundColor: '#14161B',
            borderColor: flipped ? '#DC2626' : look.accent,
            boxShadow: '0 26px 52px -16px rgba(20,22,27,0.28)',
            transform: `scale(${(0.96 + 0.04 * dateP).toFixed(3)})`,
          }}
        >
          <div className="flex items-center gap-[18px] min-w-0">
            <div
              className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: flipped ? '#DC2626' : look.accent }}
            >
              <BeatVectorIcon kind={iconKind === 'ai' ? 'alert' : iconKind} size={36} color="#FFFFFF" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-[10px]">
                <span
                  className="w-[12px] h-[12px] rounded-full shrink-0"
                  style={{ backgroundColor: '#EF4444', transform: `scale(${pulse.toFixed(2)})` }}
                />
                <span className="text-[22px] font-mono font-bold uppercase text-[#FCA5A5] truncate">
                  {beat.screenLabel || 'NOUVEAU CADRE'}
                </span>
              </div>
              <div
                className="text-[36px] font-extrabold text-white leading-[1.12] mt-[4px] line-clamp-2"
                style={{ fontFamily: look.fontDisplay }}
              >
                {beat.title}
              </div>
            </div>
          </div>

          <div
            className="px-[22px] py-[12px] rounded-[16px] text-right shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="text-[18px] font-mono uppercase text-white/60">Échéance</div>
            <div className="text-[32px] font-extrabold text-[#60A5FA] font-mono whitespace-nowrap">
              {dateBadge}
            </div>
          </div>
        </div>

        <div
          className="w-full rounded-[32px] p-[32px] border flex items-center justify-between gap-[24px] mb-[20px]"
          style={{
            backgroundColor: look.sheet,
            borderColor: flipped ? '#DC2626' : look.line,
            borderWidth: flipped ? '2.5px' : '1.5px',
            boxShadow: '0 24px 48px -16px rgba(20,22,27,0.16)',
          }}
        >
          <div className="min-w-0 space-y-[8px]">
            <div className="text-[22px] font-mono font-bold uppercase" style={{ color: flipped ? '#DC2626' : look.accent }}>
              {flipped ? (beat.stampWord || 'CE QUI CHANGE') : 'IMPACT IMMÉDIAT'}
            </div>
            <div className="text-[38px] font-extrabold leading-[1.12]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.statLabel || 'Nouvelles conditions en vigueur'}
            </div>
          </div>

          <div
            className="px-[28px] py-[20px] rounded-[24px] text-center shrink-0"
            style={{
              backgroundColor: flipped ? '#DC2626' : look.accent,
              color: '#FFFFFF',
              transform: `scale(${(0.92 + 0.08 * (flipped ? cardP : dateP)).toFixed(3)}) rotate(${flipped ? '-2' : '0'}deg)`,
            }}
          >
            <div className="text-[58px] font-extrabold leading-none tabular-nums" style={{ fontFamily: look.fontDisplay }}>
              {beat.statValue || dateBadge}
            </div>
          </div>
        </div>

        {/* Kinetic Dual Signal Footer filling split zone down to caption seam */}
        <div className="w-full grid grid-cols-2 gap-[18px]">
          <div
            className="rounded-[24px] px-[26px] py-[22px] border flex items-center justify-between gap-[14px]"
            style={{ backgroundColor: look.sheet, borderColor: look.line }}
          >
            <div>
              <div className="text-[20px] font-mono font-bold uppercase" style={{ color: look.ink3 }}>
                {beat.leftCard?.label || 'Régime actuel'}
              </div>
              <div className="text-[32px] font-extrabold mt-[4px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {beat.leftCard?.value || 'En fin de cycle'}
              </div>
            </div>
            <span className="w-[14px] h-[54px] rounded-full shrink-0" style={{ backgroundColor: look.ink3 }} />
          </div>
          <div
            className="rounded-[24px] px-[26px] py-[22px] flex items-center justify-between gap-[14px]"
            style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
          >
            <div>
              <div className="text-[20px] font-mono font-bold uppercase text-[#60A5FA]">
                {beat.rightCard?.label || 'Nouveau cadre'}
              </div>
              <div className="text-[32px] font-extrabold mt-[4px]" style={{ fontFamily: look.fontDisplay }}>
                {beat.rightCard?.value || dateBadge}
              </div>
            </div>
            <span className="w-[14px] h-[54px] rounded-full shrink-0" style={{ backgroundColor: flipped ? '#DC2626' : look.accent }} />
          </div>
        </div>
      </div>
    );
  }

  // 1B. HOOK VERSUS (Colliding 2-side paradox clash: A vs B + lightning badge)
  if (vType === 'hook_versus') {
    const clashAt = clamp(beatSpan * 0.44, 1.35, 2.2);
    const clashed = localT >= clashAt;
    const slideP = spring(localT, 16);
    const stampP = spring(localT - clashAt, 22);
    const leftC = beat.leftCard || { label: 'Ce qu’on croit', value: '98 %', sub: 'En surface' };
    const rightC = beat.rightCard || { label: 'Réalité mesurée', value: beat.statValue || '-28 %', sub: 'Sur le terrain' };

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(18 * (1 - enter) - 16 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[18px]">
          <span className="text-[34px] font-extrabold tracking-[-0.02em] truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span
            className="px-[16px] py-[6px] rounded-[12px] text-[22px] font-mono font-bold"
            style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
          >
            {beat.screenLabel || 'PARADOXE'}
          </span>
        </div>

        <div className="relative w-full grid grid-cols-2 gap-[24px] items-stretch">
          <div
            className="rounded-[30px] p-[28px] pr-[48px] border-2 flex flex-col justify-between min-h-[340px]"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.line,
              transform: `translateX(${((1 - slideP) * -40).toFixed(1)}px)`,
              boxShadow: '0 22px 44px -14px rgba(20,22,27,0.14)',
            }}
          >
            <div className="text-[24px] font-mono font-bold uppercase" style={{ color: look.ink3 }}>
              {leftC.label}
            </div>
            <div
              className="text-[78px] font-extrabold leading-none tracking-[-0.04em] my-[14px]"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {leftC.value}
            </div>
            <div className="text-[28px] font-bold" style={{ color: look.ink2 }}>
              {leftC.sub}
            </div>
          </div>

          <div
            className="rounded-[30px] p-[28px] pl-[48px] border-2 flex flex-col justify-between min-h-[340px]"
            style={{
              backgroundColor: '#14161B',
              borderColor: clashed ? '#DC2626' : look.accent,
              transform: `translateX(${((1 - slideP) * 40).toFixed(1)}px)`,
              boxShadow: '0 26px 52px -14px rgba(20,22,27,0.28)',
            }}
          >
            <div className="text-[24px] font-mono font-bold uppercase text-[#60A5FA]">
              {rightC.label}
            </div>
            <div
              className="text-[78px] font-extrabold leading-none tracking-[-0.04em] my-[14px] text-white"
              style={{ fontFamily: look.fontDisplay }}
            >
              {rightC.value}
            </div>
            <div className="text-[28px] font-bold text-white/80">
              {rightC.sub}
            </div>
          </div>

          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[74px] h-[74px] rounded-full border-4 flex items-center justify-center text-[30px] font-extrabold"
            style={{
              backgroundColor: clashed ? '#DC2626' : look.accent,
              borderColor: look.paper,
              color: '#FFFFFF',
              transform: `scale(${(clashed ? 1.12 - 0.12 * stampP : 0.92).toFixed(3)})`,
              boxShadow: '0 16px 32px rgba(20,22,27,0.28)',
            }}
          >
            VS
          </div>
        </div>

        <div
          className="w-full mt-[20px] rounded-[22px] px-[28px] py-[20px] border flex items-center justify-between"
          style={{ backgroundColor: look.sheet, borderColor: clashed ? '#DC2626' : look.line }}
        >
          <span className="text-[28px] font-extrabold truncate" style={{ color: look.ink }}>
            {beat.statLabel || 'Écart mesuré en 2026'}
          </span>
          <span
            className="px-[18px] py-[6px] rounded-[12px] text-[24px] font-mono font-extrabold"
            style={{ backgroundColor: clashed ? '#DC2626' : look.accent, color: '#FFFFFF' }}
          >
            {beat.stampWord || 'PARADOXE'}
          </span>
        </div>

        {/* Bottom Kinetic Tension Meter */}
        <div
          className="w-full mt-[16px] rounded-[22px] px-[26px] py-[18px] flex items-center justify-between gap-[16px]"
          style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
        >
          <span className="text-[22px] font-mono font-bold text-[#60A5FA] uppercase shrink-0">
            FRACTURE EN DIRECT
          </span>
          <div className="flex-1 h-[10px] rounded-full bg-white/12 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(35 + 60 * seg(localT, 0.15, clashAt + 0.6))}%`,
                backgroundColor: clashed ? '#DC2626' : look.accent,
              }}
            />
          </div>
          <span className="text-[24px] font-mono font-extrabold text-white shrink-0">
            {beat.statValue || '-28 %'}
          </span>
        </div>
      </div>
    );
  }

  // 1C. HOOK STAT (Giant kinetic rolling stat counter + live tension cards)
  if (vType === 'hook_stat') {
    const countP = seg(localT, 0.08, Math.min(1.6, beatSpan * 0.42));
    const locked = localT >= Math.min(1.65, beatSpan * 0.44);
    const stampP = spring(localT - Math.min(1.65, beatSpan * 0.44), 22);
    const animStat = animateStatValue(beat.statValue || '80 %', Math.max(0.15, countP));
    const kpi1 = beat.subStats?.[0] || { value: beat.statValue || '80 %', label: 'Chiffre clé' };
    const kpi2 = beat.subStats?.[1] || { value: '2026', label: 'En cours' };

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(18 * (1 - enter) - 16 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div
          className="w-full rounded-[34px] p-[36px] border-2 flex flex-col items-center text-center relative overflow-hidden"
          style={{
            backgroundColor: look.sheet,
            borderColor: locked ? look.accent : look.line,
            boxShadow: '0 28px 56px -16px rgba(20,22,27,0.18)',
          }}
        >
          <div className="flex items-center gap-[12px] mb-[10px]">
            <BeatVectorIcon kind={iconKind} size={32} color={look.accent} />
            <span className="text-[24px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
              {beat.screenLabel || 'CHIFFRE CHOC'}
            </span>
          </div>

          <div
            className="text-[128px] font-extrabold leading-none tracking-[-0.05em] tabular-nums my-[10px]"
            style={{ color: locked ? '#DC2626' : look.ink, fontFamily: look.fontDisplay }}
          >
            {animStat}
          </div>

          <div className="text-[36px] font-extrabold leading-tight max-w-[740px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </div>

          {locked && (
            <div
              className="mt-[18px] px-[26px] py-[8px] rounded-[14px] text-[24px] font-mono font-extrabold uppercase"
              style={{
                backgroundColor: '#14161B',
                color: '#FFFFFF',
                transform: `scale(${(1.15 - 0.15 * stampP).toFixed(3)})`,
              }}
            >
              {beat.stampWord || 'MESURÉ'} · {beat.statLabel || 'En France'}
            </div>
          )}
        </div>

        <div className="w-full mt-[18px] grid grid-cols-2 gap-[18px]">
          {[kpi1, kpi2].map((kpi, idx) => (
            <div
              key={idx}
              className="rounded-[24px] px-[24px] py-[20px] border flex items-center justify-between gap-[12px]"
              style={{ backgroundColor: look.sheet, borderColor: look.line }}
            >
              <span className="text-[24px] font-bold truncate" style={{ color: look.ink2 }}>
                {kpi.label}
              </span>
              <span className="text-[38px] font-extrabold font-mono tabular-nums" style={{ color: idx === 0 ? look.accent : look.ink }}>
                {kpi.value}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom Dark Signal Progress Anchor */}
        <div
          className="w-full mt-[16px] rounded-[22px] px-[26px] py-[18px] flex items-center justify-between gap-[16px]"
          style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
        >
          <span className="text-[22px] font-mono font-bold uppercase text-[#60A5FA] shrink-0">
            INDICE MESURÉ
          </span>
          <div className="flex-1 h-[10px] rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(clamp(countP * 88 + 10, 18, 96))}%`,
                backgroundColor: locked ? '#DC2626' : look.accent,
              }}
            />
          </div>
          <span className="text-[24px] font-mono font-extrabold text-[#34D399] shrink-0">
            {locked ? 'CONFIRMÉ ✓' : 'ANALYSE'}
          </span>
        </div>
      </div>
    );
  }

  // 1D. HOOK QUESTION (Bold myth crossed out -> flipped verdict card)
  if (vType === 'hook_question') {
    const slashAt = clamp(beatSpan * 0.44, 1.35, 2.2);
    const slashed = localT >= slashAt;
    const slashP = seg(localT, slashAt, slashAt + 0.35);
    const revealP = spring(localT - slashAt - 0.1, 18);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(18 * (1 - enter) - 16 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div
          className="relative w-full rounded-[32px] p-[34px] border-2 mb-[20px] overflow-hidden"
          style={{
            backgroundColor: look.sheet,
            borderColor: slashed ? '#DC2626' : look.accent,
            boxShadow: '0 24px 48px -16px rgba(20,22,27,0.16)',
          }}
        >
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[22px] font-mono font-bold uppercase" style={{ color: look.accent }}>
              {beat.screenLabel || 'IDÉE REÇUE ?'}
            </span>
            <BeatVectorIcon kind={iconKind} size={32} color={slashed ? '#DC2626' : look.accent} />
          </div>

          <div
            className="text-[52px] font-extrabold leading-[1.08] tracking-[-0.03em]"
            style={{ color: look.ink, fontFamily: look.fontDisplay, opacity: slashed ? 0.45 : 1 }}
          >
            « {beat.title} »
          </div>

          {slashed && (
            <div
              className="absolute left-[24px] top-[56%] h-[8px] rounded-full"
              style={{
                width: `${(760 * slashP).toFixed(1)}px`,
                backgroundColor: '#DC2626',
                transform: 'rotate(-4deg)',
              }}
            />
          )}
        </div>

        <div
          className="w-full rounded-[30px] px-[32px] py-[28px] flex items-center justify-between gap-[20px] mb-[18px]"
          style={{
            backgroundColor: '#14161B',
            color: '#FFFFFF',
            transform: `translateY(${((1 - (slashed ? revealP : 0)) * 16).toFixed(1)}px)`,
            opacity: slashed ? clamp(revealP * 2, 0.25, 1) : 0.72,
          }}
        >
          <div className="min-w-0">
            <div className="text-[22px] font-mono font-bold uppercase text-[#60A5FA]">
              {slashed ? (beat.stampWord || 'LA RÉALITÉ') : 'ANALYSE EN COURS'}
            </div>
            <div className="text-[36px] font-extrabold leading-tight mt-[4px]" style={{ fontFamily: look.fontDisplay }}>
              {beat.statLabel || 'Ce que montrent les faits'}
            </div>
          </div>
          <div className="text-[58px] font-extrabold font-mono text-[#34D399] tabular-nums shrink-0">
            {beat.statValue || 'FAIT'}
          </div>
        </div>

        {/* Bottom 2-pillar context strip so split frame stays packed */}
        <div className="w-full grid grid-cols-2 gap-[16px]">
          {[
            { label: 'Ce qu’on répète', value: beat.leftCard?.value || 'Bruit', dark: false },
            { label: 'Ce qui reste', value: beat.rightCard?.value || 'Preuve', dark: true },
          ].map((c, idx) => (
            <div
              key={idx}
              className="rounded-[22px] px-[24px] py-[18px] border flex items-center justify-between"
              style={{
                backgroundColor: c.dark ? look.sheet : look.paper,
                borderColor: c.dark ? look.accent : look.line,
              }}
            >
              <span className="text-[22px] font-bold" style={{ color: look.ink2 }}>{c.label}</span>
              <span className="text-[30px] font-extrabold font-mono" style={{ color: c.dark ? look.accent : '#DC2626' }}>
                {c.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 1E. HOOK SHATTER (2-Act Transformation around ~2.0–2.4s)
  if (vType === 'hook_shatter') {
    const splitAt = clamp(beatSpan * 0.46, 1.45, 2.35);
    const exploded = localT >= splitAt;
    const scanBeam = (localT * 190) % 270;
    const hitP = seg(localT, splitAt, splitAt + 0.72);
    const stampP = spring(localT - splitAt, 22);
    const shockP = seg(localT, splitAt, splitAt + 0.65);
    const statP = spring(localT - (splitAt + 0.48), 16);
    const shakeAmt =
      localT >= splitAt && localT <= splitAt + 0.46
        ? Math.sin((localT - splitAt) * 90) * (1 - seg(localT, splitAt, splitAt + 0.46)) * 14
        : 0;

    const kpi1 = beat.subStats?.[0] || { value: beat.statValue || '80 %', label: beat.statLabel || 'Impact mesuré' };
    const kpi2 = beat.subStats?.[1] || { value: '×4', label: 'Plus rapide' };

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translate(${shakeAmt.toFixed(1)}px, ${(-30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        {/* Top alert kicker strip */}
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
            className="text-[26px] font-mono font-bold tabular-nums shrink-0 ml-[12px]"
            style={{ color: exploded ? '#DC2626' : look.accent }}
          >
            {exploded ? (beat.stampWord || 'BASCULE') : beat.screenLabel}
          </span>
        </div>

        {/* Central Kinetic Stage */}
        <div className="relative w-full h-[435px] flex items-center justify-center">
          {/* Shockwave rings */}
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

          {/* Act 1: 3 Animated Visual Cards + Red Laser Scan */}
          {localT < splitAt + 0.1 && (
            <div
              className="relative w-full flex items-center justify-center gap-[22px]"
              style={{
                opacity: !exploded ? 1 : 1 - seg(localT, splitAt, splitAt + 0.1),
                transform: `scale(${(1 - 0.04 * seg(localT, 0.2, splitAt)).toFixed(3)})`,
              }}
            >
              {[
                { bg: '#14161B', fg: '#FFFFFF', label: 'Avant', sub: 'Manuel', rot: -4, kind: iconKind },
                { bg: look.sheet, fg: look.ink, label: beat.statValue || '80 %', sub: 'Signal 2026', rot: 0, kind: 'chart' as DynamicIconKind, main: true },
                { bg: look.accent, fg: look.onAccent, label: 'Auto', sub: 'IA Direct', rot: 4, kind: 'rocket' as DynamicIconKind },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className="relative rounded-[32px] flex flex-col items-center justify-center gap-[12px] border overflow-hidden"
                  style={{
                    width: card.main ? '252px' : '220px',
                    height: card.main ? '272px' : '244px',
                    backgroundColor: card.bg,
                    borderColor: card.main ? look.line : 'rgba(255,255,255,0.16)',
                    boxShadow: '0 24px 48px -14px rgba(20,22,27,0.22)',
                    transform: `rotate(${(card.rot + Math.sin(localT * 3 + idx) * 1.6).toFixed(2)}deg) translateY(${(card.main ? -10 : 4 * Math.cos(localT * 3 + idx)).toFixed(1)}px)`,
                  }}
                >
                  <div
                    className="w-[82px] h-[82px] rounded-[22px] flex items-center justify-center"
                    style={{ backgroundColor: card.main ? `${look.accent}18` : 'rgba(255,255,255,0.14)' }}
                  >
                    <BeatVectorIcon kind={card.kind} size={46} color={card.main ? look.accent : card.fg} />
                  </div>
                  <div
                    className="text-[40px] font-extrabold leading-none tracking-tight tabular-nums"
                    style={{ color: card.fg, fontFamily: look.fontDisplay }}
                  >
                    {card.label}
                  </div>
                  <div
                    className="text-[22px] font-semibold opacity-80"
                    style={{ color: card.fg }}
                  >
                    {card.sub}
                  </div>
                  {/* Scanning laser line */}
                  <div
                    className="absolute inset-x-0 h-[4px] opacity-75"
                    style={{ top: `${((scanBeam + idx * 80) % 270).toFixed(0)}px`, backgroundColor: '#DC2626' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Act 2: Flying Shards + Slamming Verdict Stamp */}
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
              className="absolute px-[46px] py-[28px] rounded-[30px] border-[6px] flex flex-col items-center text-center"
              style={{
                backgroundColor: look.sheet,
                borderColor: look.accent,
                opacity: clamp(stampP * 3, 0, 1),
                transform: `translateY(${(-22 * clamp(seg(localT, splitAt + 0.4, splitAt + 0.9), 0, 1)).toFixed(1)}px) scale(${(1.26 - 0.26 * stampP).toFixed(3)}) rotate(-2deg)`,
                boxShadow: '0 32px 60px -16px rgba(20,22,27,0.32)',
              }}
            >
              <div
                className="text-[74px] font-extrabold leading-none tracking-[-0.04em] uppercase"
                style={{ color: look.ink, fontFamily: look.fontDisplay }}
              >
                {beat.stampWord || 'BASCULE'}{' '}
                <span style={{ color: look.accent }}>{beat.statValue || '80 %'}</span>
              </div>
              <div className="text-[30px] font-semibold mt-[10px]" style={{ color: look.ink2 }}>
                {beat.statLabel || 'Chiffre clé mesuré en 2026'}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Telemetry Strip (Act 1) or Double KPI Cards (Act 2) */}
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
            <div className="flex flex-col">
              <span className="text-[22px] font-semibold" style={{ color: look.ink3 }}>Signal</span>
              <span className="text-[30px] font-extrabold truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {beat.statValue || '80 %'}
              </span>
            </div>
            <div className="flex flex-col border-l pl-[16px]" style={{ borderColor: look.line }}>
              <span className="text-[22px] font-semibold" style={{ color: look.ink3 }}>Mécanisme</span>
              <span className="text-[30px] font-extrabold truncate" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
                Temps réel
              </span>
            </div>
            <div className="flex flex-col border-l pl-[16px]" style={{ borderColor: look.line }}>
              <span className="text-[22px] font-semibold" style={{ color: look.ink3 }}>Statut</span>
              <span className="text-[30px] font-extrabold" style={{ color: '#DC2626', fontFamily: look.fontDisplay }}>
                EN COURS
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
                  className="text-[66px] font-extrabold leading-none tracking-[-0.04em] tabular-nums shrink-0"
                  style={{ color: idx === 0 ? look.accent : look.ink, fontFamily: look.fontDisplay }}
                >
                  {kpi.value}
                </span>
                <div className="text-[26px] font-bold leading-tight min-w-0" style={{ color: look.ink }}>
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. COUNTER FLIP (Rolling counter + diagonal slash + animated dashed SVG connector + Before/After UI switch)
  if (vType === 'counter_flip') {
    const countP = seg(localT, 0.2, Math.min(2.1, beatSpan * 0.45));
    const strikeP = seg(localT, Math.min(2.3, beatSpan * 0.48), Math.min(2.9, beatSpan * 0.6));
    const flowDash = (localT * 64) % 24;
    const switched = localT >= Math.min(2.4, beatSpan * 0.52);
    const rippleP = seg(localT, Math.min(2.4, beatSpan * 0.52), Math.min(3.1, beatSpan * 0.72));
    const animatedStat = animateStatValue(beat.statValue || '80 %', countP);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[16px]">
          <div className="flex items-center gap-[14px]">
            <div
              className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center"
              style={{ backgroundColor: look.accent, color: look.onAccent }}
            >
              <BeatVectorIcon kind={iconKind} size={26} color={look.onAccent} />
            </div>
            <span className="text-[34px] font-extrabold tracking-[-0.02em]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.title}
            </span>
          </div>
          <span
            className="px-[16px] py-[6px] rounded-[12px] text-[24px] font-mono font-bold border"
            style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.ink2 }}
          >
            {beat.screenLabel}
          </span>
        </div>

        {/* Big Counter Card */}
        <div
          className="w-full rounded-[32px] px-[38px] py-[30px] border flex items-center justify-between"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 24px 48px -16px rgba(20,22,27,0.16)',
          }}
        >
          <div className="min-w-0">
            <div className="text-[32px] font-extrabold leading-tight" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.statLabel || 'Ancien réflexe'}
            </div>
            <div className="w-[320px] h-[10px] rounded-full mt-[16px] overflow-hidden" style={{ backgroundColor: look.paper }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(countP * 85)}%`, backgroundColor: look.accent }} />
            </div>
          </div>
          <div className="relative flex items-baseline shrink-0">
            <span
              className="text-[106px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {animatedStat}
            </span>
            {strikeP > 0 && (
              <div
                className="absolute left-0 top-[52%] h-[6px] rounded-full"
                style={{
                  width: `${(210 * strikeP).toFixed(1)}px`,
                  backgroundColor: '#DC2626',
                  transform: 'rotate(-13deg)',
                }}
              />
            )}
          </div>
        </div>

        {/* Animated SVG telemetry flow connector */}
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

        {/* Interactive Before -> After Card */}
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
            <span className="text-[32px] font-extrabold" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {switched
                ? (beat.comparisonRight?.label || beat.rightCard?.label || 'Nouvelle norme')
                : (beat.comparisonLeft?.label || beat.leftCard?.label || 'Avant')}
            </span>
            <span
              className="text-[26px] font-bold px-[16px] py-[6px] rounded-[12px]"
              style={{
                backgroundColor: switched ? '#059669' : look.paper,
                color: switched ? '#FFFFFF' : look.ink2,
              }}
            >
              {switched ? 'Activé ✓' : 'Obsolète'}
            </span>
          </div>

          <div className="flex items-center gap-[18px]">
            <div className="flex-1 rounded-[20px] px-[24px] py-[16px] border flex items-center justify-between" style={{ backgroundColor: look.paper, borderColor: look.line }}>
              <span className="text-[28px] font-medium" style={{ color: look.ink2 }}>Impact</span>
              <span className="text-[42px] font-extrabold tabular-nums" style={{ color: switched ? '#059669' : look.ink, fontFamily: look.fontDisplay }}>
                {switched
                  ? (beat.comparisonRight?.value || beat.rightCard?.value || 'Encadré')
                  : (beat.comparisonLeft?.value || beat.leftCard?.value || 'Subi')}
              </span>
            </div>
            <div
              className="relative px-[30px] py-[18px] rounded-[20px] text-[30px] font-bold shrink-0"
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

        {/* Bottom Kinetic Delta Footer */}
        <div className="w-full mt-[16px] grid grid-cols-2 gap-[16px]">
          <div
            className="rounded-[20px] px-[24px] py-[16px] border flex items-center justify-between"
            style={{ backgroundColor: look.sheet, borderColor: look.line }}
          >
            <span className="text-[22px] font-mono font-bold uppercase" style={{ color: look.ink3 }}>Avant</span>
            <span className="text-[28px] font-extrabold truncate ml-[10px]" style={{ color: look.ink2 }}>
              {beat.leftCard?.value || 'Subi'}
            </span>
          </div>
          <div
            className="rounded-[20px] px-[24px] py-[16px] flex items-center justify-between"
            style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
          >
            <span className="text-[22px] font-mono font-bold uppercase text-[#34D399]">Écart net</span>
            <span className="text-[28px] font-extrabold font-mono text-[#60A5FA] truncate ml-[10px]">
              {beat.multiplierBadge || beat.statValue || 'Mesuré'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. TIMELINE STEPS (4-node horizontal kinetic timeline + SVG card + slanted verdict stamp)
  if (vType === 'timeline_steps') {
    const steps = (beat.steps && beat.steps.length >= 3 ? beat.steps : ['Capture', 'Analyse', 'Synthèse', 'Envoyé']).slice(0, 4);
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
        {/* 4-Step Animated Timeline Strip */}
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
                    className="text-[24px] font-extrabold tracking-[-0.01em]"
                    style={{ color: isLast ? '#059669' : reached ? look.ink : look.ink3, fontFamily: look.fontDisplay }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Central Illustrated Process Card */}
        <div
          className="relative w-full rounded-[34px] p-[38px] border overflow-hidden"
          style={{
            backgroundColor: look.sheet,
            borderColor: stamped ? '#059669' : look.line,
            borderWidth: stamped ? '2.5px' : '1.5px',
            boxShadow: '0 28px 56px -18px rgba(20,22,27,0.18)',
          }}
        >
          <div className="flex items-center justify-between mb-[24px]">
            <div>
              <div className="text-[24px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
                {beat.screenLabel}
              </div>
              <div className="text-[54px] font-extrabold leading-[1.06] mt-[6px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {beat.title}
              </div>
            </div>
            <div
              className="w-[96px] h-[96px] rounded-[26px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${look.accent}18` }}
            >
              <BeatVectorIcon kind={iconKind} size={52} color={look.accent} />
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
                  <span className="text-[28px] font-bold truncate" style={{ color: look.ink }}>
                    {st}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="mt-[22px] rounded-[20px] px-[28px] py-[18px] flex items-center justify-between transition-colors"
            style={{
              backgroundColor: '#14161B',
              color: '#FFFFFF',
              transform: stamped ? `scale(${(0.95 + stampP * 0.05).toFixed(3)})` : undefined,
            }}
          >
            <div className="flex items-center gap-[12px]">
              <span
                className="w-[12px] h-[12px] rounded-full"
                style={{ backgroundColor: stamped ? '#34D399' : look.accent }}
              />
              <span className="text-[28px] font-bold truncate">
                {beat.statLabel || (stamped ? 'Séquence vérifiée' : 'Enchaînement en direct')}
              </span>
            </div>
            <span
              className="text-[26px] font-mono font-extrabold tabular-nums shrink-0"
              style={{ color: stamped ? '#34D399' : '#60A5FA' }}
            >
              {stamped ? (beat.stampWord || 'VALIDÉ ✓') : `${Math.max(1, Math.min(4, Math.ceil(fillProg * 4)))}/4`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3B. MYTH VS FACT (Idée reçue barrée + Preuve sourcée en dessous)
  if (vType === 'myth_vs_fact') {
    const flipAt = Math.min(2.1, beatSpan * 0.48);
    const revealed = localT >= flipAt;
    const revP = spring(localT - flipAt, 18);
    const leftC = beat.leftCard || {
      label: beat.comparisonLeft?.label || 'Ce qu’on imagine',
      value: beat.comparisonLeft?.value || 'Simple',
      sub: 'Idée reçue',
    };
    const rightC = beat.rightCard || {
      label: beat.comparisonRight?.label || 'Ce qui se passe vraiment',
      value: beat.comparisonRight?.value || beat.statValue || 'Prouvé',
      sub: beat.sourceLabel || 'Données vérifiées',
    };

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(24 * (1 - enter) - 18 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[16px]">
          <span className="text-[40px] font-extrabold leading-none truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[22px] font-mono font-bold border" style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.accent }}>
            {beat.screenLabel}
          </span>
        </div>

        {/* Top Card: Myth */}
        <div
          className="relative w-full rounded-[28px] px-[32px] py-[24px] border-2 mb-[16px] overflow-hidden"
          style={{
            backgroundColor: look.sheet,
            borderColor: revealed ? '#DC2626' : look.line,
            opacity: revealed ? 0.72 : 1,
          }}
        >
          <div className="flex items-center justify-between gap-[16px]">
            <div>
              <div className="text-[22px] font-mono font-bold uppercase text-[#DC2626]">MYTHE · {leftC.sub}</div>
              <div className="text-[34px] font-extrabold mt-[4px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {leftC.label}
              </div>
            </div>
            <span className="text-[46px] font-extrabold font-mono shrink-0" style={{ color: '#DC2626' }}>
              {leftC.value}
            </span>
          </div>
          {revealed && (
            <div
              className="absolute left-[24px] right-[24px] top-[52%] h-[5px] rounded-full bg-[#DC2626]"
              style={{ transform: `scaleX(${clamp(revP, 0, 1).toFixed(2)}) rotate(-2deg)` }}
            />
          )}
        </div>

        {/* Bottom Card: Fact */}
        <div
          className="w-full rounded-[30px] px-[34px] py-[28px] border-2 mb-[16px]"
          style={{
            backgroundColor: '#14161B',
            borderColor: revealed ? '#10B981' : '#2A2E37',
            transform: `translateY(${((1 - (revealed ? revP : 0.2)) * 12).toFixed(1)}px)`,
            boxShadow: '0 26px 52px -16px rgba(20,22,27,0.28)',
          }}
        >
          <div className="flex items-center justify-between gap-[18px]">
            <div className="min-w-0">
              <div className="text-[22px] font-mono font-bold uppercase text-[#34D399]">
                FAIT VÉRIFIÉ · {rightC.sub}
              </div>
              <div className="text-[38px] font-extrabold text-white mt-[6px] leading-tight" style={{ fontFamily: look.fontDisplay }}>
                {rightC.label}
              </div>
            </div>
            <div className="px-[22px] py-[12px] rounded-[18px] bg-[#10B981] text-white text-[42px] font-extrabold font-mono shrink-0">
              {rightC.value}
            </div>
          </div>
        </div>

        {/* Bottom Evidence & Source Strip */}
        <div
          className="w-full rounded-[22px] px-[26px] py-[18px] border flex items-center justify-between gap-[16px]"
          style={{ backgroundColor: look.sheet, borderColor: look.line }}
        >
          <div className="flex items-center gap-[12px] min-w-0">
            <span className="w-[12px] h-[12px] rounded-full shrink-0" style={{ backgroundColor: revealed ? '#10B981' : look.accent }} />
            <span className="text-[24px] font-bold truncate" style={{ color: look.ink }}>
              {beat.sourceLabel || beat.statLabel || 'Vérification terrain 2026'}
            </span>
          </div>
          <span className="text-[22px] font-mono font-extrabold shrink-0" style={{ color: look.accent }}>
            {revealed ? 'PREUVE ✓' : 'ANALYSE'}
          </span>
        </div>
      </div>
    );
  }

  // 3C. ALERT RULE (Date badge + 3 concrete rule impacts + source footer)
  if (vType === 'alert_rule') {
    const items = (beat.bullets && beat.bullets.length > 0
      ? beat.bullets
      : ['Nouvelle règle appliquée', 'Seuil révisé dès 2026', 'Impact direct mesuré']
    ).slice(0, 3);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(24 * (1 - enter) - 18 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[16px]">
          <div className="flex items-center gap-[14px] min-w-0">
            <div className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#DC2626' }}>
              <BeatVectorIcon kind={iconKind === 'ai' ? 'law' : iconKind} size={28} color="#FFFFFF" />
            </div>
            <span className="text-[40px] font-extrabold truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.title}
            </span>
          </div>
          <span className="px-[18px] py-[8px] rounded-[12px] text-[22px] font-mono font-extrabold bg-[#14161B] text-[#60A5FA] shrink-0">
            {beat.dateBadge || 'NOUVELLE RÈGLE'}
          </span>
        </div>

        <div className="w-full space-y-[14px]">
          {items.map((txt, idx) => {
            const showAt = 0.25 + idx * 0.55;
            const p = spring(localT - showAt, 16);
            const active = localT >= showAt;
            return (
              <div
                key={idx}
                className="w-full rounded-[24px] px-[28px] py-[20px] border flex items-center justify-between gap-[16px]"
                style={{
                  backgroundColor: look.sheet,
                  borderColor: active ? look.accent : look.line,
                  borderWidth: active ? '2px' : '1.5px',
                  transform: `translateX(${((1 - (active ? p : 0)) * 22).toFixed(1)}px)`,
                  opacity: active ? clamp(p * 2, 0.2, 1) : 0.38,
                }}
              >
                <div className="flex items-center gap-[16px] min-w-0">
                  <span
                    className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center text-[22px] font-mono font-extrabold shrink-0"
                    style={{ backgroundColor: active ? look.accent : look.paper, color: active ? '#FFFFFF' : look.ink2 }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[31px] font-extrabold truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                    {txt}
                  </span>
                </div>
                <span className="text-[22px] font-mono font-bold shrink-0" style={{ color: active ? '#059669' : look.ink3 }}>
                  {active ? 'ACTIF' : '…'}
                </span>
              </div>
            );
          })}
        </div>

        {beat.sourceLabel && (
          <div className="w-full mt-[14px] rounded-[18px] px-[24px] py-[12px] bg-[#14161B] text-white/90 flex items-center justify-between">
            <span className="text-[22px] font-mono text-[#60A5FA]">SOURCE</span>
            <span className="text-[24px] font-bold truncate ml-[12px]">{beat.sourceLabel}</span>
          </div>
        )}
      </div>
    );
  }

  // 3D. SOURCE QUOTE (Verified document excerpt + HighlighterSweep + slamming stamp badge)
  if (vType === 'source_quote') {
    const hlProgress = seg(localT, 0.35, Math.min(2.2, beatSpan * 0.58));
    const stampAt = Math.min(2.1, beatSpan * 0.54);
    const stamped = localT >= stampAt;
    const stampP = spring(localT - stampAt, 20);
    const quoteBody =
      beat.quoteText ||
      beat.statLabel ||
      'Les chiffres mesurés confirment une rupture nette dès cette année.';
    const quoteHl = beat.quoteHighlight || beat.statValue || '';

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(24 * (1 - enter) - 18 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        {/* Top Dark Source Banner */}
        <div
          className="w-full rounded-[26px] px-[28px] py-[20px] mb-[18px] flex items-center justify-between gap-[16px]"
          style={{
            backgroundColor: '#14161B',
            boxShadow: '0 22px 44px -16px rgba(20,22,27,0.28)',
          }}
        >
          <div className="flex items-center gap-[16px] min-w-0">
            <div
              className="w-[54px] h-[54px] rounded-[16px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: look.accent }}
            >
              <BeatVectorIcon kind={iconKind} size={30} color="#FFFFFF" />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-mono font-bold uppercase text-[#60A5FA] truncate">
                {beat.screenLabel && beat.screenLabel !== 'COMPARAISON' ? beat.screenLabel : 'DOCUMENT SOURCÉ'}
              </div>
              <div className="text-[30px] font-extrabold text-white truncate" style={{ fontFamily: look.fontDisplay }}>
                {beat.sourceLabel || beat.title}
              </div>
            </div>
          </div>
          <span className="px-[16px] py-[7px] rounded-[12px] bg-white/10 text-[22px] font-mono font-bold text-[#34D399] shrink-0">
            {beat.dateBadge || 'VÉRIFIÉ 2026'}
          </span>
        </div>

        {/* Highlighted Editorial Excerpt Card */}
        <div
          className="relative w-full rounded-[32px] p-[34px] border-2 mb-[18px] overflow-hidden"
          style={{
            backgroundColor: look.sheet,
            borderColor: stamped ? look.accent : look.line,
            boxShadow: '0 26px 52px -18px rgba(20,22,27,0.18)',
          }}
        >
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[22px] font-mono font-bold uppercase" style={{ color: look.accent }}>
              {beat.title}
            </span>
            <span className="text-[52px] leading-none font-serif font-bold" style={{ color: `${look.accent}55` }}>
              “”
            </span>
          </div>

          <div
            className="text-[38px] font-bold leading-[1.24] tracking-[-0.02em]"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            <HighlighterSweep
              text={quoteBody}
              highlight={quoteHl}
              progress={hlProgress}
              highlightColor="rgba(250, 204, 21, 0.58)"
            />
          </div>

          <div className="mt-[22px] pt-[16px] border-t flex items-center justify-between gap-[14px]" style={{ borderColor: look.line }}>
            <span className="text-[23px] font-semibold truncate" style={{ color: look.ink2 }}>
              {beat.statLabel || 'Extrait vérifié en direct'}
            </span>
            <div
              className="px-[20px] py-[8px] rounded-[14px] text-[24px] font-mono font-extrabold uppercase shrink-0"
              style={{
                backgroundColor: stamped ? '#DC2626' : look.paper,
                color: stamped ? '#FFFFFF' : look.ink2,
                transform: stamped ? `scale(${(1.12 - 0.12 * stampP).toFixed(3)}) rotate(-2deg)` : 'scale(0.96)',
              }}
            >
              {beat.stampWord || 'PREUVE'} · {beat.statValue || '2026'}
            </div>
          </div>
        </div>

        {/* Bottom Context Delta Strip */}
        <div className="w-full grid grid-cols-2 gap-[16px]">
          <div
            className="rounded-[22px] px-[24px] py-[18px] border flex items-center justify-between gap-[10px]"
            style={{ backgroundColor: look.sheet, borderColor: look.line }}
          >
            <span className="text-[22px] font-bold truncate" style={{ color: look.ink2 }}>
              {beat.leftCard?.label || 'Avant'}
            </span>
            <span className="text-[28px] font-extrabold font-mono shrink-0" style={{ color: '#DC2626' }}>
              {beat.leftCard?.value || 'Subi'}
            </span>
          </div>
          <div
            className="rounded-[22px] px-[24px] py-[18px] flex items-center justify-between gap-[10px]"
            style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
          >
            <span className="text-[22px] font-bold text-white/80 truncate">
              {beat.rightCard?.label || 'Constat'}
            </span>
            <span className="text-[28px] font-extrabold font-mono text-[#34D399] shrink-0">
              {beat.rightCard?.value || beat.statValue || 'Confirmé'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3E. CHART CURVE (Animated SVG trend curve + area gradient + live milestone callouts)
  if (vType === 'chart_curve') {
    const rawPts =
      beat.chartPoints && beat.chartPoints.length >= 3
        ? beat.chartPoints.slice(0, 5)
        : [
            { label: '2022', value: 100 },
            { label: '2023', value: 94 },
            { label: '2024', value: 86 },
            { label: '2025', value: 78 },
            { label: '2026', value: 72, highlight: true },
          ];
    const unit = beat.chartUnit ?? '%';
    const minVal = Math.min(...rawPts.map((p) => p.value));
    const maxVal = Math.max(...rawPts.map((p) => p.value));
    const valSpan = Math.max(1, maxVal - minVal);
    const padMin = minVal - valSpan * 0.22;
    const padSpan = valSpan * 1.44;

    const svgW = 860;
    const svgH = 340;
    const padX = 58;
    const padTop = 52;
    const padBot = 54;
    const plotW = svgW - padX * 2;
    const plotH = svgH - padTop - padBot;

    const coords = rawPts.map((pt, i) => {
      const x = padX + (i / Math.max(1, rawPts.length - 1)) * plotW;
      const y = padTop + (1 - (pt.value - padMin) / padSpan) * plotH;
      return { ...pt, x, y };
    });

    // Smooth cubic bezier SVG path
    let linePath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = ((prev.x + curr.x) / 2).toFixed(1);
      linePath += ` C ${cx} ${prev.y.toFixed(1)}, ${cx} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(svgH - padBot).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(svgH - padBot).toFixed(1)} Z`;

    const drawP = seg(localT, 0.14, Math.max(1.25, beatSpan * 0.44));
    const approxPathLen = 1100;
    const isDrop = coords[coords.length - 1].value < coords[0].value;
    const curveColor = isDrop ? '#DC2626' : look.accent;

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(26 * (1 - enter) - 20 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-end justify-between gap-[16px] mb-[18px]">
          <div className="min-w-0">
            <div className="text-[24px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
              {beat.screenLabel || 'TRAJECTOIRE CHIFFRÉE'}
            </div>
            <div
              className="text-[54px] font-extrabold leading-[1.06] tracking-[-0.03em] mt-[4px] truncate"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {beat.title}
            </div>
          </div>
          <div
            className="px-[22px] py-[12px] rounded-[20px] shrink-0 text-right"
            style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
          >
            <div className="text-[18px] font-mono uppercase text-white/60">Évolution</div>
            <div className="text-[40px] font-extrabold font-mono leading-none tabular-nums" style={{ color: isDrop ? '#F87171' : '#60A5FA' }}>
              {beat.statValue || `${coords[coords.length - 1].value}${unit}`}
            </div>
          </div>
        </div>

        {/* SVG Chart Card */}
        <div
          className="w-full rounded-[32px] px-[28px] py-[24px] border mb-[18px]"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 28px 56px -18px rgba(20,22,27,0.18)',
          }}
        >
          <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
            <defs>
              <linearGradient id={`areaGrad-${beat.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={curveColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={curveColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal dashed reference lines */}
            {[0.2, 0.5, 0.8].map((frac, idx) => {
              const gy = padTop + frac * plotH;
              return (
                <line
                  key={idx}
                  x1={padX}
                  y1={gy}
                  x2={svgW - padX}
                  y2={gy}
                  stroke={look.line}
                  strokeWidth="2"
                  strokeDasharray="8 8"
                />
              );
            })}

            {/* Area Fill (fades in smoothly as curve draws) */}
            <path d={areaPath} fill={`url(#areaGrad-${beat.id})`} opacity={clamp(drawP * 1.15, 0, 1)} />

            {/* Animated Spline Curve */}
            <path
              d={linePath}
              fill="none"
              stroke={curveColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={approxPathLen}
              strokeDashoffset={(approxPathLen * (1 - drawP)).toFixed(1)}
            />

            {/* Data Nodes + Labels */}
            {coords.map((pt, idx) => {
              const threshold = idx / Math.max(1, coords.length - 1);
              const nodeP = spring(drawP - threshold * 0.72, 18);
              const visible = drawP >= threshold * 0.72;
              const isFocus = pt.highlight || idx === coords.length - 1;
              return (
                <g key={pt.label + idx} opacity={visible ? clamp(nodeP * 2.4, 0.35, 1) : 0}>
                  {isFocus && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={20 + 6 * Math.abs(Math.sin(localT * 5))}
                      fill={curveColor}
                      opacity="0.18"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isFocus ? 12 : 9}
                    fill={isFocus ? curveColor : '#FFFFFF'}
                    stroke={curveColor}
                    strokeWidth="5"
                  />
                  <rect
                    x={pt.x - 42}
                    y={pt.y - 52}
                    width="84"
                    height="32"
                    rx="10"
                    fill={isFocus ? curveColor : '#14161B'}
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 30}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="20"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {pt.value}{unit}
                  </text>
                  <text
                    x={pt.x}
                    y={svgH - 14}
                    textAnchor="middle"
                    fill={isFocus ? look.ink : look.ink3}
                    fontSize="24"
                    fontWeight="800"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom Insight Bar */}
        <div className="w-full grid grid-cols-2 gap-[16px]">
          <div
            className="rounded-[22px] px-[24px] py-[18px] border flex items-center justify-between gap-[10px]"
            style={{ backgroundColor: look.sheet, borderColor: look.line }}
          >
            <span className="text-[22px] font-bold truncate" style={{ color: look.ink2 }}>
              {beat.comparisonLeft?.label || 'Point de départ'}
            </span>
            <span className="text-[28px] font-extrabold font-mono shrink-0" style={{ color: look.ink }}>
              {beat.comparisonLeft?.value || `${coords[0].value}${unit}`}
            </span>
          </div>
          <div
            className="rounded-[22px] px-[24px] py-[18px] flex items-center justify-between gap-[10px]"
            style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
          >
            <span className="text-[22px] font-bold text-[#93C5FD] truncate">
              {beat.statLabel || 'Tendance 2026'}
            </span>
            <span className="text-[26px] font-extrabold font-mono text-white shrink-0">
              {beat.multiplierBadge || beat.stampWord || 'COURBE'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3F. UI WINDOW (macOS Safari recreated interface + animated CursorPointer + ClickRipple on primary CTA)
  if (vType === 'ui_window') {
    const rows = (
      beat.bullets && beat.bullets.length > 0
        ? beat.bullets
        : ['Vérification du dossier', 'Calcul du taux réel', 'Validation en direct']
    ).slice(0, 3);
    const clickAt = clamp(beatSpan * 0.48, 1.0, 2.2);
    const clicked = localT >= clickAt;
    const rippleP = seg(localT, clickAt, clickAt + 0.65);
    const cursorMoveP = seg(localT, 0.28, clickAt - 0.1);
    const cursorX = 340 + cursorMoveP * 440;
    const cursorY = 120 + cursorMoveP * 224;
    const pressing = localT >= clickAt - 0.08 && localT <= clickAt + 0.14;

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(24 * (1 - enter) - 18 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[16px]">
          <span className="text-[44px] font-extrabold leading-none truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[22px] font-mono font-bold bg-[#14161B] text-[#60A5FA] shrink-0">
            {beat.screenLabel || 'INTERFACE'}
          </span>
        </div>

        <MacWindowChrome
          url={beat.uiUrl || 'portail.service-public.fr/2026'}
          badge={clicked ? 'CONFIRMÉ ✓' : 'EN DIRECT'}
        >
          <div className="relative p-[28px] space-y-[14px]">
            {rows.map((label, idx) => {
              const rowActive = localT >= 0.25 + idx * 0.45;
              const rp = spring(localT - (0.25 + idx * 0.45), 16);
              return (
                <div
                  key={idx}
                  className="rounded-[20px] px-[22px] py-[16px] border flex items-center justify-between gap-[14px]"
                  style={{
                    backgroundColor: clicked ? 'rgba(5,150,105,0.08)' : rowActive ? '#F8FAFC' : '#FFFFFF',
                    borderColor: clicked ? '#10B981' : rowActive ? look.accent : '#E5E7EB',
                    transform: `translateX(${((1 - (rowActive ? rp : 0)) * 14).toFixed(1)}px)`,
                  }}
                >
                  <div className="flex items-center gap-[14px] min-w-0">
                    <span
                      className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[20px] font-mono font-extrabold shrink-0"
                      style={{
                        backgroundColor: clicked ? '#059669' : rowActive ? look.accent : '#E5E7EB',
                        color: '#FFFFFF',
                      }}
                    >
                      {clicked || rowActive ? '✓' : idx + 1}
                    </span>
                    <span className="text-[29px] font-bold truncate" style={{ color: '#111827' }}>
                      {label}
                    </span>
                  </div>
                  <span
                    className="text-[20px] font-mono font-bold shrink-0"
                    style={{ color: clicked ? '#059669' : rowActive ? look.accent : '#9CA3AF' }}
                  >
                    {clicked ? 'APPLIQUÉ' : rowActive ? 'PRÊT' : 'ATTENTE'}
                  </span>
                </div>
              );
            })}

            {/* Bottom Interactive Action Bar inside the window */}
            <div className="pt-[10px] flex items-center justify-between gap-[16px]">
              <div className="text-[24px] font-semibold truncate" style={{ color: '#4B5563' }}>
                {beat.statLabel || 'Action vérifiée en 1 clic'}
              </div>
              <div
                className="relative px-[30px] py-[16px] rounded-[18px] text-[27px] font-extrabold shrink-0"
                style={{
                  backgroundColor: clicked ? '#059669' : look.accent,
                  color: '#FFFFFF',
                  transform: `scale(${pressing ? 0.94 : 1})`,
                }}
              >
                {clicked ? 'Validé ✓' : beat.uiActionLabel || 'Lancer la vérif'}
              </div>
            </div>

            <ClickRipple x={780} y={344} progress={rippleP} color="#059669" />
            <CursorPointer x={cursorX} y={cursorY} pressing={pressing} />
          </div>
        </MacWindowChrome>

        <div className="w-full mt-[16px] rounded-[22px] px-[26px] py-[16px] bg-[#14161B] text-white flex items-center justify-between gap-[14px]">
          <span className="text-[24px] font-bold truncate">{beat.sourceLabel || 'Résultat vérifié'}</span>
          <span className="text-[26px] font-extrabold font-mono text-[#60A5FA] shrink-0">
            {beat.statValue || '2026'}
          </span>
        </div>
      </div>
    );
  }

  // 4. GAUGE (Full-paper 2-row composition: Live Scrolling Feed + 270° Speedometer Needle + 3 Pillar Cards + Dark Insight Ticker)
  if (vType === 'gauge') {
    const gaugeTarget = clamp(beat.gaugePct ?? 88, 15, 99) / 100;
    const gaugeP = seg(localT, 0.25, Math.max(1.8, beatSpan * 0.72));
    const gaugeVal = gaugeTarget * (1 - Math.pow(1 - gaugeP, 2.2));
    const needleAngle = -135 + gaugeVal * 270;
    const rowP = spring(localT - 0.55, 14);
    const pillars = (beat.bullets && beat.bullets.length > 0
      ? beat.bullets
      : ['Zéro friction', 'Décision directe', 'Impact mesuré']
    ).slice(0, 3);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(36 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full text-center mb-[20px]">
          <div className="text-[28px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
            {beat.screenLabel}
          </div>
          <div
            className="text-[68px] font-extrabold leading-[1.02] tracking-[-0.04em] mt-[6px] line-clamp-2"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            {beat.title}
          </div>
        </div>

        {/* Dual Module Row */}
        <div className="w-full grid grid-cols-2 gap-[22px] items-stretch">
          {/* Left: Live Animated Radar / Telemetry Matrix (distinct from 3 pillars below) */}
          <div
            className="rounded-[30px] p-[26px] border flex flex-col"
            style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 24px 48px -18px rgba(20,22,27,0.16)' }}
          >
            <div className="flex items-center justify-between mb-[14px]">
              <span className="text-[28px] font-bold" style={{ color: look.ink }}>Signal terrain</span>
              <span className="text-[22px] font-mono font-bold px-[12px] py-[4px] rounded-[10px]" style={{ backgroundColor: `${look.accent}18`, color: look.accent }}>
                {beat.dateBadge || 'LIVE 2026'}
              </span>
            </div>
            <div className="relative h-[490px] rounded-[22px] overflow-hidden border p-[18px] flex flex-col justify-between" style={{ backgroundColor: '#14161B', borderColor: look.line }}>
              {/* Animated Radar Sweep Line */}
              <div
                className="absolute inset-x-0 h-[3px] opacity-60 pointer-events-none"
                style={{
                  top: `${((localT * 145) % 470).toFixed(0)}px`,
                  background: `linear-gradient(90deg, transparent, ${look.accent}, transparent)`,
                }}
              />
              {[
                {
                  tag: 'AVANT',
                  title: beat.comparisonLeft?.label || beat.leftCard?.label || 'Situation subie',
                  val: beat.comparisonLeft?.value || beat.leftCard?.value || 'Élevé',
                  tone: '#EF4444',
                  pct: Math.round((beat.comparisonLeft?.ratio ?? 0.86) * 100),
                },
                {
                  tag: 'APRÈS',
                  title: beat.comparisonRight?.label || beat.rightCard?.label || 'Nouvelle donne',
                  val: beat.comparisonRight?.value || beat.rightCard?.value || 'Encadré',
                  tone: '#10B981',
                  pct: Math.round((beat.comparisonRight?.ratio ?? 0.28) * 100),
                },
                {
                  tag: 'RATIO',
                  title: beat.statLabel || 'Indice mesuré',
                  val: beat.multiplierBadge || beat.statValue || `${Math.round(gaugeTarget * 100)} %`,
                  tone: '#60A5FA',
                  pct: Math.round(gaugeVal * 100),
                },
              ].map((row, idx) => {
                const rowAt = idx * 0.42;
                const rowAct = localT >= rowAt;
                const rp = spring(localT - rowAt, 15);
                return (
                  <div
                    key={idx}
                    className="relative rounded-[18px] px-[18px] py-[16px] border border-white/12 flex flex-col gap-[8px]"
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#1E222B' : '#252B37',
                      opacity: rowAct ? clamp(rp * 2, 0.25, 1) : 0.25,
                      transform: `translateX(${((1 - (rowAct ? rp : 0)) * 16).toFixed(1)}px)`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-[10px]">
                      <span className="text-[18px] font-mono font-bold px-[10px] py-[2px] rounded-[8px]" style={{ backgroundColor: `${row.tone}24`, color: row.tone }}>
                        {row.tag}
                      </span>
                      <span className="text-[28px] font-extrabold font-mono text-white tabular-nums">
                        {row.val}
                      </span>
                    </div>
                    <div className="text-[23px] font-bold text-white/90 truncate">{row.title}</div>
                    <div className="h-[6px] rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(12, Math.round(row.pct * (rowAct ? rp : 0))))}%`, backgroundColor: row.tone }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Tachometer Needle Gauge */}
          <div
            className="rounded-[30px] p-[26px] border flex flex-col items-center justify-between"
            style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 24px 48px -18px rgba(20,22,27,0.16)' }}
          >
            <div className="w-full text-[28px] font-bold truncate" style={{ color: look.ink }}>
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
            <div className="text-[26px] font-semibold" style={{ color: look.ink2 }}>
              {beat.stampWord || 'Impact confirmé'}
            </div>
          </div>
        </div>

        {/* 3 Pillar Strip */}
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
              <div className="text-[27px] font-extrabold leading-tight" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {txt}
              </div>
            </div>
          ))}
        </div>

        {/* Lower Dark Insight Bar right above captions */}
        <div
          className="w-full mt-[18px] rounded-[22px] px-[26px] py-[20px] flex items-center justify-between"
          style={{ backgroundColor: look.ink, color: '#FFFFFF', boxShadow: '0 18px 38px -14px rgba(20,22,27,0.22)' }}
        >
          <div className="flex items-center gap-[14px] min-w-0">
            <span className="w-[14px] h-[14px] rounded-full shrink-0" style={{ backgroundColor: look.accent }} />
            <span className="text-[26px] font-bold truncate">
              {beat.statLabel || beat.title}
            </span>
          </div>
          <span className="text-[24px] font-mono font-bold text-[#60A5FA] shrink-0">
            {beat.statValue || `${Math.round(gaugeTarget * 100)} %`}
          </span>
        </div>
      </div>
    );
  }

  // 5. COMPARISON BARS (Fullscreen 2-row high-density bars + multiplier + bottom telemetry cards)
  if (vType === 'comparison_bars') {
    const left = beat.comparisonLeft || {
      label: beat.leftCard?.label || 'Avant',
      value: beat.leftCard?.value || 'Subi',
      ratio: 0.85,
    };
    const right = beat.comparisonRight || {
      label: beat.rightCard?.label || 'Nouvelle donne',
      value: beat.rightCard?.value || 'Corrigé',
      ratio: 0.25,
    };
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
        <div className="w-full flex items-end justify-between mb-[24px]">
          <div>
            <div className="text-[28px] font-mono font-bold uppercase tracking-wider" style={{ color: look.accent }}>
              {beat.screenLabel}
            </div>
            <div
              className="text-[74px] font-extrabold leading-none tracking-[-0.04em] mt-[8px]"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {beat.title}
            </div>
          </div>

          <div
            className="px-[28px] py-[16px] rounded-[24px] border text-right"
            style={{ backgroundColor: look.sheet, borderColor: look.accent, borderWidth: '2px', boxShadow: '0 20px 40px -14px rgba(20,22,27,0.14)' }}
          >
            <div className="text-[22px] font-semibold" style={{ color: look.ink3 }}>Ratio</div>
            <div
              className="text-[56px] font-extrabold leading-none tabular-nums"
              style={{ color: look.accent, fontFamily: look.fontDisplay }}
            >
              {beat.multiplierBadge || '×4'}
            </div>
          </div>
        </div>

        <div
          className="w-full rounded-[34px] p-[40px] border space-y-[38px]"
          style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 30px 60px -18px rgba(20,22,27,0.18)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-[12px]">
              <span className="text-[34px] font-bold" style={{ color: look.ink2, fontFamily: look.fontDisplay }}>
                {left.label}
              </span>
              <span className="text-[38px] font-extrabold tabular-nums" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {left.value}
              </span>
            </div>
            <div className="h-[68px] rounded-[20px] overflow-hidden" style={{ backgroundColor: look.paper }}>
              <div
                className="h-full rounded-[20px]"
                style={{ width: `${clamp(left.ratio * b1 * 100, 8, 100).toFixed(1)}%`, backgroundColor: look.ink3 }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-[12px]">
              <span className="text-[34px] font-bold" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                {right.label}
              </span>
              <span className="text-[42px] font-extrabold tabular-nums" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
                {right.value}
              </span>
            </div>
            <div className="h-[68px] rounded-[20px] overflow-hidden" style={{ backgroundColor: look.paper }}>
              <div
                className="h-full rounded-[20px]"
                style={{ width: `${clamp(right.ratio * b2 * 100, 8, 100).toFixed(1)}%`, backgroundColor: look.accent }}
              />
            </div>
          </div>
        </div>

        {/* 3-Card Insight Strip matching gauge density down to y=1265 */}
        <div
          className="w-full grid grid-cols-3 gap-[16px] mt-[22px]"
          style={{
            opacity: clamp(0.35 + bottomP * 0.65, 0, 1),
            transform: `translateY(${(18 * (1 - bottomP)).toFixed(1)}px)`,
          }}
        >
          {((beat.bullets && beat.bullets.length > 0 ? beat.bullets : beat.steps) || [
            'Écart chiffré mesuré',
            'Impact direct immédiat',
            'Vérifié sur le terrain',
          ])
            .slice(0, 3)
            .map((txt, i) => (
              <div
                key={i}
                className="rounded-[22px] px-[20px] py-[20px] border"
                style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 16px 32px -14px rgba(20,22,27,0.12)' }}
              >
                <div className="flex items-center justify-between mb-[8px]">
                  <span className="text-[20px] font-mono font-bold" style={{ color: look.accent }}>0{i + 1}</span>
                  <span className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: look.accent }} />
                </div>
                <div className="text-[26px] font-extrabold leading-tight line-clamp-2" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                  {txt}
                </div>
              </div>
            ))}
        </div>

        {/* Lower KPI / Insight bar filling full-paper height cleanly */}
        <div
          className="w-full mt-[20px] rounded-[24px] px-[32px] py-[22px] flex items-center justify-between"
          style={{
            backgroundColor: look.ink,
            color: '#FFFFFF',
            opacity: clamp(0.4 + bottomP * 0.6, 0, 1),
            transform: `translateY(${(18 * (1 - bottomP)).toFixed(1)}px)`,
          }}
        >
          <div>
            <div className="text-[22px] font-mono uppercase text-[#9CA3AF]">Gain cumulé</div>
            <div className="text-[32px] font-extrabold">{beat.statLabel || 'Écart net confirmé'}</div>
          </div>
          <div className="text-[52px] font-extrabold font-mono text-[#60A5FA] tabular-nums">
            {beat.statValue || right.value}
          </div>
        </div>
      </div>
    );
  }

  // 6. TOGGLES SWITCH (3 animated system switches flipping sequentially + action strip)
  if (vType === 'toggles_switch') {
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
          transform: `translateY(${(24 * (1 - enter) - 18 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[20px]">
          <span className="text-[48px] font-extrabold leading-none tracking-tight truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[24px] font-mono font-bold border shrink-0" style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.accent }}>
            {beat.screenLabel}
          </span>
        </div>

        <div className="relative w-full space-y-[16px]">
          {items.map((item, idx) => {
            const flipAt = Math.min(beatSpan - 0.6, 0.5 + idx * 0.72);
            const flipped = localT >= flipAt;
            const slideAnim = spring(localT - flipAt, 16);
            const knobPos = flipped ? 54 * slideAnim : 0;

            return (
              <div
                key={idx}
                className="w-full rounded-[26px] border-2 px-[30px] py-[22px] flex items-center justify-between gap-[20px]"
                style={{
                  backgroundColor: look.sheet,
                  borderColor: flipped ? (item.activeAfter ? '#059669' : '#DC2626') : look.line,
                  boxShadow: '0 20px 40px -16px rgba(20,22,27,0.14)',
                }}
              >
                <div className="min-w-0">
                  <div className="text-[33px] font-extrabold leading-tight truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                    {item.label}
                  </div>
                  <div
                    className="text-[23px] font-mono font-bold mt-[4px]"
                    style={{ color: flipped ? (item.activeAfter ? '#059669' : '#DC2626') : look.ink3 }}
                  >
                    {flipped ? item.after : item.before}
                  </div>
                </div>

                {/* Animated iOS-style switch */}
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
          {(() => {
            const flipTimes = items.map((_, i) => Math.min(beatSpan - 0.6, 0.5 + i * 0.72));
            let activeIdx = 0;
            for (let i = 0; i < flipTimes.length; i++) {
              if (localT >= flipTimes[i] - 0.25) activeIdx = i;
            }
            const prevIdx = Math.max(0, activeIdx - 1);
            const targetAt = flipTimes[activeIdx] ?? 0.5;
            const moveP = activeIdx === 0 ? seg(localT, 0.08, targetAt - 0.05) : seg(localT, flipTimes[prevIdx] + 0.12, targetAt - 0.05);
            const yPositions = [58, 192, 326];
            const startY = activeIdx === 0 ? 18 : yPositions[prevIdx];
            const endY = yPositions[activeIdx] ?? 58;
            const cy = startY + (endY - startY) * moveP;
            const cx = 865 - (1 - moveP) * (activeIdx === 0 ? 180 : 0);
            const pressing = localT >= targetAt - 0.07 && localT <= targetAt + 0.12;
            const rippleP = seg(localT, targetAt, targetAt + 0.55);
            return (
              <>
                <ClickRipple x={885} y={endY} progress={rippleP} color={items[activeIdx]?.activeAfter ? '#059669' : '#DC2626'} />
                <CursorPointer x={cx} y={cy} pressing={pressing} />
              </>
            );
          })()}
        </div>

        {/* Bottom Dark Status Summary Strip */}
        <div
          className="w-full mt-[16px] rounded-[22px] px-[28px] py-[18px] flex items-center justify-between"
          style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}
        >
          <span className="text-[24px] font-bold truncate">
            {beat.statLabel || 'Plan d’action activé'}
          </span>
          <span className="text-[24px] font-mono font-extrabold text-[#34D399] shrink-0">
            {Math.min(items.length, items.filter((_, i) => localT >= Math.min(beatSpan - 0.6, 0.5 + i * 0.72)).length)}/{items.length} ACTIFS
          </span>
        </div>
      </div>
    );
  }

  // 6B. CHECKLIST AUDIT / KEY POINTS (Editorial action cards + verified checkmark stamps)
  if (vType === 'checklist_audit' || vType === 'key_points') {
    const items = (beat.bullets && beat.bullets.length > 0
      ? beat.bullets
      : ['Vérifier ton seuil actuel', 'Comparer les frais cachés', 'Activer l’alerte directe']
    ).slice(0, 3);

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(24 * (1 - enter) - 18 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[18px]">
          <div className="flex items-center gap-[14px] min-w-0">
            <div className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: look.accent }}>
              <BeatVectorIcon kind={iconKind} size={28} color="#FFFFFF" />
            </div>
            <span className="text-[44px] font-extrabold leading-none truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {beat.title}
            </span>
          </div>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[22px] font-mono font-bold border shrink-0" style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.accent }}>
            {beat.screenLabel}
          </span>
        </div>

        <div className="relative w-full space-y-[16px]">
          {items.map((label, idx) => {
            const checkAt = Math.min(beatSpan - 0.5, 0.35 + idx * 0.65);
            const checked = localT >= checkAt;
            const pop = spring(localT - checkAt, 18);

            return (
              <div
                key={idx}
                className="w-full rounded-[26px] border-2 px-[28px] py-[22px] flex items-center justify-between gap-[18px]"
                style={{
                  backgroundColor: checked ? '#14161B' : look.sheet,
                  borderColor: checked ? '#059669' : look.line,
                  transform: `scale(${(checked ? 0.98 + 0.02 * pop : 1).toFixed(3)})`,
                  boxShadow: '0 20px 40px -16px rgba(20,22,27,0.14)',
                }}
              >
                <div className="flex items-center gap-[18px] min-w-0">
                  <span
                    className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center text-[24px] font-mono font-extrabold shrink-0"
                    style={{
                      backgroundColor: checked ? '#059669' : look.paper,
                      color: checked ? '#FFFFFF' : look.ink2,
                    }}
                  >
                    {checked ? '✓' : `0${idx + 1}`}
                  </span>
                  <span
                    className="text-[32px] font-extrabold leading-tight truncate"
                    style={{ color: checked ? '#FFFFFF' : look.ink, fontFamily: look.fontDisplay }}
                  >
                    {label}
                  </span>
                </div>
                <span
                  className="px-[14px] py-[6px] rounded-[10px] text-[20px] font-mono font-bold shrink-0"
                  style={{
                    backgroundColor: checked ? 'rgba(52,211,153,0.18)' : look.paper,
                    color: checked ? '#34D399' : look.ink3,
                  }}
                >
                  {checked ? 'OK' : 'À FAIRE'}
                </span>
              </div>
            );
          })}
          {(() => {
            const checkTimes = items.map((_, i) => Math.min(beatSpan - 0.5, 0.35 + i * 0.65));
            let activeIdx = 0;
            for (let i = 0; i < checkTimes.length; i++) {
              if (localT >= checkTimes[i] - 0.2) activeIdx = i;
            }
            const prevIdx = Math.max(0, activeIdx - 1);
            const targetAt = checkTimes[activeIdx] ?? 0.35;
            const moveP = activeIdx === 0 ? seg(localT, 0.05, targetAt - 0.04) : seg(localT, checkTimes[prevIdx] + 0.1, targetAt - 0.04);
            const yPositions = [48, 162, 276];
            const startY = activeIdx === 0 ? 14 : yPositions[prevIdx];
            const endY = yPositions[activeIdx] ?? 48;
            const cy = startY + (endY - startY) * moveP;
            const cx = 890 - (1 - moveP) * (activeIdx === 0 ? 120 : 0);
            const pressing = localT >= targetAt - 0.06 && localT <= targetAt + 0.12;
            const rippleP = seg(localT, targetAt, targetAt + 0.52);
            return (
              <>
                <ClickRipple x={895} y={endY} progress={rippleP} color="#059669" />
                <CursorPointer x={cx} y={cy} pressing={pressing} />
              </>
            );
          })()}
        </div>

        <div className="w-full mt-[18px] rounded-[22px] px-[28px] py-[18px] flex items-center justify-between" style={{ backgroundColor: '#14161B', color: '#FFFFFF' }}>
          <span className="text-[25px] font-bold truncate">
            {beat.sourceLabel || beat.statLabel || beat.stampWord || 'Réflexes vérifiés'}
          </span>
          <span className="text-[26px] font-extrabold font-mono shrink-0 text-[#34D399] ml-[12px]">
            {beat.statValue || `${Math.min(items.length, items.filter((_, i) => localT >= Math.min(beatSpan - 0.5, 0.35 + i * 0.65)).length)}/${items.length} OK`}
          </span>
        </div>
      </div>
    );
  }

  // 7. TERMINAL FLOW (Dark live typing terminal + SVG connector + KPI payoff card)
  if (vType === 'terminal_flow') {
    const cmd = beat.terminalCmd || '> agent --sync-2026';
    const typedLen = Math.floor(cmd.length * seg(localT, 0.15, Math.min(1.4, beatSpan * 0.35)));
    const outLines = beat.terminalOut || ['✓ Gain hebdo confirmé', '✓ Temps libéré', '✓ Priorités claires'];

    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          opacity: clamp(enter * 2.8, 0, 1) * exit,
          transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
        }}
      >
        <div className="w-full flex items-center justify-between mb-[18px]">
          <span className="text-[54px] font-extrabold leading-none" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            {beat.title}
          </span>
          <span className="px-[16px] py-[6px] rounded-[12px] text-[24px] font-mono font-bold border" style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.accent }}>
            {beat.screenLabel}
          </span>
        </div>

        {/* Dark Terminal */}
        <div
          className="w-full rounded-[30px] p-[34px] border border-white/10"
          style={{ backgroundColor: '#14161B', boxShadow: '0 28px 56px -18px rgba(20,22,27,0.28)' }}
        >
          <div className="flex items-center gap-[10px] mb-[20px]">
            <span className="w-[14px] h-[14px] rounded-full bg-[#EF4444]" />
            <span className="w-[14px] h-[14px] rounded-full bg-[#F59E0B]" />
            <span className="w-[14px] h-[14px] rounded-full bg-[#10B981]" />
            <span className="ml-[12px] text-[22px] font-mono text-white/45">engine.ia — bash</span>
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
                  className="text-[30px] font-mono font-semibold text-white/95 rounded-[14px] px-[20px] py-[12px] bg-white/5"
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

        {/* Bottom Payoff Card */}
        <div
          className="w-full mt-[20px] rounded-[26px] border px-[32px] py-[22px] flex items-center justify-between"
          style={{ backgroundColor: look.sheet, borderColor: look.accent, borderWidth: '2px' }}
        >
          <div className="flex items-center gap-[16px]">
            <div className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center" style={{ backgroundColor: `${look.accent}18` }}>
              <BeatVectorIcon kind={iconKind} size={32} color={look.accent} />
            </div>
            <span className="text-[30px] font-bold" style={{ color: look.ink }}>
              {beat.statLabel || 'Résultat mesuré'}
            </span>
          </div>
          <span className="text-[60px] font-extrabold font-mono tabular-nums" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
            {beat.statValue || '+38 %'}
          </span>
        </div>
      </div>
    );
  }

  // 8. CTA CARD (Animated @alex.decode subscribe button + bell + soundwaves)
  const clickAt = Math.min(1.1, beatSpan * 0.35);
  const clicked = localT >= clickAt;
  const waveP = seg(localT, clickAt, clickAt + 0.85);
  const bellShake = clicked && localT < clickAt + 0.65 ? Math.sin((localT - clickAt) * 35) * 14 : 0;

  return (
    <div
      className="w-full flex flex-col items-center justify-center"
      style={{
        opacity: clamp(enter * 2.8, 0, 1) * exit,
        transform: `translateY(${(34 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      <div className="text-[30px] font-mono font-bold uppercase tracking-wider mb-[16px]" style={{ color: look.accent }}>
        {beat.screenLabel || 'PROCHAIN ÉPISODE'}
      </div>
      <div
        className="text-[64px] font-extrabold text-center leading-[1.04] mb-[32px]"
        style={{ color: look.ink, fontFamily: look.fontDisplay }}
      >
        {beat.title}
      </div>

      <div
        className="relative w-full rounded-[34px] border-2 px-[42px] py-[38px] flex items-center justify-between gap-[24px] mb-[22px]"
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
        {(() => {
          const hopBellP = seg(localT, clickAt + 0.18, clickAt + 0.45);
          const approachP = seg(localT, 0.15, clickAt - 0.08);
          const cx = 560 + approachP * 195 + hopBellP * 135;
          const cy = 148 - approachP * 58;
          const pressing =
            (localT >= clickAt - 0.08 && localT <= clickAt + 0.1) ||
            (localT >= clickAt + 0.44 && localT <= clickAt + 0.58);
          return <CursorPointer x={cx} y={cy} pressing={pressing} />;
        })()}
      </div>

      {/* Bottom Subscribe & Save Benefit Pills (zero comment bait) */}
      <div className="w-full grid grid-cols-2 gap-[16px]">
        <div
          className="rounded-[22px] px-[24px] py-[18px] border flex items-center justify-between transition-colors"
          style={{
            backgroundColor: clicked ? 'rgba(5,150,105,0.1)' : look.sheet,
            borderColor: clicked ? '#059669' : look.line,
          }}
        >
          <span className="text-[24px] font-bold" style={{ color: look.ink }}>Plus de décryptages</span>
          <span
            className="text-[22px] font-mono font-extrabold"
            style={{ color: clicked ? '#059669' : look.accent }}
          >
            {clicked ? 'CLOCHE ON 🔔' : 'ACTIVE LA 🔔'}
          </span>
        </div>
        <div
          className="rounded-[22px] px-[24px] py-[18px] border flex items-center justify-between"
          style={{ backgroundColor: look.sheet, borderColor: look.line }}
        >
          <span className="text-[24px] font-bold" style={{ color: look.ink }}>Enregistre le post</span>
          <span className="text-[22px] font-mono font-extrabold" style={{ color: '#059669' }}>À REVOIR ★</span>
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
          emph: false,
        })),
    [project.transcript]
  );

  const chunks = useMemo(() => buildCaptionChunks(wordCues, 3, 20), [wordCues]);
  const activeChunk = getActiveCaptionChunk(t, chunks, []);

  const beatLocalT = Math.max(0, t - activeBeat.from);
  const beatSpan = Math.max(0.5, activeBeat.to - activeBeat.from);
  const beatProgress = clamp(beatLocalT / beatSpan, 0, 1);
  const gridShiftY = (t * 24) % 44;
  const gridShiftX = Math.sin(t * 0.34) * 16;
  // Smooth continuous Ken Burns push-in + gentle pan (zero 4s jump artifact)
  const brollZoom = 1.04 + 0.055 * beatProgress;
  const brollPanX = Math.sin(t * 0.52) * 16;
  const cutFlash = 1 - seg(beatLocalT, 0, 0.32);

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

        {/* Dot-matrix grid + 3 drifting ambient sky-blue glows + orbital geometric shapes */}
        {seam > 200 && (
          <div className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none" style={{ height: `${seam.toFixed(1)}px` }}>
            <div
              className="absolute inset-0 opacity-32"
              style={{
                backgroundImage: `radial-gradient(${look.ink3} 1.5px, transparent 1.5px)`,
                backgroundSize: '44px 44px',
                backgroundPosition: `${gridShiftX.toFixed(1)}px ${gridShiftY.toFixed(1)}px`,
              }}
            />

            {/* Floating Ambient Motion Dots & Ring */}
            <div
              className="absolute w-[180px] h-[180px] rounded-full border-2 opacity-20"
              style={{
                borderColor: look.accent,
                left: `${(760 + Math.sin(t * 0.7) * 55).toFixed(1)}px`,
                top: `${(240 + Math.cos(t * 0.55) * 70).toFixed(1)}px`,
                transform: `rotate(${(t * 22).toFixed(1)}deg)`,
              }}
            />
            <div
              className="absolute w-[42px] h-[42px] rounded-[12px] opacity-20"
              style={{
                backgroundColor: look.accent,
                left: `${(92 + Math.cos(t * 0.65) * 40).toFixed(1)}px`,
                top: `${(820 + Math.sin(t * 0.8) * 60).toFixed(1)}px`,
                transform: `rotate(${(t * 36).toFixed(1)}deg)`,
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

            {/* Beat Transition Kinetic Light Sweep */}
            {cutFlash > 0.02 && (
              <div
                className="absolute inset-y-0 w-[260px]"
                style={{
                  left: `${(-260 + (1 - cutFlash) * 1400).toFixed(1)}px`,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(37,142,255,0.18), rgba(255,255,255,0))',
                  transform: 'skewX(-18deg)',
                  opacity: cutFlash,
                }}
              />
            )}
          </div>
        )}

        {/* Fullscreen Bottom Melvynx Cinema B-Roll + Live 20-Bar Audio Waveform Dock (eliminates all blank space below y=1445) */}
        {seam >= 1650 && (
          <div
            className="absolute left-[56px] right-[168px] top-[1460px] h-[256px] rounded-[30px] border p-[18px] flex items-center gap-[22px] z-20 pointer-events-none"
            style={{
              backgroundColor: '#14161B',
              borderColor: 'rgba(255,255,255,0.14)',
              boxShadow: '0 26px 52px -14px rgba(20,22,27,0.32)',
            }}
          >
            <div className="relative w-[290px] h-full rounded-[20px] overflow-hidden shrink-0 border border-white/15">
              <img
                src={brollAsset.src}
                alt={activeBeat.brollCaption || brollAsset.defaultCaption}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                style={{
                  transform: `translateX(${(brollPanX * 0.4).toFixed(1)}px) scale(${brollZoom.toFixed(4)})`,
                  transformOrigin: 'center center',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
              <div className="absolute top-[12px] left-[12px] px-[10px] py-[4px] rounded-[8px] text-[18px] font-mono font-extrabold bg-black/75 text-[#60A5FA]">
                0{activeBeat.index} / 0{beats.length}
              </div>
            </div>

            <div className="flex-1 min-w-0 h-full flex flex-col justify-between py-[6px]">
              <div className="flex items-center justify-between gap-[12px]">
                <span className="text-[22px] font-mono font-bold uppercase text-[#60A5FA] truncate">
                  {activeBeat.shortLabel || activeBeat.screenLabel}
                </span>
                <span className="text-[22px] font-mono font-bold text-white/75 tabular-nums shrink-0">
                  {t.toFixed(1)} s
                </span>
              </div>

              <div className="text-[30px] font-extrabold text-white truncate" style={{ fontFamily: look.fontDisplay }}>
                {activeBeat.brollCaption || brollAsset.defaultCaption}
              </div>

              {/* 20-bar animated live voice spectrum */}
              <div className="flex items-end gap-[6px] h-[54px] w-full">
                {Array.from({ length: 20 }).map((_, i) => {
                  const barPct = 0.24 + 0.76 * Math.abs(Math.sin(t * 7.8 + i * 0.62));
                  const barActive = i / 20 <= beatProgress;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-full"
                      style={{
                        height: `${Math.round(barPct * 100)}%`,
                        backgroundColor: barActive ? look.accent : 'rgba(255,255,255,0.22)',
                      }}
                    />
                  );
                })}
              </div>

              <div className="h-[6px] w-full rounded-full bg-white/12 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(beatProgress * 100)}%`, backgroundColor: look.accent }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Lower Split-Screen B-Roll / Illustrated Motion Panel (bleeds cleanly below seam) */}
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
                transform: `translateX(${brollPanX.toFixed(1)}px) scale(${brollZoom.toFixed(4)})`,
                transformOrigin: 'center center',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-black/38" />

            {/* Corner Reticles + Live HUD indicator on B-Roll */}
            {seam > 300 && (
              <>
                <div className="absolute top-[42px] left-[48px] w-[26px] h-[26px] border-t-[3px] border-l-[3px] border-white/55 rounded-tl-[6px]" />
                <div className="absolute top-[42px] right-[168px] w-[26px] h-[26px] border-t-[3px] border-r-[3px] border-white/55 rounded-tr-[6px]" />

                <div className="absolute bottom-[68px] left-[56px] right-[176px] flex flex-col gap-[12px] text-white/95">
                  <div className="flex items-center justify-between gap-[16px]">
                    <div className="flex items-center gap-[14px] min-w-0">
                      <span
                        className="w-[14px] h-[14px] rounded-full shrink-0"
                        style={{
                          backgroundColor: look.accent,
                          transform: `scale(${(0.85 + 0.3 * Math.abs(Math.sin(t * 4.5))).toFixed(2)})`,
                        }}
                      />
                      <div className="text-[30px] font-bold tracking-[-0.01em] drop-shadow truncate">
                        {activeBeat.brollCaption || brollAsset.defaultCaption}
                      </div>
                    </div>
                    <span className="text-[24px] font-mono font-bold text-white/85 tabular-nums shrink-0">
                      0{activeBeat.index}/0{beats.length} · {t.toFixed(1)} s
                    </span>
                  </div>
                  <div className="h-[5px] w-full rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round(beatProgress * 100)}%`, backgroundColor: look.accent }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Upper Kinetic Motion Stage (z-20, balanced vertically inside safe zone above captions) */}
        <div
          className="absolute inset-x-0 z-20 px-[56px] flex flex-col justify-center pointer-events-none"
          style={{
            top: '196px',
            height: `${(seam >= 1650 ? 1104 : seam > 300 ? Math.max(580, seam - 300) : 1020).toFixed(0)}px`,
          }}
        >
          {renderDynamicBeatScene(activeBeat, beatLocalT, beatSpan, look)}
        </div>

        {/* Unified 4-word Captions Capsule on seam (z-30, zero word-by-word boxes) */}
        {activeChunk && (
          <div
            className="absolute inset-x-0 flex justify-center items-center px-[56px] pointer-events-none z-30"
            style={{ top: `${captionTopY.toFixed(1)}px`, transform: 'translateY(-50%)' }}
          >
            <div
              className="inline-flex flex-wrap items-baseline justify-center gap-x-[15px] px-[38px] py-[18px] rounded-[24px] border max-w-[920px]"
              style={{
                backgroundColor: overVideo ? 'rgba(20, 22, 27, 0.88)' : 'rgba(252, 251, 248, 0.96)',
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
                    className="inline-block font-extrabold leading-[1.12] tracking-[-0.03em]"
                    style={{
                      fontFamily: look.fontDisplay,
                      fontSize: '66px',
                      color: isActive ? highlightColor : baseColor,
                      transform: isActive ? 'scale(1.07) translateY(-2px)' : 'scale(1)',
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
