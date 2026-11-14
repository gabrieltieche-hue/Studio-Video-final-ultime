import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

export const Beat7BypassLock: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 45.8 || t > 52.65) return null;

  const localT = t - 45.85;
  const enter = spring(localT, 14);
  const exit = leave(t, 52.5, 0.28);

  // Sync strike to "en dix secondes." (47.96s), Card 2 entrance to "design sobre" (49.93s)
  const strikeP = seg(t, 47.95, 48.65);
  const card2P = spring(t - 49.85, 16);
  const flowDash = (t * 58) % 22;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start pt-[210px] pl-[58px] pr-[148px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(32 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Top verdict header pill */}
      <div
        className="w-full rounded-[22px] px-[28px] py-[14px] mb-[24px] border backdrop-blur-md flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(20, 22, 27, 0.68)',
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      >
        <span className="text-[28px] font-bold text-white/90 tracking-[-0.01em]" style={{ fontFamily: look.fontDisplay }}>
          VERDICT TECHNIQUE
        </span>
        <span className="text-[26px] font-mono font-bold text-[#5EA8FF]">
          {t >= 49.85 ? 'SOLUTION : SOURCE' : 'FAILLE : 10 S'}
        </span>
      </div>

      {/* Glass card 1: Age check bypass */}
      <div
        className="w-full rounded-[32px] px-[38px] py-[34px] border backdrop-blur-xl flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(20, 22, 27, 0.78)',
          borderColor: 'rgba(255, 255, 255, 0.18)',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.45)',
        }}
      >
        <div className="relative min-w-0">
          <div className="text-[31px] font-medium text-white/65">Approche 1 · Case d’âge</div>
          <div className="relative inline-block text-[44px] font-extrabold text-white mt-[4px]" style={{ fontFamily: look.fontDisplay }}>
            Contourné en 10 s
            {strikeP > 0 && (
              <span
                className="absolute left-[-6px] top-[52%] h-[8px] rounded-full"
                style={{
                  width: `${(106 * strikeP).toFixed(1)}%`,
                  backgroundColor: '#EF4444',
                  transform: 'rotate(-2deg)',
                }}
              />
            )}
          </div>
        </div>
        <div className="px-[22px] py-[10px] rounded-[14px] bg-red-500/25 text-red-300 text-[31px] font-bold shrink-0">
          Inefficace
        </div>
      </div>

      {/* Animated connector down into Card 2 */}
      <div className="h-[44px] w-full flex items-center justify-center">
        <svg width="200" height="44" viewBox="0 0 200 44">
          <line
            x1="100"
            y1="2"
            x2="100"
            y2="42"
            stroke="#5EA8FF"
            strokeWidth="4"
            strokeDasharray="6 6"
            strokeDashoffset={-flowDash}
          />
          <circle cx="100" cy="22" r="7" fill={t >= 49.85 ? '#4ADE80' : '#5EA8FF'} />
        </svg>
      </div>

      {/* Glass card 2: Source design lock */}
      <div
        className="w-full rounded-[32px] px-[38px] py-[36px] border backdrop-blur-xl flex items-center justify-between"
        style={{
          backgroundColor: t >= 49.85 ? 'rgba(252, 251, 248, 0.96)' : 'rgba(252, 251, 248, 0.25)',
          borderColor: t >= 49.85 ? look.accent : 'rgba(255,255,255,0.2)',
          borderWidth: '3px',
          opacity: t >= 49.85 ? clamp(card2P * 2, 0, 1) : 0.45,
          transform: `translateY(${t >= 49.85 ? (24 * (1 - card2P)).toFixed(1) : '18'}px) scale(${t >= 49.85 ? (0.96 + 0.04 * card2P).toFixed(3) : '0.96'})`,
          boxShadow: '0 30px 60px -14px rgba(0,0,0,0.5)',
        }}
      >
        <div className="min-w-0">
          <div className="text-[31px] font-bold" style={{ color: t >= 49.85 ? look.accent : '#FFFFFF' }}>
            Approche 2 · Régulation produit
          </div>
          <div className="text-[46px] font-extrabold mt-[4px]" style={{ color: t >= 49.85 ? '#14161B' : '#FFFFFF', fontFamily: look.fontDisplay }}>
            Design sobre à la source
          </div>
        </div>

        <div
          className="w-[80px] h-[80px] rounded-[22px] flex items-center justify-center shrink-0"
          style={{
            backgroundColor: t >= 49.85 ? look.accent : 'rgba(255,255,255,0.2)',
            color: look.onAccent,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>
    </div>
  );
};
