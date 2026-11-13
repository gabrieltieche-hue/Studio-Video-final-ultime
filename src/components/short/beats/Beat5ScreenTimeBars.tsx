import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

export const Beat5ScreenTimeBars: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 33.4 || t > 42.95) return null;

  const localT = t - 33.45;
  const enter = spring(localT, 14);
  const exit = leave(t, 42.8, 0.28);

  const bar1P = spring(t - 35.4, 13);
  const bar2P = spring(t - 39.2, 12);
  const ghostP = spring(t - 40.95, 14);

  // Live stopwatch clock counting 0h45 -> 3h42 synced to "3 heures 42" (39.57s)
  const minutesTotal = Math.round(45 + 177 * seg(t, 38.5, 40.6));
  const hrs = Math.floor(minutesTotal / 60);
  const mins = minutesTotal % 60;
  const clockStr = `${hrs}h${String(mins).padStart(2, '0')}`;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start pt-[260px] pl-[60px] pr-[150px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(42 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      <div className="w-full flex items-end justify-between mb-[40px]">
        <div>
          <div className="text-[36px] font-bold" style={{ color: look.ink2 }}>
            Temps moyen / jour (11–17 ans)
          </div>
          <div
            className="text-[78px] font-extrabold leading-none tracking-[-0.04em] mt-[10px]"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            L’effet <span style={{ color: look.accent }}>algorithme</span>
          </div>
        </div>

        {/* Live tabular clock card */}
        <div
          className="px-[34px] py-[20px] rounded-[24px] border text-right"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 20px 40px -14px rgba(20,22,27,0.14)',
          }}
        >
          <div className="text-[30px] font-semibold" style={{ color: look.ink3 }}>
            Temps / jour
          </div>
          <div
            className="text-[64px] font-extrabold leading-none tracking-[-0.03em] tabular-nums"
            style={{ color: look.accent, fontFamily: look.fontDisplay }}
          >
            {clockStr}
          </div>
        </div>
      </div>

      {/* Horizontal comparison bars sheet */}
      <div
        className="w-full rounded-[36px] p-[46px] border space-y-[50px]"
        style={{
          backgroundColor: look.sheet,
          borderColor: look.line,
          boxShadow: '0 32px 64px -18px rgba(20,22,27,0.18)',
        }}
      >
        {/* Row 1: 2015 chronological */}
        <div>
          <div className="flex items-center justify-between mb-[18px]">
            <span className="text-[40px] font-bold" style={{ color: look.ink2, fontFamily: look.fontDisplay }}>
              2015 · Flux chronologique
            </span>
            <span className="text-[42px] font-extrabold tabular-nums" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              45 min/j
            </span>
          </div>
          <div className="relative h-[86px] rounded-[22px] overflow-hidden" style={{ backgroundColor: look.paper }}>
            <div
              className="h-full rounded-[22px]"
              style={{
                width: `${(20 * bar1P).toFixed(1)}%`,
                backgroundColor: look.ink3,
              }}
            />
          </div>
        </div>

        {/* Row 2: 2026 infinite algo + ghost bracket */}
        <div className="relative">
          <div className="flex items-center justify-between mb-[18px]">
            <span className="text-[40px] font-bold" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              2026 · Algo infini
            </span>
            <span className="text-[48px] font-extrabold tabular-nums" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
              3h 42 / j
            </span>
          </div>
          <div className="relative h-[86px] rounded-[22px] overflow-hidden" style={{ backgroundColor: look.paper }}>
            {/* Reference ghost slice of 2015 inside 2026 bar */}
            <div
              className="absolute left-0 top-0 bottom-0 border-r-[4px] border-dashed z-10"
              style={{
                width: '20%',
                borderColor: 'rgba(255,255,255,0.65)',
              }}
            />
            <div
              className="h-full rounded-[22px]"
              style={{
                width: `${(96 * bar2P).toFixed(1)}%`,
                backgroundColor: look.accent,
              }}
            />
          </div>

          {/* ×4.9 delta bracket below bar synced to "Presque cinq fois plus" (40.98s) */}
          {t >= 40.95 && (
            <div
              className="mt-[26px] flex items-center justify-between px-[8px]"
              style={{
                opacity: clamp(ghostP * 2, 0, 1),
                transform: `translateY(${(16 * (1 - ghostP)).toFixed(1)}px)`,
              }}
            >
              <div className="flex items-center gap-[16px]">
                <div className="h-[4px] w-[140px] rounded-full" style={{ backgroundColor: look.accent }} />
                <span className="text-[36px] font-bold" style={{ color: look.ink2 }}>
                  Multiplié par
                </span>
              </div>
              <div
                className="px-[30px] py-[12px] rounded-[18px] text-[44px] font-extrabold tabular-nums"
                style={{
                  backgroundColor: look.accent,
                  color: look.onAccent,
                  fontFamily: look.fontDisplay,
                }}
              >
                ×4,9
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
