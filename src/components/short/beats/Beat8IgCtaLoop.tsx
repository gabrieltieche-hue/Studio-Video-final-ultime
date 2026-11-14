import React from 'react';
import { CREATOR_PROFILE, LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

const SPARKS = [
  { angle: -140, dist: 150, color: '#258EFF' },
  { angle: -95, dist: 165, color: '#4ADE80' },
  { angle: -40, dist: 155, color: '#FACC15' },
  { angle: 15, dist: 160, color: '#258EFF' },
  { angle: 55, dist: 145, color: '#FFFFFF' },
  { angle: 145, dist: 150, color: '#258EFF' },
];

/**
 * Beat 8 (52.50s - 57.00s): Creator Subscribe + Notification Bell Animation
 * Timed cleanly to Brian: "Abonne-toi" (52.72s) -> click (53.20s) -> bell (53.50s) -> "décryptages tech." (54.75s)
 */
export const Beat8IgCtaLoop: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 52.45 || t > 57.15) return null;

  const localT = t - 52.5;
  const cardP = spring(localT, 15);
  const exit = leave(t, 57.0, 0.28);

  const cursorP = seg(t, 52.58, 53.15);
  const clicked = t >= 53.2;
  const pressScale = t >= 53.16 && t <= 53.35 ? 0.92 : 1;
  const subP = clicked ? spring(t - 53.2, 22) : 0;
  const burstP = seg(t, 53.2, 54.0);

  const bellActivated = t >= 53.5;
  const bellRingP = seg(t, 53.5, 54.35);
  const bellTilt =
    t >= 53.5 && t <= 54.5
      ? Math.sin((t - 53.5) * 38) * (1 - seg(t, 53.5, 54.5)) * 18
      : 0;

  const toastP = spring(t - 54.15, 16);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start pt-[235px] pl-[58px] pr-[148px] pointer-events-none"
      style={{ opacity: exit }}
    >
      {/* Top retention CTA kicker */}
      <div
        className="w-full rounded-[22px] px-[26px] py-[14px] mb-[24px] border backdrop-blur-md flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(20, 22, 27, 0.72)',
          borderColor: 'rgba(255,255,255,0.2)',
          opacity: clamp(cardP * 2, 0, 1),
        }}
      >
        <span className="text-[28px] font-bold text-white" style={{ fontFamily: look.fontDisplay }}>
          {CREATOR_PROFILE.ctaHeader}
        </span>
        <span className="text-[26px] font-mono font-bold text-[#4ADE80]">
          {bellActivated ? 'NOTIFS ON ✓' : 'SÉRIE TECH & IA'}
        </span>
      </div>

      {/* Main Creator Subscribe Card */}
      <div
        className="relative w-full rounded-[36px] p-[42px] border backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(252, 251, 248, 0.96)',
          borderColor: clicked ? look.accent : 'rgba(20, 22, 27, 0.14)',
          borderWidth: clicked ? '3px' : '1.5px',
          opacity: clamp(cardP * 1.8, 0, 1),
          transform: `translateY(${(44 * (1 - cardP)).toFixed(1)}px) scale(${(0.95 + 0.05 * cardP).toFixed(3)})`,
          boxShadow: '0 36px 72px -18px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Radial particle sparks on Subscribe click */}
        {clicked && burstP < 1 && (
          <div className="absolute left-[38%] bottom-[90px] pointer-events-none">
            {SPARKS.map((sp, idx) => {
              const rad = (sp.angle * Math.PI) / 180;
              return (
                <span
                  key={idx}
                  className="absolute w-[14px] h-[14px] rounded-full"
                  style={{
                    backgroundColor: sp.color,
                    opacity: 1 - burstP,
                    transform: `translate(${(Math.cos(rad) * sp.dist * burstP).toFixed(1)}px, ${(Math.sin(rad) * sp.dist * burstP).toFixed(1)}px) scale(${(1.2 - 0.7 * burstP).toFixed(2)})`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Top creator profile row */}
        <div className="flex items-center gap-[22px] pb-[28px] border-b border-[#E3DED3]">
          <div
            className="w-[92px] h-[92px] rounded-full flex items-center justify-center text-[42px] font-extrabold shrink-0"
            style={{
              backgroundColor: '#14161B',
              color: '#FFFFFF',
              fontFamily: look.fontDisplay,
            }}
          >
            {CREATOR_PROFILE.initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[12px]">
              <span
                className="text-[42px] font-extrabold tracking-[-0.03em] text-[#14161B]"
                style={{ fontFamily: look.fontDisplay }}
              >
                {CREATOR_PROFILE.handle}
              </span>
              <span
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: look.accent, color: look.onAccent }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <div className="text-[30px] font-medium text-[#5C5F68] mt-[2px]">
              {CREATOR_PROFILE.tagline}
            </div>
          </div>
        </div>

        {/* Subscribe Action Row */}
        <div className="pt-[30px] flex items-center justify-between gap-[18px]">
          <div
            className="relative flex-1 h-[102px] rounded-[24px] flex items-center justify-center gap-[14px] font-extrabold text-[40px] tracking-[-0.02em]"
            style={{
              backgroundColor: clicked ? '#EAE7DF' : look.accent,
              color: clicked ? '#14161B' : look.onAccent,
              fontFamily: look.fontDisplay,
              transform: `scale(${pressScale})`,
              boxShadow: clicked ? 'none' : '0 18px 36px -10px rgba(37, 142, 255, 0.45)',
            }}
          >
            {clicked ? (
              <>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Abonné</span>
              </>
            ) : (
              <span>S’abonner</span>
            )}
          </div>

          <div
            className="relative w-[102px] h-[102px] rounded-[24px] border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: bellActivated ? '#14161B' : '#F1EEE6',
              borderColor: bellActivated ? '#14161B' : '#E3DED3',
              color: bellActivated ? '#FFFFFF' : '#14161B',
            }}
          >
            {bellActivated && bellRingP < 1 && (
              <div
                className="absolute inset-0 rounded-[24px] border-[5px]"
                style={{
                  borderColor: look.accent,
                  opacity: (1 - bellRingP) * 0.8,
                  transform: `scale(${(1 + 0.45 * bellRingP).toFixed(3)})`,
                }}
              />
            )}
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill={bellActivated ? 'currentColor' : 'none'}
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

        <svg
          width="50"
          height="50"
          viewBox="0 0 24 24"
          className="absolute pointer-events-none drop-shadow-lg"
          style={{
            left: `${(155 + 340 * cursorP).toFixed(1)}px`,
            top: `${(350 - 84 * cursorP + 6 * subP).toFixed(1)}px`,
            opacity: clamp(localT * 3, 0, 1) * (1 - clamp((t - 55.2) * 2, 0, 1)),
            transform: `scale(${pressScale})`,
          }}
        >
          <path d="M5 3l14 9l-6 1.5l3 6l-2.5 1.2l-3-6l-4.5 4z" fill="#14161B" stroke="#FFFFFF" strokeWidth="1.6" />
        </svg>
      </div>

      {/* Topic pill sliding cleanly below Subscribe card */}
      {t >= 54.1 && (
        <div
          className="w-full mt-[24px] rounded-[24px] px-[28px] py-[20px] border flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(20, 22, 27, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.18)',
            opacity: clamp(toastP * 2, 0, 1),
            transform: `translateY(${(22 * (1 - toastP)).toFixed(1)}px)`,
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div className="flex items-center gap-[14px]">
            <span className="w-[14px] h-[14px] rounded-full shrink-0" style={{ backgroundColor: look.accent }} />
            <span className="text-[28px] font-bold text-white whitespace-nowrap">
              Décryptages Tech &amp; IA chaque semaine
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
