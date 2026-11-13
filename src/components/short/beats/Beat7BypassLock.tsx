import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

export const Beat7BypassLock: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 52.5 || t > 59.5) return null;

  const localT = t - 52.55;
  const enter = spring(localT, 14);
  const exit = leave(t, 59.35, 0.28);

  const strikeP = seg(t, 54.3, 55.05);
  const card2P = spring(t - 56.05, 15);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start pt-[260px] pl-[60px] pr-[150px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(32 * (1 - enter) - 30 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Glass card 1: Age check bypass */}
      <div
        className="w-full rounded-[32px] px-[40px] py-[34px] border backdrop-blur-xl flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(20, 22, 27, 0.72)',
          borderColor: 'rgba(255, 255, 255, 0.16)',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.45)',
        }}
      >
        <div className="relative">
          <div className="text-[34px] font-medium text-white/65">Approche 1 · Contrôle d’âge</div>
          <div className="relative inline-block text-[46px] font-extrabold text-white mt-[4px]" style={{ fontFamily: look.fontDisplay }}>
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
        <div className="px-[24px] py-[10px] rounded-[14px] bg-red-500/20 text-red-300 text-[34px] font-bold">
          Inefficace
        </div>
      </div>

      {/* Glass card 2: Source design lock */}
      {t >= 55.95 && (
        <div
          className="w-full mt-[32px] rounded-[32px] px-[40px] py-[36px] border backdrop-blur-xl flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(252, 251, 248, 0.94)',
            borderColor: look.accent,
            borderWidth: '3px',
            opacity: clamp(card2P * 2, 0, 1),
            transform: `translateY(${(36 * (1 - card2P)).toFixed(1)}px)`,
            boxShadow: '0 30px 60px -14px rgba(0,0,0,0.5)',
          }}
        >
          <div>
            <div className="text-[34px] font-bold" style={{ color: look.accent }}>
              Approche 2 · Régulation produit
            </div>
            <div className="text-[48px] font-extrabold mt-[4px]" style={{ color: '#14161B', fontFamily: look.fontDisplay }}>
              Design sobre à la source
            </div>
          </div>

          <div
            className="w-[82px] h-[82px] rounded-[22px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: look.accent, color: look.onAccent }}
          >
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
