import React from 'react';
import { resolveRichBrollEntry } from '../../data/brollLibrary';
import { clamp, seg, spring } from '../../engine/math';
import type { LookPreset } from '../../data/shortSpec';
import { NotoSvgIcon } from './BrandAndNotoIcons';

interface BottomIllustrationStageProps {
  brollKey?: string;
  subBrollKeys?: string[];
  topicCategory?: string;
  projectTitle?: string;
  beatIndex: number;
  beatLocalT: number;
  beatSpan: number;
  brollCaption?: string;
  look: LookPreset;
  seam: number;
}

/**
 * Bright, high-contrast lower-panel editorial illustration stage (@melvynx.dev style).
 * Rotates sub-illustrations every 2.5-3.8s on longer beats so visuals never stay static > 2.5s,
 * uses 100% local Noto SVGs + semantic vector/editorial cards over bright pastel surfaces
 * with continuous 1.00 -> 1.08 Ken Burns motion and crisp 140ms cut/slide transitions.
 */
export const BottomIllustrationStage: React.FC<BottomIllustrationStageProps> = ({
  brollKey,
  subBrollKeys,
  topicCategory,
  projectTitle,
  beatIndex,
  beatLocalT,
  beatSpan,
  brollCaption,
  look,
  seam,
}) => {
  const keys = [brollKey, ...(subBrollKeys || [])].filter(
    (k): k is string => typeof k === 'string' && k.trim().length > 0
  );
  const uniqueKeys = Array.from(new Set(keys));
  const slotKeys = uniqueKeys.length > 0 ? uniqueKeys : ['ai_meetings'];

  const slotCount = slotKeys.length;
  const slotDur = beatSpan / slotCount;
  const rawSlotIdx = slotCount > 1 ? Math.floor(beatLocalT / slotDur) : 0;
  const activeSlotIdx = clamp(rawSlotIdx, 0, slotCount - 1);
  const slotLocalT = Math.max(0, beatLocalT - activeSlotIdx * slotDur);
  const slotProgress = clamp(slotLocalT / Math.max(0.5, slotDur), 0, 1);

  const activeKey = slotKeys[activeSlotIdx];
  const entry = resolveRichBrollEntry(activeKey, topicCategory, projectTitle, beatIndex + activeSlotIdx);

  // Snappy 140ms micro-entrance on every illustration switch without washed-out fading
  const enterP = activeSlotIdx === 0 && beatLocalT < 0.04 ? 1 : clamp(spring(slotLocalT, 28) * 1.2, 0.35, 1);
  const cardOpacity = clamp(0.92 + 0.08 * enterP, 0.92, 1);
  const slideX = activeSlotIdx > 0 ? (1 - enterP) * 38 : 0;
  // Continuous 1.00 -> 1.08 Ken Burns motion
  const kenBurnsScale = 1.0 + 0.08 * slotProgress;
  const floatY = Math.sin((beatLocalT + beatIndex) * 2.1) * 7;
  const orbitDeg = Math.sin((beatLocalT + activeSlotIdx) * 1.6) * 4.5;
  const pulseDot = 0.85 + 0.25 * Math.abs(Math.sin(beatLocalT * 4.2));
  const wipe = seg(slotLocalT, 0, 0.22);

  const displayCaption = brollCaption && activeSlotIdx === 0 ? brollCaption : entry.caption;
  const accentColor = entry.palette.accent;
  const bgGradient = `linear-gradient(155deg, ${entry.palette.bgTop} 0%, ${entry.palette.bgBottom} 100%)`;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: bgGradient,
      }}
      data-testid="bottom-illustration-stage"
      data-broll-id={entry.id}
    >
      {/* Warm gridded paper texture overlay (#E5E4DE-style 28px architectural lines) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-65"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(20, 22, 27, 0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 22, 27, 0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          backgroundPosition: `${(Math.sin(beatLocalT * 0.4) * 10).toFixed(1)}px ${((beatLocalT * 18) % 28).toFixed(1)}px`,
        }}
      />

      {/* Ambient bright pastel halo */}
      <div
        className="absolute w-[760px] h-[760px] rounded-full blur-[50px] pointer-events-none"
        style={{
          left: '50%',
          top: '36%',
          transform: `translate(-50%, -50%) scale(${(0.96 + 0.08 * Math.sin(beatLocalT * 1.4)).toFixed(3)})`,
          background: `radial-gradient(circle, ${accentColor}26 0%, ${accentColor}0A 48%, transparent 72%)`,
        }}
      />

      {/* Center Kinetic Editorial Card inside usable safe window (between seam and bottom 420px) */}
      <div
        className="absolute inset-x-0 top-[56px] bottom-[390px] flex items-center justify-center px-[64px]"
        style={{
          opacity: cardOpacity,
          transform: `translateX(${slideX.toFixed(1)}px) scale(${kenBurnsScale.toFixed(4)})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          className="relative w-full max-w-[820px] rounded-[24px] border px-[38px] py-[30px] flex items-center justify-between gap-[28px]"
          style={{
            backgroundColor: entry.palette.cardBg || '#FFFFFF',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 22px 54px -14px rgba(20, 22, 27, 0.14), 0 4px 14px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Left: Primary Noto SVG inside pastel rounded square */}
          <div className="flex items-center gap-[26px] min-w-0">
            <div
              className="relative w-[132px] h-[132px] rounded-[24px] flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${accentColor}16`,
                borderColor: `${accentColor}30`,
                transform: `translateY(${floatY.toFixed(1)}px) rotate(${orbitDeg.toFixed(1)}deg)`,
              }}
            >
              <NotoSvgIcon name={entry.primaryIcon} size={82} />
              {/* Secondary floating badge */}
              <div
                className="absolute -right-[14px] -bottom-[14px] w-[54px] h-[54px] rounded-[16px] bg-white border flex items-center justify-center shadow-md"
                style={{
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                  transform: `translateY(${(-floatY * 0.6).toFixed(1)}px)`,
                }}
              >
                <NotoSvgIcon name={entry.secondaryIcon} size={32} />
              </div>
            </div>

            <div className="min-w-0 space-y-[8px]">
              <div className="flex items-center gap-[10px]">
                <span
                  className="w-[11px] h-[11px] rounded-full shrink-0"
                  style={{
                    backgroundColor: accentColor,
                    transform: `scale(${pulseDot.toFixed(2)})`,
                  }}
                />
                <span
                  className="text-[22px] font-mono font-bold uppercase tracking-[0.06em]"
                  style={{ color: accentColor }}
                >
                  {entry.subCategory}
                </span>
              </div>
              <div
                className="text-[36px] font-extrabold leading-[1.12] tracking-[-0.02em] truncate"
                style={{ color: entry.palette.ink || '#14161B', fontFamily: look.fontDisplay }}
              >
                {displayCaption}
              </div>
              {/* Animated progress bar showing visual cadence */}
              <div className="w-[320px] h-[7px] rounded-full bg-black/8 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(18 + slotProgress * 82).toFixed(1)}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: Crisp contextual indicator pill */}
          {slotCount > 1 && (
            <div className="flex flex-col items-end gap-[8px] shrink-0 mr-[46px]">
              <span className="text-[19px] font-mono font-bold text-[#5C5F68] tabular-nums">
                0{activeSlotIdx + 1}/0{slotCount}
              </span>
              <div className="flex gap-[6px]">
                {slotKeys.map((k, idx) => (
                  <span
                    key={k}
                    className="h-[8px] rounded-full"
                    style={{
                      width: idx === activeSlotIdx ? '26px' : '8px',
                      backgroundColor: idx === activeSlotIdx ? accentColor : 'rgba(20,22,27,0.16)',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtle transition sheen on switch */}
      {wipe < 1 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(110deg, transparent ${((wipe * 120) - 25).toFixed(0)}%, rgba(255,255,255,0.45) ${(wipe * 120).toFixed(0)}%, transparent ${((wipe * 120) + 25).toFixed(0)}%)`,
          }}
        />
      )}

      {/* Subtle seam highlight border */}
      {seam > 20 && (
        <div
          className="absolute inset-x-0 top-0 h-[2px] pointer-events-none"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}
        />
      )}
    </div>
  );
};
