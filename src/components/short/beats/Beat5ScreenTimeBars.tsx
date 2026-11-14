import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

export const Beat5ScreenTimeBars: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 27.92 || t > 37.65) return null;

  const localT = t - 27.98;
  const enter = spring(localT, 14);
  const exit = leave(t, 37.5, 0.28);

  // Sync bars to "45 minutes" (31.24s) and "3 heures 42" (33.94s -> 35.34s) and "cinq fois plus" (35.94s)
  const bar1P = spring(t - 30.8, 13);
  const bar2P = spring(t - 33.75, 12);
  const ghostP = spring(t - 35.9, 15);
  const impactP = seg(t, 34.63, 35.25);

  const minutesTotal = Math.round(45 + 177 * seg(t, 33.2, 34.85));
  const hrs = Math.floor(minutesTotal / 60);
  const mins = minutesTotal % 60;
  const clockStr = `${hrs}h${String(mins).padStart(2, '0')}`;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start pt-[194px] pl-[58px] pr-[148px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(40 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Header + Live Clock */}
      <div className="w-full flex items-end justify-between mb-[28px]">
        <div>
          <div className="text-[32px] font-bold" style={{ color: look.ink2 }}>
            Temps d’écran · 11–17 ans
          </div>
          <div
            className="text-[74px] font-extrabold leading-none tracking-[-0.04em] mt-[8px]"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            L’effet <span style={{ color: look.accent }}>algorithme</span>
          </div>
        </div>

        <div
          className="px-[30px] py-[16px] rounded-[24px] border text-right"
          style={{
            backgroundColor: look.sheet,
            borderColor: t >= 34.63 ? look.accent : look.line,
            borderWidth: t >= 34.63 ? '2.5px' : '1.5px',
            boxShadow: '0 20px 40px -14px rgba(20,22,27,0.14)',
          }}
        >
          <div className="text-[26px] font-semibold" style={{ color: look.ink3 }}>
            Temps / jour
          </div>
          <div
            className="text-[62px] font-extrabold leading-none tracking-[-0.03em] tabular-nums"
            style={{ color: look.accent, fontFamily: look.fontDisplay }}
          >
            {clockStr}
          </div>
        </div>
      </div>

      {/* Horizontal comparison bars sheet with grid rulers */}
      <div
        className="w-full rounded-[34px] p-[40px] border space-y-[38px]"
        style={{
          backgroundColor: look.sheet,
          borderColor: look.line,
          boxShadow: '0 30px 60px -18px rgba(20,22,27,0.18)',
        }}
      >
        {/* Row 1: 2015 chronological */}
        <div>
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[36px] font-bold" style={{ color: look.ink2, fontFamily: look.fontDisplay }}>
              2015 · Flux chronologique
            </span>
            <span className="text-[38px] font-extrabold tabular-nums" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              45 min/j
            </span>
          </div>
          <div className="relative h-[78px] rounded-[20px] overflow-hidden" style={{ backgroundColor: look.paper }}>
            <div
              className="h-full rounded-[20px]"
              style={{
                width: `${(20 * bar1P).toFixed(1)}%`,
                backgroundColor: look.ink3,
              }}
            />
          </div>
        </div>

        {/* Row 2: 2026 infinite algo */}
        <div className="relative">
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[36px] font-bold" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              2026 · Algorithme infini
            </span>
            <span className="text-[44px] font-extrabold tabular-nums" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
              3h42 / j
            </span>
          </div>
          <div className="relative h-[78px] rounded-[20px] overflow-hidden" style={{ backgroundColor: look.paper }}>
            <div
              className="absolute left-0 top-0 bottom-0 border-r-[4px] border-dashed z-10"
              style={{
                width: '20%',
                borderColor: 'rgba(255,255,255,0.65)',
              }}
            />
            <div
              className="h-full rounded-[20px]"
              style={{
                width: `${(96 * bar2P).toFixed(1)}%`,
                backgroundColor: look.accent,
              }}
            />
            {t >= 34.63 && impactP < 1 && (
              <div
                className="absolute inset-0 rounded-[20px] border-4"
                style={{
                  borderColor: look.ink,
                  opacity: (1 - impactP) * 0.45,
                }}
              />
            )}
          </div>

          {/* Hourly ruler ticks */}
          <div className="flex justify-between mt-[10px] px-[6px] text-[22px] font-mono font-semibold" style={{ color: look.ink3 }}>
            <span>0h</span>
            <span>1h</span>
            <span>2h</span>
            <span>3h</span>
            <span>4h</span>
          </div>

          {/* ×4.9 bracket synced to "Presque cinq fois plus" (35.94s) */}
          {t >= 35.9 && (
            <div
              className="mt-[22px] flex items-center justify-between px-[6px]"
              style={{
                opacity: clamp(ghostP * 2, 0, 1),
                transform: `translateY(${(14 * (1 - ghostP)).toFixed(1)}px)`,
              }}
            >
              <div className="flex items-center gap-[16px]">
                <div className="h-[5px] w-[140px] rounded-full" style={{ backgroundColor: look.accent }} />
                <span className="text-[34px] font-bold" style={{ color: look.ink2 }}>
                  Multiplié par
                </span>
              </div>
              <div
                className="px-[28px] py-[10px] rounded-[18px] text-[42px] font-extrabold tabular-nums"
                style={{
                  backgroundColor: look.accent,
                  color: look.onAccent,
                  fontFamily: look.fontDisplay,
                  transform: `scale(${(0.9 + 0.1 * ghostP).toFixed(3)})`,
                }}
              >
                ×4,9
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Attention Cost Breakdown (safely above y=1295 captions!) */}
      <div
        className="w-full grid grid-cols-3 gap-[18px] mt-[24px]"
        style={{
          opacity: clamp(seg(t, 30.0, 32.0), 0.35, 1),
        }}
      >
        <div
          className="rounded-[24px] px-[22px] py-[20px] border"
          style={{ backgroundColor: look.sheet, borderColor: look.line }}
        >
          <div className="text-[22px] font-mono font-bold" style={{ color: look.ink3 }}>ÉCART / JOUR</div>
          <div className="text-[40px] font-extrabold tabular-nums mt-[4px]" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
            +2h57
          </div>
        </div>
        <div
          className="rounded-[24px] px-[22px] py-[20px] border"
          style={{ backgroundColor: look.sheet, borderColor: look.line }}
        >
          <div className="text-[22px] font-mono font-bold" style={{ color: look.ink3 }}>SUR 1 AN</div>
          <div className="text-[40px] font-extrabold tabular-nums mt-[4px]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            +1 076 h
          </div>
        </div>
        <div
          className="rounded-[24px] px-[22px] py-[20px] border"
          style={{ backgroundColor: look.sheet, borderColor: look.line }}
        >
          <div className="text-[22px] font-mono font-bold" style={{ color: look.ink3 }}>ÉQUIVALENT</div>
          <div className="text-[40px] font-extrabold tabular-nums mt-[4px]" style={{ color: '#DC2626', fontFamily: look.fontDisplay }}>
            45 j / an
          </div>
        </div>
      </div>

      {/* Lower comparative summary strip filling full-paper area safely above captions */}
      <div
        className="w-full mt-[22px] rounded-[24px] px-[28px] py-[22px] flex items-center justify-between"
        style={{
          backgroundColor: look.ink,
          color: '#FFFFFF',
          opacity: clamp(seg(t, 31.0, 33.0), 0.4, 1),
          boxShadow: '0 18px 38px -14px rgba(20,22,27,0.22)',
        }}
      >
        <div className="flex items-center gap-[14px]">
          <span className="w-[14px] h-[14px] rounded-full shrink-0 bg-[#DC2626]" />
          <span className="text-[28px] font-bold tracking-[-0.01em]">
            Près de 7 semaines complètes passées par an sur les feeds
          </span>
        </div>
        <span className="text-[26px] font-mono font-bold text-[#60A5FA] shrink-0">
          +388 %
        </span>
      </div>
    </div>
  );
};
