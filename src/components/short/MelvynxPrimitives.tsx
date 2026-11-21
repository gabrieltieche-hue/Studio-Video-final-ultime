import React from 'react';
import { CREATOR_PROFILE, type LookPreset } from '../../data/shortSpec';
import { clamp, lerp, seg, smoothstep, spring } from '../../engine/math';
import { normalizeToUniversalPrimitive } from '../../engine/shortPrimitivesSchema';
import type { DynamicBeat } from '../../engine/transcriptUtils';
import type { UniversalPrimitiveType } from '../../types/batch';

export interface PrimitiveRenderProps {
  beat: DynamicBeat;
  t: number; // local time inside beat (0..beatSpan)
  span: number;
  look: LookPreset;
  layout: 'split' | 'fullscreen';
}

const BLUE = '#007AFF';
const INK = '#111827';
const SUB = '#4B5563';
const BORDER = 'rgba(17, 24, 39, 0.10)';
const CARD_SHADOW = '0 22px 48px -14px rgba(17, 24, 39, 0.16), 0 4px 12px rgba(17, 24, 39, 0.05)';

/**
 * Shared @melvynx.dev headline renderer:
 * Bold dark display typography with 1 key phrase inside a #007AFF blue pill.
 * Adaptive sizing, ZERO CSS truncate, ZERO ellipsis.
 */
export const MelvynxHeadline: React.FC<{
  title: string;
  highlightWord?: string;
  strikeWord?: string;
  t: number;
  look: LookPreset;
  compact?: boolean;
}> = ({ title, highlightWord, strikeWord, t, look, compact }) => {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return null;

  const p = spring(t, 16);
  const len = cleanTitle.length;
  const fontSize = compact
    ? len > 32 ? 32 : len > 22 ? 36 : 42
    : len > 34 ? 36 : len > 24 ? 42 : 48;

  const renderSegments = () => {
    const hw = highlightWord?.trim();
    const sw = strikeWord?.trim();

    // Direct phrase match (supports multi-word or short numeric tokens like "40 %", "+1,6 %", "fiche de paie")
    if (hw) {
      const idx = cleanTitle.toLowerCase().indexOf(hw.toLowerCase());
      if (idx !== -1) {
        const before = cleanTitle.slice(0, idx);
        const match = cleanTitle.slice(idx, idx + hw.length);
        const after = cleanTitle.slice(idx + hw.length);
        return (
          <>
            {before && <span>{before}</span>}
            <span
              className="inline-block px-[16px] py-[2px] mx-[4px] rounded-[14px] text-white"
              style={{
                backgroundColor: BLUE,
                boxShadow: '0 8px 20px -6px rgba(0, 122, 255, 0.45)',
              }}
            >
              {match}
            </span>
            {after && <span>{after}</span>}
          </>
        );
      }
    }

    if (sw) {
      const idx = cleanTitle.toLowerCase().indexOf(sw.toLowerCase());
      if (idx !== -1) {
        const before = cleanTitle.slice(0, idx);
        const match = cleanTitle.slice(idx, idx + sw.length);
        const after = cleanTitle.slice(idx + sw.length);
        return (
          <>
            {before && <span>{before}</span>}
            <span className="relative inline-block mx-[4px] text-[#DC2626] opacity-90">
              <span>{match}</span>
              <span
                className="absolute left-0 right-0 top-[52%] h-[5px] bg-[#DC2626] rounded-full"
                style={{ transform: `scaleX(${spring(t - 0.1, 14).toFixed(2)})` }}
              />
            </span>
            {after && <span>{after}</span>}
          </>
        );
      }
    }

    // Automatic spotlight on numeric/final meaningful word if no explicit highlightWord matched
    const words = cleanTitle.split(/\s+/);
    if (words.length >= 2) {
      const idxNum = words.findIndex((w) => /\d|%|\$|€/.test(w));
      const targetIdx = idxNum >= 0 ? idxNum : words.length - 1;
      return words.map((w, i) =>
        i === targetIdx ? (
          <span
            key={i}
            className="inline-block px-[15px] py-[2px] mx-[4px] rounded-[14px] text-white"
            style={{ backgroundColor: BLUE }}
          >
            {w}
          </span>
        ) : (
          <span key={i} className="mx-[4px]">
            {w}
          </span>
        )
      );
    }
    return cleanTitle;
  };

  return (
    <div
      className="w-full text-center mb-[20px] px-[8px]"
      style={{
        opacity: clamp(p * 1.8, 0, 1),
        transform: `translateY(${(18 * (1 - p)).toFixed(1)}px)`,
      }}
    >
      <h2
        className="font-extrabold leading-[1.15] tracking-[-0.03em] break-words"
        style={{
          fontFamily: look.fontDisplay,
          fontSize: `${fontSize}px`,
          color: look.id === 'poster' ? '#FFFFFF' : INK,
        }}
      >
        {renderSegments()}
      </h2>
    </div>
  );
};

// 1. Metric Shock Hook
const MetricShockHook: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const pCard = spring(t, 15);
  const pStamp = spring(t - 0.35, 18);
  const metric = beat.statValue || beat.shortLabel || '100 %';
  const sub = beat.statLabel || beat.quoteText || beat.spokenLine.slice(0, 68);
  const stamp = beat.stampWord || beat.dateBadge;
  const metricSize = metric.length > 9 ? 64 : metric.length > 5 ? 82 : 102;

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} strikeWord={beat.strikeWord} t={t} look={look} />
      <div
        className="relative w-full max-w-[820px] rounded-[34px] bg-white px-[42px] py-[44px] border text-center"
        style={{
          borderColor: BORDER,
          boxShadow: CARD_SHADOW,
          opacity: clamp(pCard * 1.8, 0, 1),
          transform: `translateY(${(30 * (1 - pCard)).toFixed(1)}px) scale(${(0.94 + 0.06 * pCard).toFixed(3)})`,
        }}
      >
        {stamp && (
          <div
            className="inline-block px-[22px] py-[8px] rounded-[12px] text-[24px] font-black tracking-[0.06em] uppercase mb-[18px] border-2"
            style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#DC2626',
              color: '#DC2626',
              transform: `scale(${lerp(1.4, 1, pStamp).toFixed(3)}) rotate(-2deg)`,
              opacity: clamp(pStamp * 2, 0, 1),
            }}
          >
            {stamp}
          </div>
        )}
        <div
          className="font-black tracking-[-0.04em] leading-none"
          style={{
            fontFamily: look.fontDisplay,
            fontSize: `${metricSize}px`,
            color: BLUE,
          }}
        >
          {metric}
        </div>
        <div className="mt-[18px] text-[30px] font-bold leading-[1.25] text-[#1F2937]">
          {sub}
        </div>
        {beat.sourceLabel && (
          <div className="mt-[14px] text-[22px] font-semibold text-[#6B7280]">
            Source · {beat.sourceLabel}
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Dot Population Scale (100/160 dots + magnifying callout)
const DotPopulationScale: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const pct = clamp(Number(beat.matrixHighlightPct ?? 20), 2, 98);
  const totalDots = 100;
  const activeCount = Math.max(1, Math.round((pct / 100) * totalDots));
  const fillP = seg(t, 0.12, 1.1);
  const currentLit = Math.round(activeCount * smoothstep(fillP));
  const lensP = spring(t - 0.55, 15);
  const callout = beat.matrixCalloutLabel || `${pct} %`;

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="relative w-full max-w-[820px] rounded-[34px] bg-white px-[36px] py-[34px] border"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="grid grid-cols-10 gap-[14px] place-items-center">
          {Array.from({ length: totalDots }, (_, i) => {
            const isLit = i < currentLit;
            return (
              <span
                key={i}
                className="w-[24px] h-[24px] rounded-full transition-colors"
                style={{
                  backgroundColor: isLit ? BLUE : '#E5E7EB',
                  transform: isLit ? 'scale(1.12)' : 'scale(0.92)',
                }}
              />
            );
          })}
        </div>
        <div
          className="mt-[26px] flex items-center justify-between rounded-[22px] px-[26px] py-[18px]"
          style={{
            backgroundColor: '#EFF6FF',
            border: '2px solid rgba(0, 122, 255, 0.25)',
            opacity: clamp(lensP * 1.8, 0, 1),
            transform: `translateY(${(18 * (1 - lensP)).toFixed(1)}px)`,
          }}
        >
          <span className="text-[30px] font-extrabold text-[#111827]">{callout}</span>
          <span className="text-[42px] font-black" style={{ color: BLUE, fontFamily: look.fontDisplay }}>
            {pct} %
          </span>
        </div>
      </div>
    </div>
  );
};

// 3. Paper Receipt / Payslip
const PaperReceiptPayslip: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const items =
    beat.receiptItems && beat.receiptItems.length > 0
      ? beat.receiptItems
      : [
          { label: beat.leftCard?.label || 'Montant brut', amount: beat.leftCard?.value || '—', tone: 'neutral' as const },
          { label: beat.rightCard?.label || 'Impact net', amount: beat.rightCard?.value || beat.statValue || '—', highlight: true, tone: 'positive' as const },
        ];
  const cardP = spring(t, 15);
  const totalP = spring(t - 0.6, 14);

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[760px] rounded-[28px] bg-[#FFFDF8] px-[38px] py-[34px] border-2"
        style={{
          borderColor: 'rgba(17, 24, 39, 0.14)',
          boxShadow: CARD_SHADOW,
          opacity: clamp(cardP * 1.8, 0, 1),
          transform: `translateY(${(32 * (1 - cardP)).toFixed(1)}px)`,
        }}
      >
        <div className="flex items-center justify-between pb-[16px] border-b-2 border-dashed border-[#D1D5DB]">
          <span className="text-[22px] font-black tracking-[0.08em] uppercase text-[#6B7280]">
            {beat.screenLabel || 'RELEVÉ DÉTAILLÉ'}
          </span>
          <span className="text-[22px] font-bold text-[#111827]">
            {beat.sourceLabel || beat.dateBadge || '2026'}
          </span>
        </div>

        <div className="divide-y divide-dashed divide-[#E5E7EB] my-[8px]">
          {items.slice(0, 5).map((row, idx) => {
            const rowP = spring(t - idx * 0.14, 16);
            const color =
              row.tone === 'negative' ? '#DC2626' : row.tone === 'positive' ? '#059669' : INK;
            return (
              <div
                key={idx}
                className="flex items-center justify-between py-[16px] gap-[18px]"
                style={{
                  opacity: clamp(rowP * 2, 0, 1),
                  transform: `translateX(${(-16 * (1 - rowP)).toFixed(1)}px)`,
                }}
              >
                <span className="text-[28px] font-bold text-[#1F2937] leading-[1.2]">
                  {row.label}
                </span>
                <span
                  className="text-[32px] font-black shrink-0"
                  style={{ color, fontFamily: look.fontDisplay }}
                >
                  {row.amount}
                </span>
              </div>
            );
          })}
        </div>

        {(beat.receiptTotalValue || beat.receiptTotalLabel) && (
          <div
            className="mt-[14px] rounded-[18px] px-[24px] py-[18px] flex items-center justify-between"
            style={{
              backgroundColor: BLUE,
              color: '#FFFFFF',
              opacity: clamp(totalP * 2, 0, 1),
              transform: `scale(${(0.95 + 0.05 * totalP).toFixed(3)})`,
            }}
          >
            <span className="text-[28px] font-extrabold">
              {beat.receiptTotalLabel || 'Total réel'}
            </span>
            <span className="text-[38px] font-black" style={{ fontFamily: look.fontDisplay }}>
              {beat.receiptTotalValue || beat.statValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// 4. Countdown Calendar Stamp
const CountdownCalendarStamp: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const month = beat.calendarMonth || beat.dateBadge || 'ÉCHÉANCE';
  const year = beat.calendarYear || '2026';
  const marked = new Set(beat.calendarDaysMarked || [1, 8, 15, 22]);
  const hiDay = beat.calendarHighlightDay || 20;
  const cardP = spring(t, 15);
  const stampP = spring(t - 0.52, 20);
  const stamp = beat.stampWord || 'ACTIF';

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="relative w-full max-w-[780px] rounded-[32px] bg-white p-[32px] border"
        style={{
          borderColor: BORDER,
          boxShadow: CARD_SHADOW,
          opacity: clamp(cardP * 1.8, 0, 1),
          transform: `translateY(${(28 * (1 - cardP)).toFixed(1)}px)`,
        }}
      >
        <div className="flex items-center justify-between pb-[18px] border-b border-[#E5E7EB]">
          <span className="text-[34px] font-black uppercase tracking-[-0.02em] text-[#111827]">
            {month} {year}
          </span>
          <span
            className="px-[18px] py-[6px] rounded-[12px] text-[24px] font-black text-white"
            style={{ backgroundColor: BLUE }}
          >
            JOUR {hiDay}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-[10px] mt-[20px]">
          {Array.from({ length: 28 }, (_, i) => {
            const d = i + 1;
            const isHi = d === hiDay;
            const isMarked = marked.has(d);
            return (
              <div
                key={d}
                className="h-[58px] rounded-[14px] flex items-center justify-center text-[25px] font-extrabold border"
                style={{
                  backgroundColor: isHi ? BLUE : isMarked ? '#FEF2F2' : '#F9FAFB',
                  borderColor: isHi ? BLUE : isMarked ? '#FCA5A5' : '#E5E7EB',
                  color: isHi ? '#FFFFFF' : isMarked ? '#DC2626' : '#374151',
                }}
              >
                {d}
              </div>
            );
          })}
        </div>

        <div className="mt-[20px] flex items-center justify-between gap-[16px]">
          <span className="text-[26px] font-bold text-[#374151]">
            {beat.calendarNote || beat.statLabel || beat.shortLabel}
          </span>
          <span
            className="px-[22px] py-[8px] rounded-[12px] border-2 text-[26px] font-black uppercase shrink-0"
            style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#DC2626',
              color: '#DC2626',
              opacity: clamp(stampP * 2, 0, 1),
              transform: `scale(${lerp(1.4, 1, stampP).toFixed(3)}) rotate(-4deg)`,
            }}
          >
            {stamp}
          </span>
        </div>
      </div>
    </div>
  );
};

// 5. Balance Scale Duel
const BalanceScaleDuel: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const left = beat.leftCard || beat.comparisonLeft || { label: 'Côté A', value: '—', sub: '' };
  const right = beat.rightCard || beat.comparisonRight || { label: 'Côté B', value: '—', sub: '' };
  const p = spring(t, 14);
  const tiltDir = beat.scaleTilt === 'left' ? -10 : beat.scaleTilt === 'balanced' ? 0 : 10;
  const angle = lerp(0, tiltDir, spring(t - 0.3, 12));

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[880px] rounded-[34px] bg-white p-[36px] border"
        style={{
          borderColor: BORDER,
          boxShadow: CARD_SHADOW,
          opacity: clamp(p * 1.8, 0, 1),
        }}
      >
        {/* Tilting beam */}
        <div className="relative flex flex-col items-center mb-[26px] pt-[12px]">
          <div
            className="w-[480px] h-[14px] rounded-full bg-[#111827] relative"
            style={{ transform: `rotate(${angle.toFixed(2)}deg)` }}
          >
            <span className="absolute -left-[12px] -top-[7px] w-[28px] h-[28px] rounded-full bg-[#DC2626] border-4 border-white" />
            <span className="absolute -right-[12px] -top-[7px] w-[28px] h-[28px] rounded-full bg-[#007AFF] border-4 border-white" />
          </div>
          <div className="w-0 h-0 border-l-[24px] border-r-[24px] border-b-[34px] border-l-transparent border-r-transparent border-b-[#111827] -mt-[4px]" />
        </div>

        <div className="grid grid-cols-2 gap-[24px]">
          <div className="rounded-[24px] bg-[#FEF2F2] border-2 border-[#FCA5A5] p-[28px]">
            <div className="text-[24px] font-extrabold text-[#991B1B] uppercase">{left.label}</div>
            <div className="mt-[8px] text-[48px] font-black text-[#DC2626]" style={{ fontFamily: look.fontDisplay }}>
              {left.value}
            </div>
            {'sub' in left && left.sub && (
              <div className="mt-[8px] text-[24px] font-semibold text-[#7F1D1D]">{left.sub}</div>
            )}
          </div>
          <div className="rounded-[24px] bg-[#EFF6FF] border-2 border-[#93C5FD] p-[28px]">
            <div className="text-[24px] font-extrabold text-[#1E3A8A] uppercase">{right.label}</div>
            <div className="mt-[8px] text-[48px] font-black" style={{ color: BLUE, fontFamily: look.fontDisplay }}>
              {right.value}
            </div>
            {'sub' in right && right.sub && (
              <div className="mt-[8px] text-[24px] font-semibold text-[#1E40AF]">{right.sub}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 6. Trap & Barrier Alert
const TrapBarrierAlert: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const p = spring(t, 16);
  const badge = beat.barrierBadge || beat.stampWord || 'BLOCAGE';
  const ruleText = beat.barrierRuleText || beat.quoteText || beat.statLabel || beat.spokenLine.slice(0, 78);
  const bullets = (beat.bullets || []).slice(0, 3);

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[820px] rounded-[34px] bg-[#14161B] text-white p-[38px] border-2 border-[#DC2626]"
        style={{
          boxShadow: '0 26px 60px rgba(220, 38, 38, 0.25)',
          opacity: clamp(p * 1.8, 0, 1),
          transform: `scale(${(0.94 + 0.06 * p).toFixed(3)})`,
        }}
      >
        <div className="flex items-center justify-between gap-[16px] pb-[20px] border-b border-white/15">
          <div className="flex items-center gap-[14px]">
            <div className="w-[54px] h-[54px] rounded-[16px] bg-[#DC2626] flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <span className="px-[20px] py-[8px] rounded-[12px] bg-[#DC2626] text-[25px] font-black tracking-[0.06em] uppercase">
              {badge}
            </span>
          </div>
          {beat.dateBadge && (
            <span className="text-[24px] font-bold text-white/75">{beat.dateBadge}</span>
          )}
        </div>

        <div className="mt-[22px] text-[34px] font-extrabold leading-[1.28] text-white">
          {ruleText}
        </div>

        {bullets.length > 0 && (
          <div className="mt-[22px] space-y-[12px]">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-[12px] text-[25px] font-semibold text-white/85">
                <span className="w-[10px] h-[10px] rounded-full bg-[#FCA5A5] shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 7. Hydraulic Compressor
const HydraulicCompressor: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const fromVal = beat.compressorFrom || beat.leftCard?.value || '100 %';
  const toVal = beat.compressorTo || beat.rightCard?.value || beat.statValue || '20 %';
  const unitLabel = beat.compressorUnitLabel || beat.statLabel || beat.shortLabel;
  const pressP = seg(t, 0.2, 0.95);
  const crush = smoothstep(pressP);

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[840px] rounded-[34px] bg-white p-[38px] border"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="text-center text-[26px] font-bold uppercase tracking-[0.05em] text-[#6B7280] mb-[18px]">
          {unitLabel}
        </div>

        {/* Hydraulic press beam */}
        <div className="relative rounded-[24px] bg-[#F3F4F6] p-[28px] flex flex-col items-center overflow-hidden">
          <div
            className="w-full h-[28px] rounded-[12px] bg-[#1F2937] mb-[18px] flex items-center justify-center"
            style={{ transform: `translateY(${(crush * 24).toFixed(1)}px)` }}
          >
            <div className="w-[120px] h-[8px] rounded-full bg-[#60A5FA]" />
          </div>

          <div className="w-full flex items-center justify-around gap-[24px] py-[16px]">
            <div
              className="rounded-[22px] bg-[#FEE2E2] border-2 border-[#EF4444] px-[32px] py-[20px] text-center"
              style={{
                transform: `scale(${lerp(1.06, 0.82, crush).toFixed(3)})`,
                opacity: lerp(1, 0.65, crush),
              }}
            >
              <div className="text-[22px] font-extrabold text-[#991B1B] uppercase">Avant</div>
              <div className="text-[54px] font-black text-[#DC2626] line-through" style={{ fontFamily: look.fontDisplay }}>
                {fromVal}
              </div>
            </div>

            <div className="text-[48px] font-black" style={{ color: BLUE }}>→</div>

            <div
              className="rounded-[22px] px-[36px] py-[24px] text-center text-white"
              style={{
                backgroundColor: BLUE,
                transform: `scale(${lerp(0.88, 1.08, crush).toFixed(3)})`,
                boxShadow: '0 20px 40px -12px rgba(0, 122, 255, 0.48)',
              }}
            >
              <div className="text-[22px] font-extrabold uppercase opacity-90">Réel</div>
              <div className="text-[64px] font-black" style={{ fontFamily: look.fontDisplay }}>
                {toVal}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 8. Scrolling Checklist Spotlight
const ScrollingChecklistSpotlight: React.FC<PrimitiveRenderProps> = ({ beat, t, span, look }) => {
  const items = (beat.bullets && beat.bullets.length > 0 ? beat.bullets : beat.steps || [beat.shortLabel]).slice(0, 5);
  const progress = clamp(t / Math.max(1, span - 0.3), 0, 0.999);
  const activeIdx = Math.min(items.length - 1, Math.floor(progress * items.length));

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[900px] rounded-[34px] bg-white p-[32px] border grid grid-cols-12 gap-[24px] items-center"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="col-span-7 space-y-[12px]">
          {items.map((txt, idx) => {
            const isActive = idx === activeIdx;
            return (
              <div
                key={idx}
                className="rounded-[18px] px-[20px] py-[14px] flex items-center gap-[14px] border"
                style={{
                  backgroundColor: isActive ? '#EFF6FF' : '#F9FAFB',
                  borderColor: isActive ? BLUE : '#E5E7EB',
                  transform: isActive ? 'translateX(8px)' : 'none',
                }}
              >
                <span
                  className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center text-[21px] font-black shrink-0"
                  style={{
                    backgroundColor: isActive ? BLUE : '#E5E7EB',
                    color: isActive ? '#FFFFFF' : '#4B5563',
                  }}
                >
                  0{idx + 1}
                </span>
                <span className="text-[25px] font-bold leading-[1.22] text-[#111827]">{txt}</span>
              </div>
            );
          })}
        </div>

        <div className="col-span-5 rounded-[26px] bg-[#14161B] text-white p-[28px] h-full flex flex-col justify-between min-h-[300px]">
          <div className="text-[22px] font-black tracking-[0.06em] uppercase text-[#60A5FA]">
            POINT 0{activeIdx + 1} / 0{items.length}
          </div>
          <div className="text-[32px] font-extrabold leading-[1.25] my-[14px]">
            {items[activeIdx]}
          </div>
          <div className="h-[10px] w-full rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(((activeIdx + 1) / items.length) * 100).toFixed(0)}%`,
                backgroundColor: BLUE,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// 9. Radial Mindmap Hub
const RadialMindmapHub: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const center = beat.mindmapCenter || beat.shortLabel || 'CŒUR';
  const nodes: Array<{ label: string; detail?: string }> =
    beat.mindmapNodes && beat.mindmapNodes.length > 0
      ? beat.mindmapNodes.slice(0, 4)
      : (beat.bullets || []).slice(0, 4).map((b) => ({ label: b }));
  const p = spring(t, 14);

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[880px] rounded-[34px] bg-white p-[36px] border flex flex-col items-center"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW, opacity: clamp(p * 1.8, 0, 1) }}
      >
        {/* Hub center */}
        <div
          className="px-[34px] py-[18px] rounded-[22px] text-[34px] font-black text-white shadow-lg"
          style={{ backgroundColor: BLUE, fontFamily: look.fontDisplay }}
        >
          {center}
        </div>

        {/* SVG connector lines */}
        <svg width="680" height="64" viewBox="0 0 680 64" className="overflow-visible">
          {nodes.map((_, i) => {
            const count = nodes.length;
            const targetX = count === 1 ? 340 : 70 + (i / (count - 1)) * 540;
            const lineP = seg(t, 0.12 + i * 0.12, 0.4 + i * 0.12);
            return (
              <path
                key={i}
                d={`M 340 0 C 340 34, ${targetX.toFixed(0)} 30, ${targetX.toFixed(0)} 64`}
                fill="none"
                stroke={BLUE}
                strokeWidth="4"
                strokeDasharray="360"
                strokeDashoffset={(360 * (1 - smoothstep(lineP))).toFixed(1)}
              />
            );
          })}
        </svg>

        <div
          className="grid gap-[16px] w-full"
          style={{ gridTemplateColumns: `repeat(${Math.max(2, nodes.length)}, minmax(0, 1fr))` }}
        >
          {nodes.map((n, i) => {
            const np = spring(t - (0.18 + i * 0.12), 16);
            return (
              <div
                key={i}
                className="rounded-[22px] bg-[#F8FAFC] border border-[#CBD5E1] p-[20px] text-center"
                style={{
                  opacity: clamp(np * 2, 0, 1),
                  transform: `translateY(${(18 * (1 - np)).toFixed(1)}px)`,
                }}
              >
                <div className="text-[25px] font-extrabold text-[#111827] leading-[1.2]">{n.label}</div>
                {n.detail && (
                  <div className="mt-[8px] text-[21px] font-semibold" style={{ color: BLUE }}>
                    {n.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 10. Audit Table Detector
const AuditTableDetector: React.FC<PrimitiveRenderProps> = ({ beat, t, span, look, layout }) => {
  const rows =
    beat.auditRows && beat.auditRows.length > 0
      ? beat.auditRows.slice(0, 4)
      : (beat.bullets || []).slice(0, 3).map((b, i) => ({
          label: b,
          detail: '',
          status: (i === 0 ? 'alert' : 'ok') as 'alert' | 'ok',
          badge: i === 0 ? 'ALERTE' : 'VALIDÉ',
        }));

  const scanP = seg(t, 0.15, Math.min(1.6, span * 0.7));
  const alertCount = rows.filter((r) => r.status === 'alert').length;
  const isFull = layout === 'fullscreen';

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className={`relative w-full max-w-[880px] rounded-[34px] bg-white border overflow-hidden ${isFull ? 'p-[38px]' : 'p-[28px]'}`}
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center justify-between pb-[18px] mb-[18px] border-b border-[#E5E7EB]">
          <div className="flex items-center gap-[10px]">
            <span className="w-[12px] h-[12px] rounded-full bg-[#FF5F56]" />
            <span className="w-[12px] h-[12px] rounded-full bg-[#FFBD2E]" />
            <span className="w-[12px] h-[12px] rounded-full bg-[#27C93F]" />
            <span className="ml-[10px] text-[22px] font-mono font-bold uppercase tracking-[0.06em] text-[#6B7280]">
              {beat.screenLabel || 'INSPECTION'}
            </span>
          </div>
          <span
            className="px-[14px] py-[5px] rounded-[10px] text-[20px] font-black uppercase"
            style={{
              backgroundColor: alertCount > 0 ? '#FEF2F2' : '#ECFDF5',
              color: alertCount > 0 ? '#DC2626' : '#059669',
            }}
          >
            {alertCount > 0 ? `${alertCount} alerte détectée` : 'Conforme'}
          </span>
        </div>

        {/* Sweeping laser audit line */}
        {scanP < 0.99 && (
          <div
            className="absolute inset-x-0 h-[4px] bg-[#007AFF] pointer-events-none z-10"
            style={{
              top: `${(18 + scanP * 76).toFixed(1)}%`,
              boxShadow: '0 0 18px rgba(0, 122, 255, 0.7)',
            }}
          />
        )}

        <div className={isFull ? 'space-y-[18px]' : 'space-y-[14px]'}>
          {rows.map((r, idx) => {
            const rp = spring(t - idx * 0.18, 16);
            const isAlert = r.status === 'alert';
            const isRemoved = r.status === 'removed';
            const bg = isAlert ? '#FEF2F2' : isRemoved ? '#F3F4F6' : '#ECFDF5';
            const fg = isAlert ? '#DC2626' : isRemoved ? '#4B5563' : '#059669';
            return (
              <div
                key={idx}
                className={`rounded-[22px] px-[26px] border flex items-center justify-between gap-[16px] ${isFull ? 'py-[24px]' : 'py-[18px]'}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: isAlert ? '#FCA5A5' : '#E5E7EB',
                  opacity: clamp(rp * 2, 0, 1),
                  transform: `translateY(${(14 * (1 - rp)).toFixed(1)}px)`,
                }}
              >
                <div className="min-w-0">
                  <div className={`text-[30px] font-extrabold ${isRemoved ? 'line-through text-[#6B7280]' : 'text-[#111827]'}`}>
                    {r.label}
                  </div>
                  {r.detail && <div className="text-[23px] font-medium text-[#6B7280] mt-[3px]">{r.detail}</div>}
                </div>
                <span
                  className="px-[20px] py-[9px] rounded-[12px] text-[22px] font-black uppercase shrink-0"
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {r.badge}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 11. Profile Objection Deck
const ProfileObjectionDeck: React.FC<PrimitiveRenderProps> = ({ beat, t, look, layout }) => {
  const isFull = layout === 'fullscreen';
  const cards =
    beat.profileCards && beat.profileCards.length > 0
      ? beat.profileCards.slice(0, 3)
      : [
          {
            name: beat.leftCard?.label || 'Cas 1',
            role: beat.leftCard?.sub || '',
            metric: beat.leftCard?.value || '—',
            quote: beat.quoteText || '',
          },
          {
            name: beat.rightCard?.label || 'Cas 2',
            role: beat.rightCard?.sub || '',
            metric: beat.rightCard?.value || '—',
            quote: '',
          },
        ];

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div className={`w-full max-w-[880px] ${isFull ? 'space-y-[22px]' : 'space-y-[16px]'}`}>
        {cards.map((c, idx) => {
          const cp = spring(t - idx * 0.16, 15);
          return (
            <div
              key={idx}
              className={`rounded-[28px] bg-white px-[32px] border flex items-center justify-between gap-[20px] ${isFull ? 'py-[30px]' : 'py-[22px]'}`}
              style={{
                borderColor: idx === cards.length - 1 ? BLUE : BORDER,
                borderWidth: idx === cards.length - 1 ? '2px' : '1px',
                boxShadow: CARD_SHADOW,
                opacity: clamp(cp * 2, 0, 1),
                transform: `translateY(${(22 * (1 - cp)).toFixed(1)}px)`,
              }}
            >
              <div className="flex items-center gap-[22px]">
                <div
                  className="w-[74px] h-[74px] rounded-full flex items-center justify-center text-[32px] font-black text-white shrink-0"
                  style={{ backgroundColor: idx === cards.length - 1 ? BLUE : '#1F2937' }}
                >
                  {(c.name || 'P')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-[30px] font-black text-[#111827]">{c.name}</div>
                  {c.role && <div className="text-[23px] font-semibold text-[#6B7280]">{c.role}</div>}
                  {c.quote && <div className="text-[24px] font-medium text-[#374151] mt-[4px]">“{c.quote}”</div>}
                </div>
              </div>
              <div
                className="text-[44px] font-black shrink-0"
                style={{ color: idx === cards.length - 1 ? BLUE : '#111827', fontFamily: look.fontDisplay }}
              >
                {c.metric}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 12. Notification Explosion Stamp
const NotificationExplosionStamp: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const notifs =
    beat.notifItems && beat.notifItems.length > 0
      ? beat.notifItems.slice(0, 3)
      : [{ sender: beat.screenLabel || 'ALERTE', message: beat.statLabel || beat.spokenLine.slice(0, 56), time: 'Maintenant' }];
  const count = beat.notifCount || 'x99+';
  const stamp = beat.stampWord || 'SATURÉ';
  const stampP = spring(t - 0.55, 19);

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div className="relative w-full max-w-[840px] space-y-[14px]">
        <div className="flex justify-end mb-[6px]">
          <span className="px-[20px] py-[6px] rounded-full bg-[#DC2626] text-white text-[28px] font-black shadow-lg">
            {count}
          </span>
        </div>
        {notifs.map((n, i) => {
          const np = spring(t - i * 0.14, 16);
          return (
            <div
              key={i}
              className="rounded-[24px] bg-white px-[28px] py-[22px] border flex items-center justify-between gap-[16px]"
              style={{
                borderColor: BORDER,
                boxShadow: CARD_SHADOW,
                opacity: clamp(np * 2, 0, 1),
                transform: `translateY(${(24 * (1 - np)).toFixed(1)}px) scale(${(0.95 + 0.05 * np).toFixed(3)})`,
              }}
            >
              <div>
                <div className="text-[24px] font-black text-[#111827]">{n.sender}</div>
                <div className="text-[26px] font-semibold text-[#374151] mt-[2px]">{n.message}</div>
              </div>
              <span className="text-[21px] font-bold text-[#9CA3AF] shrink-0">{n.time || '1m'}</span>
            </div>
          );
        })}

        <div className="pt-[10px] flex justify-end">
          <div
            className="px-[28px] py-[10px] rounded-[16px] border-4 border-[#DC2626] bg-[#FEF2F2] text-[#DC2626] text-[34px] font-black uppercase tracking-[0.06em]"
            style={{
              opacity: clamp(stampP * 2.4, 0, 1),
              transform: `scale(${lerp(1.45, 1, stampP).toFixed(3)}) rotate(-3deg)`,
              fontFamily: look.fontDisplay,
              boxShadow: '0 16px 32px rgba(220, 38, 38, 0.2)',
            }}
          >
            {stamp}
          </div>
        </div>
      </div>
    </div>
  );
};

// 13. Segmented Quota Slider
const SegmentedQuotaSlider: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const pct = clamp(Number(beat.gaugePct ?? 75), 5, 99);
  const actual = beat.quotaActualLabel || `${pct} % Réel`;
  const planned = beat.quotaPlannedLabel || 'Objectif prévu';
  const bars =
    beat.quotaBars && beat.quotaBars.length > 0
      ? beat.quotaBars
      : [
          { label: 'P1', pct: Math.max(15, pct - 20) },
          { label: 'P2', pct: Math.max(25, pct - 8) },
          { label: 'P3', pct },
          { label: 'P4', pct: Math.min(98, pct + 10) },
        ];
  const sweep = smoothstep(seg(t, 0.15, 1.0));

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[840px] rounded-[34px] bg-white p-[36px] border"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center justify-between mb-[16px]">
          <span className="text-[28px] font-bold text-[#6B7280]">{planned}</span>
          <span className="text-[36px] font-black" style={{ color: BLUE, fontFamily: look.fontDisplay }}>
            {actual}
          </span>
        </div>

        {/* Continuous horizontal track */}
        <div className="w-full h-[34px] rounded-full bg-[#F3F4F6] overflow-hidden p-[4px] mb-[28px]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(pct * sweep).toFixed(1)}%`,
              background: pct > 75 ? 'linear-gradient(90deg, #007AFF, #DC2626)' : BLUE,
            }}
          />
        </div>

        {/* Segmented bars */}
        <div className="grid gap-[14px]" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
          {bars.map((b, i) => {
            const fill = clamp(b.pct * sweep, 0, 100);
            const barColor = b.pct > 80 ? '#DC2626' : b.pct > 55 ? '#F59E0B' : '#10B981';
            return (
              <div key={i} className="rounded-[18px] bg-[#F9FAFB] p-[16px] border border-[#E5E7EB] text-center">
                <div className="h-[110px] flex items-end justify-center mb-[10px]">
                  <div
                    className="w-[46px] rounded-t-[10px]"
                    style={{ height: `${Math.max(12, fill)}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="text-[24px] font-black text-[#111827]">{b.pct} %</div>
                <div className="text-[20px] font-semibold text-[#6B7280]">{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 14. Hand-Drawn Marker Highlight
const HandDrawnMarkerHighlight: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const quote = beat.quoteText || beat.newsHeadline || beat.spokenLine;
  const hi = beat.quoteHighlight || beat.newsHighlightPhrase || '';
  const source = beat.sourceLabel || beat.newsPublication || 'Document officiel';
  const markP = smoothstep(seg(t, 0.25, 1.05));
  const p = spring(t, 15);

  const renderHighlightedText = () => {
    if (!hi || !quote.toLowerCase().includes(hi.toLowerCase())) {
      return quote;
    }
    const idx = quote.toLowerCase().indexOf(hi.toLowerCase());
    const before = quote.slice(0, idx);
    const match = quote.slice(idx, idx + hi.length);
    const after = quote.slice(idx + hi.length);

    return (
      <>
        {before}
        <span className="relative inline-block px-[6px]">
          <span
            className="absolute inset-y-[4px] left-0 bg-[#FDE047] rounded-[8px] -z-0"
            style={{ width: `${(markP * 100).toFixed(1)}%` }}
          />
          <span className="relative z-10 font-black text-[#111827]">{match}</span>
        </span>
        {after}
      </>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[840px] rounded-[30px] bg-[#FFFDF9] p-[38px] border-2 border-[#E5E7EB]"
        style={{
          boxShadow: CARD_SHADOW,
          opacity: clamp(p * 1.8, 0, 1),
          transform: `translateY(${(24 * (1 - p)).toFixed(1)}px)`,
        }}
      >
        <div className="flex items-center justify-between pb-[16px] border-b border-[#E5E7EB] mb-[22px]">
          <span className="text-[24px] font-black uppercase tracking-[0.04em]" style={{ color: BLUE }}>
            {source}
          </span>
          {beat.dateBadge && <span className="text-[22px] font-bold text-[#6B7280]">{beat.dateBadge}</span>}
        </div>
        <div className="text-[36px] font-bold leading-[1.35] text-[#1F2937]">
          “{renderHighlightedText()}”
        </div>
      </div>
    </div>
  );
};

// 15. Before -> After Morph
const BeforeAfterMorph: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const before = beat.beforeBadText || beat.leftCard?.label || 'Approche subie';
  const after = beat.afterGoodText || beat.rightCard?.label || 'Méthode calibrée';
  const morphP = smoothstep(seg(t, 0.35, 1.05));

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div className="w-full max-w-[860px] grid grid-cols-1 gap-[18px]">
        <div
          className="rounded-[26px] bg-[#FEF2F2] border-2 border-dashed border-[#EF4444] px-[32px] py-[24px] flex items-center justify-between"
          style={{
            opacity: lerp(1, 0.55, morphP),
            transform: `scale(${lerp(1, 0.96, morphP).toFixed(3)})`,
          }}
        >
          <div>
            <div className="text-[21px] font-black uppercase text-[#DC2626]">✕ Avant</div>
            <div className="text-[30px] font-bold text-[#7F1D1D] line-through mt-[4px]">{before}</div>
          </div>
          {beat.leftCard?.value && (
            <span className="text-[32px] font-black text-[#DC2626] shrink-0">{beat.leftCard.value}</span>
          )}
        </div>

        <div
          className="rounded-[28px] bg-white border-2 px-[34px] py-[30px] flex items-center justify-between"
          style={{
            borderColor: BLUE,
            boxShadow: CARD_SHADOW,
            transform: `scale(${lerp(0.94, 1.03, morphP).toFixed(3)})`,
          }}
        >
          <div>
            <div className="text-[22px] font-black uppercase" style={{ color: BLUE }}>✓ Après</div>
            <div className="text-[36px] font-black text-[#111827] mt-[4px]" style={{ fontFamily: look.fontDisplay }}>
              {after}
            </div>
          </div>
          {beat.rightCard?.value && (
            <span className="text-[40px] font-black shrink-0" style={{ color: BLUE, fontFamily: look.fontDisplay }}>
              {beat.rightCard.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// 16. Animated Data Chart
const AnimatedDataChart: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const pts =
    beat.chartPoints && beat.chartPoints.length >= 2
      ? beat.chartPoints
      : [
          { label: 'T1', value: 40 },
          { label: 'T2', value: 62 },
          { label: 'T3', value: 94, highlight: true },
        ];
  const unit = beat.chartUnit || '';
  const values = pts.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = Math.max(1, maxV - minV);
  const drawP = smoothstep(seg(t, 0.12, 1.15));

  const coords = pts.map((pt, idx) => {
    const x = 60 + (idx / Math.max(1, pts.length - 1)) * 640;
    const y = 240 - ((pt.value - minV) / range) * 165;
    return { ...pt, x, y };
  });
  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[860px] rounded-[34px] bg-white p-[34px] border"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
      >
        <svg viewBox="0 0 760 300" className="w-full h-[290px] overflow-visible">
          {[60, 120, 180, 240].map((gy) => (
            <line key={gy} x1="40" y1={gy} x2="720" y2={gy} stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 6" />
          ))}
          <path
            d={pathD}
            fill="none"
            stroke={BLUE}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1100"
            strokeDashoffset={(1100 * (1 - drawP)).toFixed(1)}
          />
          {coords.map((c, idx) => {
            const pointVis = seg(drawP, idx / coords.length, (idx + 0.6) / coords.length);
            return (
              <g key={idx} style={{ opacity: pointVis }}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={c.highlight ? 13 : 9}
                  fill={c.highlight ? '#DC2626' : BLUE}
                  stroke="#FFFFFF"
                  strokeWidth="4"
                />
                <text
                  x={c.x}
                  y={c.y - 22}
                  textAnchor="middle"
                  fontSize="24"
                  fontWeight="800"
                  fill={c.highlight ? '#DC2626' : INK}
                >
                  {c.value}{unit}
                </text>
                <text x={c.x} y="285" textAnchor="middle" fontSize="22" fontWeight="700" fill="#6B7280">
                  {c.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// 17. Split Comparison Window
const SplitComparisonWindow: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const left = beat.comparisonLeft || { label: beat.leftCard?.label || 'Option A', value: beat.leftCard?.value || '—', ratio: 0.78 };
  const right = beat.comparisonRight || { label: beat.rightCard?.label || 'Option B', value: beat.rightCard?.value || '—', ratio: 0.34 };
  const fillP = smoothstep(seg(t, 0.15, 0.95));

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[860px] rounded-[34px] bg-white p-[36px] border space-y-[26px]"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
      >
        <div>
          <div className="flex justify-between items-baseline mb-[10px]">
            <span className="text-[28px] font-extrabold text-[#111827]">{left.label}</span>
            <span className="text-[36px] font-black text-[#DC2626]" style={{ fontFamily: look.fontDisplay }}>
              {left.value}
            </span>
          </div>
          <div className="h-[44px] rounded-[16px] bg-[#FEE2E2] overflow-hidden">
            <div
              className="h-full rounded-[16px] bg-[#DC2626]"
              style={{ width: `${(clamp(left.ratio, 0.1, 1) * 100 * fillP).toFixed(1)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-[10px]">
            <span className="text-[28px] font-extrabold text-[#111827]">{right.label}</span>
            <span className="text-[36px] font-black" style={{ color: BLUE, fontFamily: look.fontDisplay }}>
              {right.value}
            </span>
          </div>
          <div className="h-[44px] rounded-[16px] bg-[#DBEAFE] overflow-hidden">
            <div
              className="h-full rounded-[16px]"
              style={{ width: `${(clamp(right.ratio, 0.1, 1) * 100 * fillP).toFixed(1)}%`, backgroundColor: BLUE }}
            />
          </div>
        </div>

        {beat.multiplierBadge && (
          <div className="pt-[8px] flex justify-center">
            <span
              className="px-[26px] py-[10px] rounded-[16px] bg-[#14161B] text-white text-[30px] font-black"
              style={{ fontFamily: look.fontDisplay }}
            >
              Écart · {beat.multiplierBadge}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// 18. Process Pipeline
const ProcessPipeline: React.FC<PrimitiveRenderProps> = ({ beat, t, span, look }) => {
  const steps = (beat.steps && beat.steps.length > 0 ? beat.steps : beat.bullets || [beat.shortLabel]).slice(0, 4);
  const prog = clamp(t / Math.max(1, span - 0.3), 0, 1);

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div className="w-full max-w-[840px] space-y-[14px]">
        {steps.map((s, idx) => {
          const isReached = prog >= idx / steps.length;
          const sp = spring(t - idx * 0.15, 16);
          return (
            <div
              key={idx}
              className="rounded-[24px] bg-white px-[28px] py-[20px] border flex items-center gap-[20px]"
              style={{
                borderColor: isReached ? BLUE : BORDER,
                boxShadow: CARD_SHADOW,
                opacity: clamp(sp * 2, 0, 1),
                transform: `translateX(${(-20 * (1 - sp)).toFixed(1)}px)`,
              }}
            >
              <span
                className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center text-[28px] font-black text-white shrink-0"
                style={{ backgroundColor: isReached ? BLUE : '#9CA3AF' }}
              >
                {idx + 1}
              </span>
              <span className="text-[28px] font-extrabold text-[#111827] leading-[1.25]">{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 19. Terminal / Chat Window (Dev/AI topics only)
const TerminalChatWindow: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const cmd = beat.terminalCmd || '$ run --check';
  const lines = (beat.terminalOut && beat.terminalOut.length > 0 ? beat.terminalOut : beat.bullets || []).slice(0, 4);
  const p = spring(t, 15);

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[840px] rounded-[30px] bg-[#0F172A] text-white p-[32px] border border-white/15 font-mono"
        style={{
          boxShadow: '0 26px 60px rgba(15, 23, 42, 0.35)',
          opacity: clamp(p * 1.8, 0, 1),
        }}
      >
        <div className="flex items-center gap-[10px] pb-[18px] border-b border-white/10">
          <span className="w-[14px] h-[14px] rounded-full bg-[#EF4444]" />
          <span className="w-[14px] h-[14px] rounded-full bg-[#F59E0B]" />
          <span className="w-[14px] h-[14px] rounded-full bg-[#10B981]" />
          <span className="ml-[10px] text-[20px] text-white/60">terminal · session</span>
        </div>

        <div className="mt-[20px] text-[27px] font-bold text-[#38BDF8] break-words">
          {cmd}
        </div>
        <div className="mt-[18px] space-y-[12px]">
          {lines.map((ln, idx) => {
            const lp = spring(t - (0.25 + idx * 0.16), 16);
            return (
              <div
                key={idx}
                className="text-[24px] font-semibold text-[#E2E8F0] leading-[1.3]"
                style={{ opacity: clamp(lp * 2, 0, 1) }}
              >
                {ln}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 20. Rotary Control Deck
const RotaryControlDeck: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const knobs =
    beat.dialKnobs && beat.dialKnobs.length > 0
      ? beat.dialKnobs.slice(0, 3)
      : [
          { label: 'Levier 1', value: 85, unit: '%', active: true },
          { label: 'Levier 2', value: 30, unit: '%', active: false },
          { label: 'Levier 3', value: 92, unit: '%', active: true },
        ];

  const turnP = smoothstep(seg(t, 0.12, 1.0));

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[860px] rounded-[34px] bg-white p-[36px] border grid grid-cols-3 gap-[22px]"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
      >
        {knobs.map((k, idx) => {
          const val = Math.round(k.value * turnP);
          const deg = -135 + (val / 100) * 270;
          const color = k.active ? BLUE : '#6B7280';
          return (
            <div key={idx} className="rounded-[24px] bg-[#F8FAFC] border border-[#E2E8F0] p-[22px] flex flex-col items-center">
              <div className="relative w-[134px] h-[134px] rounded-full bg-white border-4 flex items-center justify-center shadow-inner" style={{ borderColor: color }}>
                <div
                  className="absolute inset-0 flex justify-center pt-[10px]"
                  style={{ transform: `rotate(${deg.toFixed(1)}deg)` }}
                >
                  <span className="w-[8px] h-[28px] rounded-full" style={{ backgroundColor: color }} />
                </div>
                <span className="text-[32px] font-black text-[#111827]" style={{ fontFamily: look.fontDisplay }}>
                  {val}{k.unit || '%'}
                </span>
              </div>
              <div className="mt-[16px] text-[24px] font-extrabold text-center text-[#111827]">
                {k.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 21. Globe / Network Flow
const GlobeNetworkFlow: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const origin = beat.globeOrigin || beat.shortLabel || 'Source';
  const dests =
    beat.globeDestinations && beat.globeDestinations.length > 0
      ? beat.globeDestinations.slice(0, 3)
      : [
          { label: beat.leftCard?.label || 'Flux A', value: beat.leftCard?.value || '—' },
          { label: beat.rightCard?.label || 'Flux B', value: beat.rightCard?.value || '—' },
        ];
  const p = spring(t, 14);

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div
        className="w-full max-w-[860px] rounded-[34px] bg-white p-[34px] border"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW, opacity: clamp(p * 1.8, 0, 1) }}
      >
        <div className="flex items-center justify-center mb-[22px]">
          <div className="px-[28px] py-[14px] rounded-full bg-[#14161B] text-white text-[28px] font-black flex items-center gap-[12px]">
            <span className="w-[14px] h-[14px] rounded-full bg-[#007AFF]" />
            <span>{origin}</span>
          </div>
        </div>

        <div className="grid gap-[16px]" style={{ gridTemplateColumns: `repeat(${Math.max(2, dests.length)}, minmax(0, 1fr))` }}>
          {dests.map((d, i) => {
            const dp = spring(t - (0.2 + i * 0.14), 16);
            return (
              <div
                key={i}
                className="rounded-[24px] bg-[#EFF6FF] border-2 border-[#BFDBFE] p-[22px] text-center"
                style={{
                  opacity: clamp(dp * 2, 0, 1),
                  transform: `translateY(${(18 * (1 - dp)).toFixed(1)}px)`,
                }}
              >
                <div className="text-[23px] font-bold text-[#1E3A8A]">{d.label}</div>
                <div className="mt-[8px] text-[38px] font-black" style={{ color: BLUE, fontFamily: look.fontDisplay }}>
                  {d.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 22. Editorial Evidence Board
const EditorialEvidenceBoard: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const cards =
    beat.fanCards && beat.fanCards.length > 0
      ? beat.fanCards.slice(0, 3)
      : [
          { tag: '#1', metric: beat.leftCard?.value || '—', label: beat.leftCard?.label || beat.shortLabel },
          { tag: '#2', metric: beat.statValue || '—', label: beat.statLabel || beat.shortLabel },
          { tag: '#3', metric: beat.rightCard?.value || '—', label: beat.rightCard?.label || beat.shortLabel },
        ];

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title} highlightWord={beat.highlightWord} t={t} look={look} />
      <div className="w-full max-w-[880px] grid grid-cols-3 gap-[18px]">
        {cards.map((c, idx) => {
          const cp = spring(t - idx * 0.14, 16);
          const isWinner = idx === cards.length - 1;
          return (
            <div
              key={idx}
              className="rounded-[28px] p-[26px] border flex flex-col justify-between min-h-[250px]"
              style={{
                backgroundColor: isWinner ? BLUE : '#FFFFFF',
                borderColor: isWinner ? BLUE : BORDER,
                color: isWinner ? '#FFFFFF' : INK,
                boxShadow: CARD_SHADOW,
                opacity: clamp(cp * 2, 0, 1),
                transform: `translateY(${(24 * (1 - cp)).toFixed(1)}px) rotate(${isWinner ? '0deg' : idx === 0 ? '-1.5deg' : '1.5deg'})`,
              }}
            >
              <span
                className="self-start px-[14px] py-[4px] rounded-[10px] text-[20px] font-black uppercase"
                style={{
                  backgroundColor: isWinner ? 'rgba(255,255,255,0.2)' : '#EFF6FF',
                  color: isWinner ? '#FFFFFF' : BLUE,
                }}
              >
                {c.tag}
              </span>
              <div className="text-[44px] font-black my-[10px]" style={{ fontFamily: look.fontDisplay }}>
                {c.metric}
              </div>
              <div className={`text-[23px] font-bold leading-[1.22] ${isWinner ? 'text-white/95' : 'text-[#374151]'}`}>
                {c.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 23. Dynamic Channel End CTA
const ChannelEndCta: React.FC<PrimitiveRenderProps> = ({ beat, t, look }) => {
  const handle = (beat.statValue || CREATOR_PROFILE.handle).trim();
  const tagline = (beat.statLabel || CREATOR_PROFILE.tagline).trim();
  const initial = (handle.replace(/^@/, '')[0] || CREATOR_PROFILE.initial).toUpperCase();

  const cardP = spring(t, 15);
  const clicked = t >= 0.72;
  const bellActive = t >= 1.05;
  const pressScale = t >= 0.68 && t <= 0.88 ? 0.93 : 1;
  const bellTilt =
    t >= 1.05 && t <= 2.1
      ? Math.sin((t - 1.05) * 36) * (1 - seg(t, 1.05, 2.1)) * 18
      : 0;

  return (
    <div className="w-full flex flex-col items-center">
      <MelvynxHeadline title={beat.title || 'Abonne-toi maintenant'} highlightWord={beat.highlightWord || 'maintenant'} t={t} look={look} />
      <div
        className="w-full max-w-[820px] rounded-[34px] bg-white p-[38px] border-2"
        style={{
          borderColor: clicked ? BLUE : BORDER,
          boxShadow: CARD_SHADOW,
          opacity: clamp(cardP * 1.8, 0, 1),
          transform: `translateY(${(28 * (1 - cardP)).toFixed(1)}px)`,
        }}
      >
        <div className="flex items-center gap-[22px] pb-[24px] border-b border-[#E5E7EB]">
          <div className="w-[86px] h-[86px] rounded-full bg-[#111827] text-white flex items-center justify-center text-[40px] font-black shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-[10px]">
              <span className="text-[38px] font-black text-[#111827]" style={{ fontFamily: look.fontDisplay }}>
                {handle}
              </span>
              <span className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white" style={{ backgroundColor: BLUE }}>
                ✓
              </span>
            </div>
            <div className="text-[25px] font-semibold text-[#4B5563] mt-[2px]">{tagline}</div>
          </div>
        </div>

        <div className="pt-[26px] flex items-center gap-[16px]">
          <div
            className="flex-1 h-[92px] rounded-[22px] flex items-center justify-center text-[36px] font-black"
            style={{
              backgroundColor: clicked ? '#E5E7EB' : BLUE,
              color: clicked ? '#111827' : '#FFFFFF',
              transform: `scale(${pressScale})`,
            }}
          >
            {clicked ? '✓ Abonné' : 'S’abonner'}
          </div>
          <div
            className="w-[92px] h-[92px] rounded-[22px] flex items-center justify-center border"
            style={{
              backgroundColor: bellActive ? '#111827' : '#F3F4F6',
              borderColor: bellActive ? '#111827' : '#E5E7EB',
              color: bellActive ? '#FFFFFF' : '#111827',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill={bellActive ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: `rotate(${bellTilt.toFixed(1)}deg)` }}
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const PRIMITIVE_COMPONENTS: Record<UniversalPrimitiveType, React.FC<PrimitiveRenderProps>> = {
  metric_shock_hook: MetricShockHook,
  dot_population_scale: DotPopulationScale,
  paper_receipt_payslip: PaperReceiptPayslip,
  countdown_calendar_stamp: CountdownCalendarStamp,
  balance_scale_duel: BalanceScaleDuel,
  trap_barrier_alert: TrapBarrierAlert,
  hydraulic_compressor: HydraulicCompressor,
  scrolling_checklist_spotlight: ScrollingChecklistSpotlight,
  radial_mindmap_hub: RadialMindmapHub,
  audit_table_detector: AuditTableDetector,
  profile_objection_deck: ProfileObjectionDeck,
  notification_explosion_stamp: NotificationExplosionStamp,
  segmented_quota_slider: SegmentedQuotaSlider,
  hand_drawn_marker_highlight: HandDrawnMarkerHighlight,
  before_after_morph: BeforeAfterMorph,
  animated_data_chart: AnimatedDataChart,
  split_comparison_window: SplitComparisonWindow,
  process_pipeline: ProcessPipeline,
  terminal_chat_window: TerminalChatWindow,
  rotary_control_deck: RotaryControlDeck,
  globe_network_flow: GlobeNetworkFlow,
  editorial_evidence_board: EditorialEvidenceBoard,
  channel_end_cta: ChannelEndCta,
};

export const UniversalMelvynxScene: React.FC<PrimitiveRenderProps> = (props) => {
  const canonical = normalizeToUniversalPrimitive(props.beat.visualType || 'metric_shock_hook');
  const Comp = PRIMITIVE_COMPONENTS[canonical] || MetricShockHook;
  return <Comp {...props} />;
};
