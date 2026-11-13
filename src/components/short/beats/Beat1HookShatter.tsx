import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

const SHARDS = [
  { x: -260, y: -190, r: -30, w: 126, h: 92, color: '#14161B' },
  { x: 240, y: -220, r: 26, w: 112, h: 86, color: '#258EFF' },
  { x: -300, y: 90, r: -44, w: 104, h: 98, color: '#E1306C' },
  { x: 290, y: 120, r: 38, w: 118, h: 92, color: '#FFFC00' },
  { x: -120, y: 240, r: -20, w: 96, h: 78, color: '#14161B' },
  { x: 150, y: 230, r: 32, w: 108, h: 84, color: '#258EFF' },
];

export const Beat1HookShatter: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 0 || t > 6.75) return null;

  const exit = leave(t, 6.6, 0.28);
  // Frame 0 already active (no blank paper!)
  const intro = spring(t + 0.16, 15);
  // Act 1 (0.00 - 3.39): Screen-Time Parental Lock clamps down onto social apps ("interdire les réseaux avant 15 ans")
  const clampDown = seg(t, 0.45, 2.3);
  const locked = t >= 1.4;

  // Act 2 (3.39 - 6.60): Explosion at exact word "d'exploser..." (t=3.39s)
  const hit = seg(t, 3.39, 4.1);
  const stampP = spring(t - 3.36, 24);
  const shockP = seg(t, 3.39, 4.0);
  const statP = spring(t - 4.25, 18);

  // Camera impact micro-shake on 3.39s shatter
  const shakeAmt =
    t >= 3.39 && t <= 3.85
      ? Math.sin((t - 3.39) * 85) * (1 - seg(t, 3.39, 3.85)) * 14
      : 0;

  const pct85 = Math.round(85 * seg(t, 4.25, 4.85));
  const pct63 = Math.round(63 * seg(t, 4.3, 4.92));

  return (
    <div
      className="absolute inset-x-0 top-0 h-[1120px] flex flex-col items-center justify-start pt-[225px] px-[65px] pointer-events-none"
      style={{
        opacity: exit,
        transform: `translate(${shakeAmt.toFixed(1)}px, ${(-36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Top kicker bar: Parental Lock status flipping to Exploded Law */}
      <div
        className="w-[880px] rounded-[22px] px-[32px] py-[16px] border flex items-center justify-between mb-[28px]"
        style={{
          backgroundColor: look.sheet,
          borderColor: t >= 3.35 ? '#DC2626' : look.line,
          boxShadow: '0 14px 32px -12px rgba(20,22,27,0.14)',
          transform: `translateY(${(16 * (1 - intro)).toFixed(1)}px)`,
        }}
      >
        <div className="flex items-center gap-[14px]">
          <span
            className="w-[18px] h-[18px] rounded-full"
            style={{ backgroundColor: t >= 3.35 ? '#DC2626' : look.accent }}
          />
          <span
            className="text-[32px] font-extrabold tracking-[-0.02em]"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            {t >= 3.35 ? 'VERROUILLAGE · ÉCHEC EN COURS' : 'LIMITE D’ÂGE · -15 ANS'}
          </span>
        </div>
        <span
          className="text-[30px] font-mono font-bold tabular-nums"
          style={{ color: t >= 3.35 ? '#DC2626' : look.accent }}
        >
          {t >= 3.35 ? 'CONTOURNÉE' : locked ? '00:00 · BLOQUÉ' : `00:0${Math.max(1, Math.ceil(3 - t * 2))}`}
        </span>
      </div>

      {/* Central Stage: Apps under Screen-Time Lock -> Shattered at 3.35s */}
      <div className="relative w-[900px] h-[440px] flex items-center justify-center">
        {t >= 3.35 && shockP < 1 && (
          <div
            className="absolute rounded-full border-[7px]"
            style={{
              width: `${280 + shockP * 600}px`,
              height: `${280 + shockP * 600}px`,
              borderColor: look.accent,
              opacity: (1 - shockP) * 0.7,
            }}
          />
        )}

        {/* Intact social apps + descending parental lock barrier before 3.42s */}
        {t < 3.44 && (
          <div
            className="relative flex items-center gap-[32px]"
            style={{
              opacity: t < 3.35 ? 1 : 1 - seg(t, 3.35, 3.44),
              transform: `scale(${1 - 0.04 * clampDown})`,
            }}
          >
            {/* TikTok card */}
            <div
              className="relative w-[240px] h-[258px] rounded-[36px] flex flex-col items-center justify-center gap-[16px] border"
              style={{
                backgroundColor: '#14161B',
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 24px 44px -14px rgba(20,22,27,0.28)',
                transform: 'rotate(-4deg)',
              }}
            >
              <svg width="82" height="82" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
                  fill="#FFFFFF"
                />
              </svg>
              <span className="text-[34px] font-bold text-white tracking-[-0.02em]">TikTok</span>
              {/* Red Screen-Time Lock Badge */}
              <div
                className="absolute -top-[18px] -right-[14px] w-[60px] h-[60px] rounded-full bg-[#DC2626] border-4 border-white flex items-center justify-center shadow-lg"
                style={{ opacity: clamp(seg(t, 0.7, 1.3), 0, 1) }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            {/* Instagram card */}
            <div
              className="relative w-[250px] h-[272px] rounded-[38px] flex flex-col items-center justify-center gap-[16px] border"
              style={{
                backgroundColor: look.sheet,
                borderColor: look.line,
                boxShadow: '0 28px 52px -14px rgba(20,22,27,0.22)',
                transform: 'translateY(-14px)',
              }}
            >
              <div className="w-[92px] h-[92px] rounded-[24px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#515BD4] flex items-center justify-center">
                <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="#FFFFFF" stroke="none" />
                </svg>
              </div>
              <span className="text-[34px] font-bold tracking-[-0.02em]" style={{ color: look.ink }}>
                Instagram
              </span>
              <div
                className="absolute -top-[18px] -right-[14px] w-[60px] h-[60px] rounded-full bg-[#DC2626] border-4 border-white flex items-center justify-center shadow-lg"
                style={{ opacity: clamp(seg(t, 1.0, 1.6), 0, 1) }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            {/* Snapchat card */}
            <div
              className="relative w-[240px] h-[258px] rounded-[36px] flex flex-col items-center justify-center gap-[16px] border"
              style={{
                backgroundColor: '#FFFC00',
                borderColor: 'rgba(20,22,27,0.12)',
                boxShadow: '0 24px 44px -14px rgba(20,22,27,0.2)',
                transform: 'rotate(4deg)',
              }}
            >
              <svg width="82" height="82" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#14161B" strokeWidth="1.8">
                <path d="M12 3c-2.8 0-4.8 1.9-4.8 4.8v1.9c-.6.2-1.4.4-1.4 1.1c0 .6.7.9 1.2 1c-.2 1.2-1.2 2.4-2.8 3c-.5.2-.7.7-.4 1.1c.5.7 1.8 1.1 3.1 1.3c.3.7 1.1 1.8 2.2 1.8c.9 0 1.6-.6 2.9-.6s2 .6 2.9.6c1.1 0 1.9-1.1 2.2-1.8c1.3-.2 2.6-.6 3.1-1.3c.3-.4.1-.9-.4-1.1c-1.6-.6-2.6-1.8-2.8-3c.5-.1 1.2-.4 1.2-1c0-.7-.8-.9-1.4-1.1V7.8C16.8 4.9 14.8 3 12 3z" />
              </svg>
              <span className="text-[34px] font-bold text-[#14161B] tracking-[-0.02em]">Snapchat</span>
              <div
                className="absolute -top-[18px] -right-[14px] w-[60px] h-[60px] rounded-full bg-[#DC2626] border-4 border-white flex items-center justify-center shadow-lg"
                style={{ opacity: clamp(seg(t, 1.3, 1.9), 0, 1) }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Flying shards after 3.35s ("d'exploser...") */}
        {t >= 3.35 &&
          SHARDS.map((s, idx) => {
            const p = hit;
            const opacity = clamp(1 - seg(t, 3.7, 4.15), 0, 1);
            return (
              <div
                key={idx}
                className="absolute rounded-[14px]"
                style={{
                  width: `${s.w}px`,
                  height: `${s.h}px`,
                  backgroundColor: s.color,
                  opacity,
                  transform: `translate(${(s.x * p).toFixed(1)}px, ${(s.y * p).toFixed(1)}px) rotate(${(s.r * p).toFixed(1)}deg) scale(${(1 - 0.3 * p).toFixed(3)})`,
                  boxShadow: '0 12px 24px rgba(20,22,27,0.16)',
                }}
              />
            );
          })}

        {/* Heavy Verdict Stamp slamming at 3.32s */}
        {t >= 3.32 && (
          <div
            className="absolute px-[48px] py-[26px] rounded-[28px] border-[6px] flex flex-col items-center"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.accent,
              opacity: clamp(stampP * 3, 0, 1),
              transform: `translateY(${(-88 * clamp(seg(t, 4.15, 4.6), 0, 1)).toFixed(1)}px) scale(${(1.26 - 0.26 * stampP).toFixed(3)}) rotate(-2deg)`,
              boxShadow: '0 32px 60px -16px rgba(20,22,27,0.32)',
            }}
          >
            <div
              className="text-[78px] font-extrabold leading-none tracking-[-0.04em]"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              LOI <span style={{ color: look.accent }}>EXPLOSÉE</span>
            </div>
            <div className="text-[32px] font-semibold mt-[10px]" style={{ color: look.ink2 }}>
              Censurée en France · Contournée partout
            </div>
          </div>
        )}
      </div>

      {/* Act 2 Double Receipt Counter (4.25s - 6.60s: "et le vrai piège est ailleurs") */}
      {t >= 4.25 && (
        <div
          className="w-[880px] mt-[8px] grid grid-cols-2 gap-[24px]"
          style={{
            opacity: clamp(statP * 2, 0, 1),
            transform: `translateY(${(30 * (1 - statP)).toFixed(1)}px)`,
          }}
        >
          <div
            className="px-[34px] py-[24px] rounded-[26px] border flex items-center gap-[22px]"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.line,
              boxShadow: '0 22px 44px -14px rgba(20,22,27,0.14)',
            }}
          >
            <span
              className="text-[76px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
              style={{ color: look.accent, fontFamily: look.fontDisplay }}
            >
              {pct85}%
            </span>
            <div className="text-[30px] font-bold leading-tight" style={{ color: look.ink }}>
              contournent
              <span className="block font-medium text-[26px]" style={{ color: look.ink2 }}>
                en 4 secondes
              </span>
            </div>
          </div>

          <div
            className="px-[34px] py-[24px] rounded-[26px] border flex items-center gap-[22px]"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.line,
              boxShadow: '0 22px 44px -14px rgba(20,22,27,0.14)',
            }}
          >
            <span
              className="text-[76px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {pct63}%
            </span>
            <div className="text-[30px] font-bold leading-tight" style={{ color: look.ink }}>
              des -13 ans
              <span className="block font-medium text-[26px]" style={{ color: look.ink2 }}>
                ont déjà un compte
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
