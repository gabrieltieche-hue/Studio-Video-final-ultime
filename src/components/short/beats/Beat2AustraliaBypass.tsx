import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

export const Beat2AustraliaBypass: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 6.18 || t > 16.35) return null;

  const localT = t - 6.24;
  const enter = spring(localT, 14);
  const exit = leave(t, 16.2, 0.28);

  // Counter 0 -> 85 % synced to Brian "85 pour cent" (12.13s)
  const pct = Math.round(85 * seg(t, 10.6, 12.15));
  // Diagonal strike on 85% at 13.79s ("contournent")
  const strikeP = seg(t, 13.75, 14.35);

  // Age gate modal + animated flow connector + cursor clicking 2012 -> 2004 right on "4 secondes" (15.34s)
  const modalP = spring(localT - 0.8, 14);
  const flowDash = (t * 60) % 24;
  const cursorMove = seg(t, 12.6, 15.15);
  const yearSwitched = t >= 15.34;
  const pressScale = t >= 15.28 && t <= 15.52 ? 0.94 : 1;
  const rippleP = seg(t, 15.34, 15.95);

  return (
    <div
      className="absolute inset-x-0 top-0 h-[1120px] flex flex-col items-center justify-start pt-[186px] pl-[58px] pr-[148px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(40 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Top kicker + country tag */}
      <div className="w-full flex items-center justify-between mb-[18px]">
        <div className="flex items-center gap-[16px]">
          <div className="w-[46px] h-[32px] rounded-[6px] overflow-hidden border border-black/15 flex items-center justify-center bg-[#012169] shrink-0">
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
          <span className="text-[34px] font-extrabold tracking-[-0.02em]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            Australie · Loi -16 ans
          </span>
        </div>
        <span
          className="px-[16px] py-[6px] rounded-[12px] text-[26px] font-mono font-bold tabular-nums border"
          style={{ backgroundColor: look.sheet, borderColor: look.line, color: look.ink2 }}
        >
          Fin 2025 → Aujourd’hui
        </span>
      </div>

      {/* Big 85% counter card */}
      <div
        className="w-full rounded-[32px] px-[40px] py-[32px] border flex items-center justify-between"
        style={{
          backgroundColor: look.sheet,
          borderColor: look.line,
          boxShadow: '0 24px 48px -16px rgba(20,22,27,0.16)',
        }}
      >
        <div className="min-w-0">
          <div className="text-[34px] font-extrabold leading-tight" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            Ados encore actifs
          </div>
          <div className="text-[29px] font-medium mt-[4px]" style={{ color: look.ink2 }}>
            malgré le blocage légal
          </div>
          {/* Mini progress track under subtitle */}
          <div className="w-[340px] h-[10px] rounded-full mt-[14px] overflow-hidden" style={{ backgroundColor: look.paper }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: look.accent }}
            />
          </div>
        </div>
        <div className="relative flex items-baseline shrink-0">
          <span
            className="text-[118px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            {pct}
          </span>
          <span
            className="text-[84px] font-extrabold leading-none ml-[6px]"
            style={{ color: look.accent, fontFamily: look.fontDisplay }}
          >
            %
          </span>
          {strikeP > 0 && (
            <div
              className="absolute left-[4px] top-[50%] h-[10px] rounded-full"
              style={{
                width: `${(210 * strikeP).toFixed(1)}px`,
                backgroundColor: '#DC2626',
                transform: 'rotate(-14deg)',
              }}
            />
          )}
        </div>
      </div>

      {/* Animated SVG telemetry flow connector linking 85% card to Age Gate */}
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
          <circle cx="120" cy="17" r="6" fill={yearSwitched ? '#16A34A' : look.accent} />
        </svg>
      </div>

      {/* Recreated Age Gate UI demonstrating 4-second bypass */}
      <div
        className="relative w-full rounded-[32px] p-[36px] border"
        style={{
          backgroundColor: look.sheet,
          borderColor: yearSwitched ? '#16A34A' : look.line,
          borderWidth: yearSwitched ? '2.5px' : '1.5px',
          opacity: clamp(modalP * 2, 0, 1),
          transform: `translateY(${(32 * (1 - modalP)).toFixed(1)}px)`,
          boxShadow: '0 28px 56px -18px rgba(20,22,27,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-[22px]">
          <span className="text-[34px] font-extrabold" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            Vérification d’âge
          </span>
          <span
            className="text-[28px] font-bold px-[18px] py-[6px] rounded-[12px] tabular-nums"
            style={{
              backgroundColor: yearSwitched ? '#16A34A' : look.paper,
              color: yearSwitched ? '#FFFFFF' : look.ink2,
            }}
          >
            {yearSwitched ? 'Accès autorisé ✓' : 'Bloqué (-16 ans)'}
          </span>
        </div>

        <div className="flex items-center gap-[18px]">
          <div className="flex-1 rounded-[20px] px-[24px] py-[18px] border flex items-center justify-between" style={{ backgroundColor: look.paper, borderColor: look.line }}>
            <span className="text-[30px] font-medium" style={{ color: look.ink2 }}>
              Naissance
            </span>
            <span
              className="text-[42px] font-extrabold tabular-nums"
              style={{ color: yearSwitched ? '#16A34A' : look.ink, fontFamily: look.fontDisplay }}
            >
              {yearSwitched ? '2004' : '2012'}
            </span>
          </div>

          <div
            className="relative px-[34px] py-[20px] rounded-[20px] text-[34px] font-bold shrink-0"
            style={{
              backgroundColor: yearSwitched ? '#16A34A' : look.ink,
              color: '#FFFFFF',
              transform: `scale(${pressScale})`,
            }}
          >
            Valider
            {yearSwitched && rippleP < 1 && (
              <span
                className="absolute inset-0 rounded-[20px] border-4"
                style={{
                  borderColor: look.accent,
                  opacity: 1 - rippleP,
                  transform: `scale(${(1 + 0.35 * rippleP).toFixed(3)})`,
                }}
              />
            )}
          </div>
        </div>

        {/* Animated macOS pointer */}
        <svg
          width="46"
          height="46"
          viewBox="0 0 24 24"
          className="absolute pointer-events-none drop-shadow-md"
          style={{
            left: `${(210 + 295 * cursorMove).toFixed(1)}px`,
            top: `${(210 - 65 * cursorMove).toFixed(1)}px`,
            opacity: clamp(localT - 0.6, 0, 1),
          }}
        >
          <path d="M5 3l14 9l-6 1.5l3 6l-2.5 1.2l-3-6l-4.5 4z" fill="#14161B" stroke="#FFFFFF" strokeWidth="1.6" />
        </svg>
      </div>

      {/* Bottom KPI strip filling paper cleanly above seam */}
      <div
        className="w-full mt-[20px] rounded-[22px] px-[28px] py-[16px] border flex items-center justify-between"
        style={{ backgroundColor: look.sheet, borderColor: look.line }}
      >
        <span className="text-[28px] font-bold" style={{ color: look.ink2 }}>
          Contournement moyen (VPN / Fausse date)
        </span>
        <span className="text-[32px] font-mono font-extrabold tabular-nums" style={{ color: look.accent }}>
          {yearSwitched ? '00:04.0 s ✓' : '00:04.0 s'}
        </span>
      </div>
    </div>
  );
};
