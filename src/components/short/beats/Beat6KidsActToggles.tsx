import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

const ROWS = [
  { label: 'Défilement infini', sub: 'Bloqué par défaut (-18 ans)', offAt: 48.42 },
  { label: 'Lecture automatique', sub: 'Autoplay désactivé', offAt: 49.72 },
  { label: 'Notifs nocturnes', sub: 'Coupure 22h00 – 07h00', offAt: 50.76 },
];

export const Beat6KidsActToggles: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 42.75 || t > 52.7) return null;

  const localT = t - 42.8;
  const enter = spring(localT, 14);
  const exit = leave(t, 52.55, 0.28);

  // Cursor travels downward across the 3 toggles right on each spoken phrase
  let cursorY = 230;
  if (t >= 48.0 && t < 49.65) cursorY = 230 + 138 * seg(t, 48.5, 49.6);
  else if (t >= 49.65 && t < 50.76) cursorY = 368 + 138 * seg(t, 49.8, 50.7);
  else if (t >= 50.76) cursorY = 506;

  return (
    <div
      className="absolute inset-x-0 top-0 h-[1120px] flex flex-col items-center justify-start pt-[225px] pl-[60px] pr-[150px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(40 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Recreated macOS / iOS System Settings Window */}
      <div
        className="relative w-full rounded-[34px] border overflow-hidden"
        style={{
          backgroundColor: look.sheet,
          borderColor: look.line,
          boxShadow: '0 32px 64px -18px rgba(20,22,27,0.2)',
        }}
      >
        {/* Window titlebar */}
        <div
          className="h-[88px] px-[30px] flex items-center justify-between border-b"
          style={{ backgroundColor: look.paper, borderColor: look.line }}
        >
          <div className="flex items-center gap-[12px] min-w-0">
            <span className="w-[20px] h-[20px] rounded-full bg-[#FF5F56] shrink-0" />
            <span className="w-[20px] h-[20px] rounded-full bg-[#FFBD2E] shrink-0" />
            <span className="w-[20px] h-[20px] rounded-full bg-[#27C93F] shrink-0" />
            <span className="ml-[12px] text-[30px] font-bold truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              Régulation UE · KIDS Act
            </span>
          </div>
          <span className="text-[28px] font-bold shrink-0 ml-[12px]" style={{ color: look.accent }}>
            Design sobre
          </span>
        </div>

        {/* Toggle rows */}
        <div className="px-[36px] py-[16px]">
          {ROWS.map((row, idx) => {
            const isOff = t >= row.offAt;
            const swP = isOff ? spring(t - row.offAt, 24) : 0;
            const rowPress = Math.abs(t - row.offAt) < 0.08 ? 0.985 : 1;

            return (
              <div
                key={row.label}
                className={`h-[138px] flex items-center justify-between gap-[16px] ${idx < ROWS.length - 1 ? 'border-b' : ''}`}
                style={{
                  borderColor: look.line,
                  transform: `scale(${rowPress})`,
                }}
              >
                <div className="min-w-0">
                  <div className="text-[36px] font-bold leading-tight" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                    {row.label}
                  </div>
                  <div className="text-[30px] font-medium mt-[2px]" style={{ color: isOff ? look.accent : look.ink3 }}>
                    {isOff ? row.sub : 'Actif par défaut'}
                  </div>
                </div>

                {/* Tactile toggle switch */}
                <div
                  className="relative w-[124px] h-[68px] rounded-full p-[6px] shrink-0"
                  style={{
                    backgroundColor: isOff ? look.line : look.accent,
                  }}
                >
                  <div
                    className="w-[56px] h-[56px] rounded-full bg-white shadow-md"
                    style={{
                      transform: `translateX(${((1 - swP) * 56).toFixed(1)}px)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Animated macOS pointer clicking the switches */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          className="absolute pointer-events-none drop-shadow-md"
          style={{
            left: '745px',
            top: `${cursorY.toFixed(1)}px`,
            opacity: clamp(localT - 0.3, 0, 1),
          }}
        >
          <path d="M5 3l14 9l-6 1.5l3 6l-2.5 1.2l-3-6l-4.5 4z" fill="#14161B" stroke="#FFFFFF" strokeWidth="1.6" />
        </svg>
      </div>

      {/* Clean takeaway line under window */}
      {t >= 51.05 && (
        <div
          className="mt-[30px] text-[42px] font-extrabold tracking-[-0.02em]"
          style={{
            color: look.ink,
            fontFamily: look.fontDisplay,
            opacity: clamp(spring(t - 51.05, 16) * 2, 0, 1),
          }}
        >
          Couper les <span style={{ color: look.accent }}>pièges</span>, pas les ados.
        </div>
      )}
    </div>
  );
};
