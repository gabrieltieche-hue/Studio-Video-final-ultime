import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

const TRIGGERS = [
  { label: 'Scroll sans fin', detail: 'Aucune limite', tag: 'DOPAMINE' },
  { label: 'Lecture auto', detail: 'Enchaînement 0 s', tag: 'RÉTENTION' },
  { label: 'Push nocturne', detail: 'Alerte 22h–07h', tag: 'RAPPEL' },
];

export const Beat4AlgoGauge: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 23.32 || t > 28.12) return null;

  const localT = t - 23.38;
  const enter = spring(localT, 14);
  const exit = leave(t, 27.98, 0.28);

  // Full paper (seam = 1920): Gauge sweeps 0 -> 0.92 across 23.7s - 27.2s
  const gaugeP = seg(t, 23.7, 27.2);
  const gaugeVal = 0.92 * (1 - Math.pow(1 - gaugeP, 2.2));
  const needleAngle = -135 + gaugeVal * 270;

  // Infinite feed cards scrolling upwards continuously
  const scrollOffset = ((t - 23.38) * 195) % 210;

  // Strike on L'ÂGE at 24.86s ("l'âge."), reveal LE DESIGN at 25.55s ("C'est le design")
  const strikeP = seg(t, 24.82, 25.4);
  const designP = spring(t - 25.5, 16);
  const rowP = spring(t - 25.85, 15);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start pt-[194px] pl-[58px] pr-[148px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(42 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Headline reversal */}
      <div className="w-full text-center mb-[28px]">
        <div className="text-[40px] font-bold tracking-[-0.02em]" style={{ color: look.ink2 }}>
          Le vrai problème n’est pas{' '}
          <span className="relative inline-block mx-[6px]" style={{ color: look.ink }}>
            l’âge
            {strikeP > 0 && (
              <span
                className="absolute left-[-6px] top-[52%] h-[9px] rounded-full"
                style={{
                  width: `${(118 * strikeP).toFixed(1)}%`,
                  backgroundColor: '#DC2626',
                  transform: 'rotate(-5deg)',
                }}
              />
            )}
          </span>
        </div>
        <div
          className="text-[96px] font-extrabold leading-[1.02] tracking-[-0.04em] mt-[10px]"
          style={{
            color: look.ink,
            fontFamily: look.fontDisplay,
            opacity: clamp(0.28 + 0.72 * designP, 0, 1),
            transform: `translateY(${(22 * (1 - designP)).toFixed(1)}px)`,
          }}
        >
          C’est le <span style={{ color: look.accent }}>design.</span>
        </div>
      </div>

      {/* Dual UI row: Recreated Infinite Feed + Dopamine Speedometer Gauge */}
      <div className="w-full grid grid-cols-2 gap-[24px] items-stretch">
        {/* Left: Recreated Infinite Scroll Feed UI */}
        <div
          className="rounded-[32px] p-[28px] border flex flex-col"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 26px 52px -18px rgba(20,22,27,0.16)',
          }}
        >
          <div className="flex items-center justify-between mb-[16px]">
            <span className="text-[31px] font-bold" style={{ color: look.ink }}>
              Feed Infini
            </span>
            <span className="text-[28px] font-mono font-bold tabular-nums" style={{ color: look.accent }}>
              AUTO ON
            </span>
          </div>

          <div className="relative h-[475px] rounded-[22px] overflow-hidden border" style={{ backgroundColor: '#14161B', borderColor: look.line }}>
            <div style={{ transform: `translateY(${-scrollOffset.toFixed(1)}px)` }}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="mx-[18px] my-[16px] h-[176px] rounded-[18px] p-[20px] flex flex-col justify-between border border-white/10"
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#1E222B' : '#232834',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[10px]">
                      <div className="w-[30px] h-[30px] rounded-full bg-[#258EFF]" />
                      <div className="w-[125px] h-[14px] rounded-full bg-white/30" />
                    </div>
                    <div className="w-[46px] h-[14px] rounded-full bg-white/20" />
                  </div>
                  <div className="space-y-[10px]">
                    <div className="w-[85%] h-[18px] rounded-full bg-white/75" />
                    <div className="w-[62%] h-[14px] rounded-full bg-white/35" />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[96px] bg-gradient-to-t from-[#14161B] to-transparent" />
            <div className="absolute bottom-[18px] inset-x-[14px] text-[26px] font-semibold text-white/95 text-center whitespace-nowrap">
              Boucle sans fin
            </div>
          </div>
        </div>

        {/* Right: Speedometer Gauge */}
        <div
          className="rounded-[32px] p-[28px] border flex flex-col items-center justify-between"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 26px 52px -18px rgba(20,22,27,0.16)',
          }}
        >
          <div className="w-full flex items-center justify-between">
            <span className="text-[31px] font-bold" style={{ color: look.ink }}>
              Capture d’attention
            </span>
          </div>

          <div className="relative w-[330px] h-[330px] flex items-center justify-center">
            <svg width="330" height="330" viewBox="0 0 360 360">
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
            <div className="absolute bottom-[24px] text-center">
              <div
                className="text-[72px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
                style={{ color: look.ink, fontFamily: look.fontDisplay }}
              >
                {Math.round(gaugeVal * 100)}
                <span style={{ color: look.accent }}>%</span>
              </div>
            </div>
          </div>

          <div className="text-[30px] font-semibold text-center" style={{ color: look.ink2 }}>
            Rétention maximale
          </div>
        </div>
      </div>

      {/* Kinetic 3-pillar trigger strip filling lower full-paper area safely above y=1295 captions */}
      <div
        className="w-full grid grid-cols-3 gap-[18px] mt-[24px]"
        style={{
          opacity: clamp(0.35 + rowP * 0.65, 0, 1),
          transform: `translateY(${(20 * (1 - rowP)).toFixed(1)}px)`,
        }}
      >
        {TRIGGERS.map((tr, i) => (
          <div
            key={tr.label}
            className="rounded-[24px] px-[22px] py-[20px] border flex flex-col justify-between"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.line,
              boxShadow: '0 18px 36px -14px rgba(20,22,27,0.12)',
            }}
          >
            <div className="flex items-center justify-between mb-[6px]">
              <span className="text-[22px] font-mono font-bold" style={{ color: look.accent }}>
                {tr.tag}
              </span>
              <span
                className="w-[12px] h-[12px] rounded-full"
                style={{
                  backgroundColor: look.accent,
                  opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * 5 + i)),
                }}
              />
            </div>
            <div className="text-[29px] font-extrabold leading-tight" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              {tr.label}
            </div>
            <div className="text-[25px] font-medium mt-[2px]" style={{ color: look.ink2 }}>
              {tr.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Lower insight strip filling full-paper canvas down to ~1320px right above captions */}
      <div
        className="w-full mt-[22px] rounded-[24px] px-[28px] py-[22px] flex items-center justify-between"
        style={{
          backgroundColor: look.ink,
          color: '#FFFFFF',
          opacity: clamp(0.4 + rowP * 0.6, 0, 1),
          boxShadow: '0 18px 38px -14px rgba(20,22,27,0.22)',
        }}
      >
        <div className="flex items-center gap-[14px]">
          <span className="w-[14px] h-[14px] rounded-full shrink-0" style={{ backgroundColor: look.accent }} />
          <span className="text-[28px] font-bold tracking-[-0.01em]">
            Boucles dopaminergiques conçues pour maximiser le temps passé
          </span>
        </div>
        <span className="text-[26px] font-mono font-bold text-[#60A5FA] shrink-0">
          24/7
        </span>
      </div>
    </div>
  );
};
