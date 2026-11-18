import React from 'react';
import { CAPTION_CHUNKS, CAPTION_HIDE_SPANS, LookPreset } from '../../data/shortSpec';
import { getActiveCaptionChunk } from '../../engine/math';

interface ShortCaptionsProps {
  t: number;
  seam: number;
  look: LookPreset;
}

export const ShortCaptions: React.FC<ShortCaptionsProps> = ({ t, seam, look }) => {
  const chunk = getActiveCaptionChunk(t, CAPTION_CHUNKS, CAPTION_HIDE_SPANS);
  if (!chunk) return null;

  // Position cleanly on the paper/photo seam or center-low safe area (never touching top 220 / bottom 420)
  let topY = 1130;
  if (seam >= 1650) topY = 1365;
  else if (seam <= 300) topY = 1230;
  else topY = seam - 24;

  const overVideo = seam <= 600;

  // ONE unified container for the entire phrase (never separate boxes per word!)
  if (look.captionStyle === 'hard') {
    return (
      <div
        className="absolute inset-x-0 flex justify-center items-center px-[56px] pointer-events-none z-30"
        style={{ top: `${topY.toFixed(1)}px`, transform: 'translateY(-50%)' }}
      >
        <div
          className="inline-flex flex-wrap items-baseline justify-center gap-x-[16px] px-[38px] py-[18px] rounded-[22px] max-w-[920px]"
          style={{
            backgroundColor: '#111111',
            boxShadow: '8px 10px 0 rgba(17, 17, 17, 0.92)',
          }}
        >
          {chunk.words.map((word, idx) => {
            const isActive = idx === chunk.activeIndex;
            const isPast = idx < chunk.activeIndex;
            return (
              <span
                key={`${word.text}-${idx}`}
                className="font-extrabold leading-[1.1] tracking-[-0.025em]"
                style={{
                  fontFamily: look.fontDisplay,
                  fontSize: '72px',
                  color: isActive ? look.accent : isPast ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (look.captionStyle === 'stack') {
    return (
      <div
        className="absolute inset-x-0 flex justify-center items-center px-[56px] pointer-events-none z-30"
        style={{ top: `${topY.toFixed(1)}px`, transform: 'translateY(-50%)' }}
      >
        <div
          className="inline-flex flex-wrap items-baseline justify-center gap-x-[16px] px-[36px] py-[16px] rounded-[20px] max-w-[920px]"
          style={{
            backgroundColor: overVideo ? 'rgba(17, 17, 17, 0.88)' : '#FFFFFF',
            boxShadow: '0 18px 40px -10px rgba(17, 17, 17, 0.28)',
          }}
        >
          {chunk.words.map((word, idx) => {
            const isActive = idx === chunk.activeIndex;
            const isPast = idx < chunk.activeIndex;
            return (
              <span
                key={`${word.text}-${idx}`}
                className="font-black uppercase leading-[1.06] tracking-[-0.03em]"
                style={{
                  fontFamily: look.fontDisplay,
                  fontSize: '68px',
                  color: isActive
                    ? '#F0640A'
                    : overVideo
                      ? isPast
                        ? '#FFFFFF'
                        : 'rgba(255,255,255,0.72)'
                      : isPast
                        ? '#111111'
                        : 'rgba(17,17,17,0.58)',
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // Default Melvynx "Papier signature" unified phrase capsule (clean single box, accent on spoken word)
  return (
    <div
      className="absolute inset-x-0 flex justify-center items-center px-[56px] pointer-events-none z-30"
      style={{ top: `${topY.toFixed(1)}px`, transform: 'translateY(-50%)' }}
    >
      <div
        className="inline-flex flex-wrap items-baseline justify-center gap-x-[15px] px-[38px] py-[18px] rounded-[24px] border max-w-[920px]"
        style={{
          backgroundColor: overVideo ? 'rgba(20, 22, 27, 0.84)' : 'rgba(252, 251, 248, 0.96)',
          borderColor: overVideo ? 'rgba(255, 255, 255, 0.14)' : look.line,
          boxShadow: '0 18px 42px -12px rgba(20, 22, 27, 0.24)',
        }}
      >
        {chunk.words.map((word, idx) => {
          const isActive = idx === chunk.activeIndex;
          const isPast = idx < chunk.activeIndex;
          const highlightColor = overVideo ? '#5EA8FF' : look.accent;
          const baseColor = overVideo
            ? isPast
              ? '#FFFFFF'
              : 'rgba(255, 255, 255, 0.72)'
            : isPast
              ? look.ink
              : look.ink2;

          return (
            <span
              key={`${word.text}-${idx}`}
              className="font-extrabold leading-[1.12] tracking-[-0.03em]"
              style={{
                fontFamily: look.fontDisplay,
                fontSize: '70px',
                color: isActive ? highlightColor : baseColor,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
