import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

export const Beat4AlgoGauge: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 27.25 || t > 33.6) return null;

  const localT = t - 27.3;
  const enter = spring(localT, 14);
  const exit = leave(t, 33.45, 0.28);

  // Full paper (seam = 1920): Gauge sweeps 0 -> 0.92 across 27.7s - 32.3s
  const gaugeP = seg(t, 27.7, 32.3);
  const gaugeVal = 0.92 * (1 - Math.pow(1 - gaugeP, 2.2));
  const needleAngle = -135 + gaugeVal * 270;

  // Infinite feed cards scrolling upwards continuously
  const scrollOffset = ((t - 27.3) * 165) % 210;

  // Strike on L'ÂGE at 28.53s, reveal LE DESIGN at 30.48s
  const strikeP = seg(t, 28.53, 29.15);
  const designP = spring(t - 30.45, 16);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start pt-[250px] pl-[58px] pr-[152px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(45 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Headline reversal */}
      <div className="w-full text-center mb-[36px]">
        <div className="text-[42px] font-bold tracking-[-0.02em]" style={{ color: look.ink2 }}>
          Le vrai problème n’est pas{' '}
          <span className="relative inline-block mx-[6px]" style={{ color: look.ink }}>
            l’âge
            {strikeP > 0 && (
              <span
                className="absolute left-[-6px] top-[52%] h-[9px] rounded-full"
                style={{
                  width: `${(118 * strikeP).toFixed(1)}%`,
                  backgroundColor: look.accent,
                  transform: 'rotate(-5deg)',
                }}
              />
            )}
          </span>
        </div>
        <div
          className="text-[102px] font-extrabold leading-[1.02] tracking-[-0.04em] mt-[14px]"
          style={{
            color: look.ink,
            fontFamily: look.fontDisplay,
            opacity: clamp(0.25 + 0.75 * designP, 0, 1),
            transform: `translateY(${(24 * (1 - designP)).toFixed(1)}px)`,
          }}
        >
          C’est le <span style={{ color: look.accent }}>design.</span>
        </div>
      </div>

      {/* Dual UI row: Recreated Infinite Feed + Dopamine Speedometer Gauge */}
      <div className="w-full grid grid-cols-2 gap-[28px] items-stretch">
        {/* Left: Recreated Infinite Scroll Feed UI */}
        <div
          className="rounded-[34px] p-[32px] border flex flex-col"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 28px 56px -18px rgba(20,22,27,0.16)',
          }}
        >
          <div className="flex items-center justify-between mb-[20px]">
            <span className="text-[34px] font-bold" style={{ color: look.ink }}>
              Feed Infini
            </span>
            <span className="text-[34px] font-bold tabular-nums" style={{ color: look.accent }}>
              Autoplay ON
            </span>
          </div>

          <div className="relative h-[540px] rounded-[24px] overflow-hidden border" style={{ backgroundColor: '#14161B', borderColor: look.line }}>
            <div style={{ transform: `translateY(${-scrollOffset.toFixed(1)}px)` }}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="mx-[20px] my-[18px] h-[192px] rounded-[20px] p-[24px] flex flex-col justify-between border border-white/10"
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#1E222B' : '#232834',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[34px] h-[34px] rounded-full bg-[#258EFF]" />
                      <div className="w-[140px] h-[16px] rounded-full bg-white/30" />
                    </div>
                    <div className="w-[54px] h-[16px] rounded-full bg-white/20" />
                  </div>
                  <div className="space-y-[12px]">
                    <div className="w-[85%] h-[20px] rounded-full bg-white/75" />
                    <div className="w-[62%] h-[16px] rounded-full bg-white/35" />
                  </div>
                </div>
              ))}
            </div>
            {/* Bottom gradient scrim */}
            <div className="absolute inset-x-0 bottom-0 h-[110px] bg-gradient-to-t from-[#14161B] to-transparent" />
            <div className="absolute bottom-[22px] inset-x-[16px] text-[28px] font-semibold text-white/95 text-center whitespace-nowrap">
              Boucle infinie
            </div>
          </div>
        </div>

        {/* Right: Speedometer Gauge (270° groove, 21 ticks) */}
        <div
          className="rounded-[34px] p-[36px] border flex flex-col items-center justify-between"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 28px 56px -18px rgba(20,22,27,0.16)',
          }}
        >
          <div className="w-full flex items-center justify-between">
            <span className="text-[34px] font-bold" style={{ color: look.ink }}>
              Capture d’attention
            </span>
          </div>

          <div className="relative w-[360px] h-[360px] flex items-center justify-center">
            <svg width="360" height="360" viewBox="0 0 360 360">
              {/* Background 270 deg track */}
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
              {/* Active accent arc */}
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
              {/* 21 precision ticks */}
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
              {/* Needle */}
              <g transform={`rotate(${needleAngle.toFixed(1)} 180 180)`}>
                <line x1="180" y1="194" x2="180" y2="70" stroke={look.ink} strokeWidth="9" strokeLinecap="round" />
                <circle cx="180" cy="180" r="16" fill={look.ink} />
              </g>
            </svg>
            <div className="absolute bottom-[28px] text-center">
              <div
                className="text-[76px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
                style={{ color: look.ink, fontFamily: look.fontDisplay }}
              >
                {Math.round(gaugeVal * 100)}
                <span style={{ color: look.accent }}>%</span>
              </div>
            </div>
          </div>

          <div className="text-[34px] font-semibold text-center" style={{ color: look.ink2 }}>
            Rétention algorithmique max
          </div>
        </div>
      </div>
    </div>
  );
};
