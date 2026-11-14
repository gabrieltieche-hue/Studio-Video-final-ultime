import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

const SHARDS = [
  { x: -290, y: -190, r: -34, w: 126, h: 88, color: '#14161B' },
  { x: 260, y: -210, r: 28, w: 112, h: 84, color: '#258EFF' },
  { x: -330, y: 75, r: -46, w: 102, h: 96, color: '#E1306C' },
  { x: 310, y: 95, r: 40, w: 118, h: 88, color: '#FFFC00' },
  { x: -165, y: 210, r: -22, w: 94, h: 74, color: '#14161B' },
  { x: 175, y: 205, r: 34, w: 106, h: 80, color: '#258EFF' },
  { x: -20, y: -225, r: 16, w: 72, h: 52, color: '#DC2626' },
  { x: 55, y: 235, r: -18, w: 80, h: 54, color: '#DC2626' },
];

export const Beat1HookShatter: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 0 || t > 6.4) return null;

  const exit = leave(t, 6.24, 0.28);
  // Frame 0 already alive — never static or blank
  const intro = spring(t + 0.18, 15);
  const clampDown = seg(t, 0.35, 2.35);
  const scanBeam = (t * 145) % 340;
  const locked = t >= 1.25;

  // Act 2 (3.44 - 6.24): Exact shatter synced to Brian saying "d'exploser," (3.437s)
  const exploded = t >= 3.42;
  const hit = seg(t, 3.44, 4.18);
  const stampP = spring(t - 3.4, 24);
  const shockP = seg(t, 3.44, 4.08);
  const statP = spring(t - 4.35, 18);

  const shakeAmt =
    t >= 3.44 && t <= 3.92
      ? Math.sin((t - 3.44) * 90) * (1 - seg(t, 3.44, 3.92)) * 15
      : 0;

  const pct85 = Math.round(85 * seg(t, 4.1, 4.65));
  const pct63 = Math.round(63 * seg(t, 4.15, 4.7));

  return (
    <div
      className="absolute inset-x-0 top-0 h-[1120px] flex flex-col items-center justify-start pt-[186px] pl-[58px] pr-[148px] pointer-events-none"
      style={{
        opacity: exit,
        transform: `translate(${shakeAmt.toFixed(1)}px, ${(-36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Top kicker bar: Parental Lock status flipping to Exploded Law */}
      <div
        className="w-full rounded-[24px] px-[28px] py-[16px] border flex items-center justify-between mb-[22px]"
        style={{
          backgroundColor: look.sheet,
          borderColor: exploded ? '#DC2626' : look.line,
          borderWidth: exploded ? '2.5px' : '1.5px',
          boxShadow: '0 16px 36px -12px rgba(20,22,27,0.14)',
          transform: `translateY(${(14 * (1 - intro)).toFixed(1)}px)`,
        }}
      >
        <div className="flex items-center gap-[14px] min-w-0">
          <span
            className="w-[18px] h-[18px] rounded-full shrink-0"
            style={{
              backgroundColor: exploded ? '#DC2626' : look.accent,
              transform: `scale(${(0.85 + 0.25 * Math.abs(Math.sin(t * 6))).toFixed(2)})`,
            }}
          />
          <span
            className="text-[30px] font-extrabold tracking-[-0.02em] truncate"
            style={{ color: look.ink, fontFamily: look.fontDisplay }}
          >
            {exploded ? 'VERROUILLAGE · ÉCHEC EN COURS' : 'DÉCRET LIMITE D’ÂGE · -15 ANS'}
          </span>
        </div>
        <span
          className="text-[28px] font-mono font-bold tabular-nums shrink-0 ml-[12px]"
          style={{ color: exploded ? '#DC2626' : look.accent }}
        >
          {exploded ? 'EXPLOSÉE' : locked ? '00:00 BLOQUÉ' : `00:0${Math.max(1, Math.ceil(2.5 - t * 2))}`}
        </span>
      </div>

      {/* Central Kinetic Stage */}
      <div className="relative w-full h-[425px] flex items-center justify-center">
        {/* Dual expanding shockwave rings at shatter */}
        {exploded && shockP < 1 && (
          <>
            <div
              className="absolute rounded-full border-[7px]"
              style={{
                width: `${260 + shockP * 620}px`,
                height: `${260 + shockP * 620}px`,
                borderColor: look.accent,
                opacity: (1 - shockP) * 0.72,
              }}
            />
            <div
              className="absolute rounded-full border-[5px] border-dashed"
              style={{
                width: `${180 + shockP * 480}px`,
                height: `${180 + shockP * 480}px`,
                borderColor: '#DC2626',
                opacity: (1 - shockP) * 0.6,
                transform: `rotate(${(shockP * 45).toFixed(1)}deg)`,
              }}
            />
          </>
        )}

        {/* Intact social apps + descending parental lock barrier before 3.48s */}
        {t < 3.49 && (
          <div
            className="relative w-full flex items-center justify-center gap-[24px]"
            style={{
              opacity: !exploded ? 1 : 1 - seg(t, 3.42, 3.49),
              transform: `scale(${(1 - 0.045 * clampDown).toFixed(3)})`,
            }}
          >
            {/* TikTok card */}
            <div
              className="relative w-[228px] h-[250px] rounded-[34px] flex flex-col items-center justify-center gap-[14px] border overflow-hidden"
              style={{
                backgroundColor: '#14161B',
                borderColor: 'rgba(255,255,255,0.14)',
                boxShadow: '0 24px 44px -14px rgba(20,22,27,0.28)',
                transform: `rotate(${(-5 + 1.5 * Math.sin(t * 2.6)).toFixed(2)}deg)`,
              }}
            >
              <svg width="78" height="78" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
                  fill="#FFFFFF"
                />
              </svg>
              <span className="text-[32px] font-bold text-white tracking-[-0.02em]">TikTok</span>
              <div
                className="absolute inset-x-0 h-[4px] opacity-65"
                style={{ top: `${scanBeam.toFixed(0)}px`, backgroundColor: '#DC2626' }}
              />
              <div
                className="absolute top-[14px] right-[14px] w-[52px] h-[52px] rounded-full bg-[#DC2626] border-2 border-white flex items-center justify-center shadow-lg"
                style={{ opacity: clamp(seg(t, 0.55, 1.1), 0, 1) }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            {/* Instagram card */}
            <div
              className="relative w-[240px] h-[268px] rounded-[36px] flex flex-col items-center justify-center gap-[14px] border overflow-hidden"
              style={{
                backgroundColor: look.sheet,
                borderColor: look.line,
                boxShadow: '0 28px 52px -14px rgba(20,22,27,0.22)',
                transform: `translateY(${(-14 + 5 * Math.cos(t * 2.8)).toFixed(1)}px)`,
              }}
            >
              <div className="w-[88px] h-[88px] rounded-[24px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#515BD4] flex items-center justify-center">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="#FFFFFF" stroke="none" />
                </svg>
              </div>
              <span className="text-[32px] font-bold tracking-[-0.02em]" style={{ color: look.ink }}>
                Instagram
              </span>
              <div
                className="absolute inset-x-0 h-[4px] opacity-65"
                style={{ top: `${((scanBeam + 90) % 280).toFixed(0)}px`, backgroundColor: '#DC2626' }}
              />
              <div
                className="absolute top-[14px] right-[14px] w-[52px] h-[52px] rounded-full bg-[#DC2626] border-2 border-white flex items-center justify-center shadow-lg"
                style={{ opacity: clamp(seg(t, 0.85, 1.4), 0, 1) }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            {/* Snapchat card */}
            <div
              className="relative w-[228px] h-[250px] rounded-[34px] flex flex-col items-center justify-center gap-[14px] border overflow-hidden"
              style={{
                backgroundColor: '#FFFC00',
                borderColor: 'rgba(20,22,27,0.14)',
                boxShadow: '0 24px 44px -14px rgba(20,22,27,0.2)',
                transform: `rotate(${(5 - 1.5 * Math.sin(t * 2.6)).toFixed(2)}deg)`,
              }}
            >
              <svg width="78" height="78" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#14161B" strokeWidth="1.8">
                <path d="M12 3c-2.8 0-4.8 1.9-4.8 4.8v1.9c-.6.2-1.4.4-1.4 1.1c0 .6.7.9 1.2 1c-.2 1.2-1.2 2.4-2.8 3c-.5.2-.7.7-.4 1.1c.5.7 1.8 1.1 3.1 1.3c.3.7 1.1 1.8 2.2 1.8c.9 0 1.6-.6 2.9-.6s2 .6 2.9.6c1.1 0 1.9-1.1 2.2-1.8c1.3-.2 2.6-.6 3.1-1.3c.3-.4.1-.9-.4-1.1c-1.6-.6-2.6-1.8-2.8-3c.5-.1 1.2-.4 1.2-1c0-.7-.8-.9-1.4-1.1V7.8C16.8 4.9 14.8 3 12 3z" />
              </svg>
              <span className="text-[32px] font-bold text-[#14161B] tracking-[-0.02em]">Snapchat</span>
              <div
                className="absolute inset-x-0 h-[4px] opacity-65"
                style={{ top: `${((scanBeam + 170) % 280).toFixed(0)}px`, backgroundColor: '#DC2626' }}
              />
              <div
                className="absolute top-[14px] right-[14px] w-[52px] h-[52px] rounded-full bg-[#DC2626] border-2 border-white flex items-center justify-center shadow-lg"
                style={{ opacity: clamp(seg(t, 1.15, 1.7), 0, 1) }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Flying shards after 3.42s */}
        {exploded &&
          SHARDS.map((s, idx) => {
            const p = hit;
            const opacity = clamp(1 - seg(t, 3.78, 4.25), 0, 1);
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

        {/* Heavy Verdict Stamp slamming at 3.40s */}
        {exploded && (
          <div
            className="absolute px-[46px] py-[28px] rounded-[30px] border-[6px] flex flex-col items-center"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.accent,
              opacity: clamp(stampP * 3, 0, 1),
              transform: `translateY(${(-28 * clamp(seg(t, 4.1, 4.55), 0, 1)).toFixed(1)}px) scale(${(1.26 - 0.26 * stampP).toFixed(3)}) rotate(-2deg)`,
              boxShadow: '0 32px 60px -16px rgba(20,22,27,0.32)',
            }}
          >
            <div
              className="text-[78px] font-extrabold leading-none tracking-[-0.04em]"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              LOI <span style={{ color: look.accent }}>EXPLOSÉE</span>
            </div>
            <div className="text-[31px] font-semibold mt-[10px]" style={{ color: look.ink2 }}>
              Censurée en France · Contournée partout
            </div>
          </div>
        )}
      </div>

      {/* Bottom Zone: Act 1 Lock Telemetry Strip (<4.10s) OR Act 2 Double Stat Cards (>=4.10s) */}
      {!exploded || t < 4.1 ? (
        <div
          className="w-full mt-[10px] rounded-[24px] px-[28px] py-[22px] border grid grid-cols-3 gap-[16px]"
          style={{
            backgroundColor: look.sheet,
            borderColor: look.line,
            boxShadow: '0 18px 36px -14px rgba(20,22,27,0.12)',
            opacity: t < 3.42 ? 1 : 1 - seg(t, 3.42, 4.1),
          }}
        >
          <div className="flex flex-col">
            <span className="text-[24px] font-semibold" style={{ color: look.ink3 }}>Cible loi</span>
            <span className="text-[32px] font-extrabold tabular-nums" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              Moins de 15 ans
            </span>
          </div>
          <div className="flex flex-col border-l pl-[16px]" style={{ borderColor: look.line }}>
            <span className="text-[24px] font-semibold" style={{ color: look.ink3 }}>Mécanisme</span>
            <span className="text-[32px] font-extrabold tabular-nums" style={{ color: look.accent, fontFamily: look.fontDisplay }}>
              Case d’âge
            </span>
          </div>
          <div className="flex flex-col border-l pl-[16px]" style={{ borderColor: look.line }}>
            <span className="text-[24px] font-semibold" style={{ color: look.ink3 }}>Effet réel</span>
            <span className="text-[32px] font-extrabold tabular-nums" style={{ color: '#DC2626', fontFamily: look.fontDisplay }}>
              {exploded ? 'EFFONDRÉ' : 'VERROUILLAGE'}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="w-full mt-[10px] grid grid-cols-2 gap-[22px]"
          style={{
            opacity: clamp(statP * 2, 0, 1),
            transform: `translateY(${(26 * (1 - statP)).toFixed(1)}px)`,
          }}
        >
          <div
            className="px-[28px] py-[22px] rounded-[26px] border flex items-center gap-[18px]"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.line,
              boxShadow: '0 22px 44px -14px rgba(20,22,27,0.14)',
            }}
          >
            <span
              className="text-[72px] font-extrabold leading-none tracking-[-0.04em] tabular-nums shrink-0"
              style={{ color: look.accent, fontFamily: look.fontDisplay }}
            >
              {pct85}%
            </span>
            <div className="text-[28px] font-bold leading-tight min-w-0" style={{ color: look.ink }}>
              contournent
              <span className="block font-medium text-[24px]" style={{ color: look.ink2 }}>
                en 4 secondes
              </span>
            </div>
          </div>

          <div
            className="px-[28px] py-[22px] rounded-[26px] border flex items-center gap-[18px]"
            style={{
              backgroundColor: look.sheet,
              borderColor: look.line,
              boxShadow: '0 22px 44px -14px rgba(20,22,27,0.14)',
            }}
          >
            <span
              className="text-[72px] font-extrabold leading-none tracking-[-0.04em] tabular-nums shrink-0"
              style={{ color: look.ink, fontFamily: look.fontDisplay }}
            >
              {pct63}%
            </span>
            <div className="text-[28px] font-bold leading-tight min-w-0" style={{ color: look.ink }}>
              des -13 ans
              <span className="block font-medium text-[24px]" style={{ color: look.ink2 }}>
                déjà inscrits
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
