import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

export const Beat2AustraliaBypass: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 6.55 || t > 17.3) return null;

  const localT = t - 6.6;
  const enter = spring(localT, 14);
  const exit = leave(t, 17.15, 0.28);

  // Counter 0 -> 85 % synced to "85 pour cent" (12.39s)
  const pct = Math.round(85 * seg(t, 11.4, 13.0));
  // Diagonal strike on 85% at 14.07s ("contournent déjà")
  const strikeP = seg(t, 14.05, 14.65);

  // Age gate modal slides up smoothly and cursor clicks 2012 -> 2004 at 15.65s ("en 4 secondes")
  const modalP = spring(localT - 1.1, 14);
  const cursorMove = seg(t, 13.8, 15.45);
  const yearSwitched = t >= 15.65;
  const pressScale = t >= 15.6 && t <= 15.82 ? 0.95 : 1;

  return (
    <div
      className="absolute inset-x-0 top-0 h-[1120px] flex flex-col items-center justify-start pt-[225px] px-[70px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(42 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Top kicker + country tag */}
      <div className="flex items-center gap-[18px] mb-[26px]">
        <div className="w-[46px] h-[32px] rounded-[6px] overflow-hidden border border-black/15 flex items-center justify-center bg-[#012169]">
          <svg width="46" height="32" viewBox="0 0 46 32">
            <rect width="46" height="32" fill="#012169" />
            <path d="M0 0L22 15M22 0L0 15" stroke="#FFF" strokeWidth="2.5" />
            <path d="M11 0V15M0 7.5H22" stroke="#FFF" strokeWidth="4" />
            <path d="M11 0V15M0 7.5H22" stroke="#E4002B" strokeWidth="2.2" />
            <circle cx="34" cy="10" r="2.2" fill="#FFF" />
            <circle cx="38" cy="18" r="2.2" fill="#FFF" />
            <circle cx="30" cy="22" r="2.5" fill="#FFF" />
          </svg>
        </div>
        <span className="text-[38px] font-bold tracking-[-0.02em]" style={{ color: look.ink2, fontFamily: look.fontDisplay }}>
          Australie · Loi -16 ans (déc. 2025)
        </span>
      </div>

      {/* Big 85% counter card */}
      <div
        className="w-[880px] rounded-[34px] px-[52px] py-[40px] border flex items-center justify-between"
        style={{
          backgroundColor: look.sheet,
          borderColor: look.line,
          boxShadow: '0 26px 52px -16px rgba(20,22,27,0.16)',
        }}
      >
        <div>
          <div className="text-[36px] font-bold" style={{ color: look.ink2 }}>
            Ados encore actifs
          </div>
          <div className="text-[34px] font-medium mt-[4px]" style={{ color: look.ink3 }}>
            malgré le blocage légal
          </div>
        </div>
        <div className="relative flex items-baseline">
          <span
            className="text-[128px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            {pct}
          </span>
          <span
            className="text-[90px] font-extrabold leading-none ml-[8px]"
            style={{ color: look.accent, fontFamily: look.fontDisplay }}
          >
            %
          </span>
          {/* Clean animated strike over 85% */}
          {strikeP > 0 && (
            <div
              className="absolute left-[-12px] top-[56%] h-[12px] rounded-full"
              style={{
                width: `${(255 * strikeP).toFixed(1)}px`,
                backgroundColor: look.accent,
                transform: 'rotate(-8deg)',
              }}
            />
          )}
        </div>
      </div>

      {/* Recreated Age Gate UI demonstrating 4-second bypass */}
      <div
        className="relative w-[880px] mt-[34px] rounded-[34px] p-[46px] border"
        style={{
          backgroundColor: look.sheet,
          borderColor: look.line,
          opacity: clamp(modalP * 2, 0, 1),
          transform: `translateY(${(40 * (1 - modalP)).toFixed(1)}px)`,
          boxShadow: '0 30px 60px -18px rgba(20,22,27,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-[28px]">
          <span className="text-[38px] font-bold" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            Vérification d’âge
          </span>
          <span
            className="text-[34px] font-bold px-[22px] py-[8px] rounded-[14px] tabular-nums"
            style={{
              backgroundColor: yearSwitched ? look.accent : look.paper,
              color: yearSwitched ? look.onAccent : look.ink2,
            }}
          >
            {yearSwitched ? 'Accès autorisé' : 'Bloqué (-16 ans)'}
          </span>
        </div>

        <div className="flex items-center gap-[22px]">
          <div className="flex-1 rounded-[20px] px-[28px] py-[22px] border flex items-center justify-between" style={{ backgroundColor: look.paper, borderColor: look.line }}>
            <span className="text-[34px] font-medium" style={{ color: look.ink2 }}>
              Année de naissance
            </span>
            <span
              className="text-[44px] font-extrabold tabular-nums transition-none"
              style={{ color: yearSwitched ? look.accent : look.ink, fontFamily: look.fontDisplay }}
            >
              {yearSwitched ? '2004' : '2012'}
            </span>
          </div>

          <div
            className="px-[38px] py-[24px] rounded-[20px] text-[36px] font-bold"
            style={{
              backgroundColor: look.ink,
              color: '#FFFFFF',
              transform: `scale(${pressScale})`,
            }}
          >
            Valider
          </div>
        </div>

        {/* Animated macOS-style pointer */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          className="absolute pointer-events-none drop-shadow-md"
          style={{
            left: `${(240 + 275 * cursorMove).toFixed(1)}px`,
            top: `${(250 - 78 * cursorMove).toFixed(1)}px`,
            opacity: clamp(localT - 0.9, 0, 1),
          }}
        >
          <path d="M5 3l14 9l-6 1.5l3 6l-2.5 1.2l-3-6l-4.5 4z" fill="#14161B" stroke="#FFFFFF" strokeWidth="1.6" />
        </svg>
      </div>
    </div>
  );
};
