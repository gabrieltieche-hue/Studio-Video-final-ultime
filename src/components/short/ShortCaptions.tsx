import React from 'react';
import { CAPTION_CHUNKS, CAPTION_HIDE_SPANS, LookPreset } from '../../data/shortSpec';
import { getActiveCaptionChunk } from '../../engine/math';

interface ShortCaptionsProps {
  t: number;
  seam: number;
  look: LookPreset;
}

export const ShortCaptions: React.FC<ShortCaptionsProps> = ({ t, seam }) => {
  const chunk = getActiveCaptionChunk(t, CAPTION_CHUNKS, CAPTION_HIDE_SPANS);
  if (!chunk) return null;

  // Position cleanly on the paper/photo seam or center-low safe area (never touching top 220 / bottom 420)
  let topY = 1140;
  if (seam >= 1650) topY = 1365;
  else if (seam <= 300) topY = 1230;
  else topY = seam - 20;

  return (
    <div
      className="absolute inset-x-0 flex justify-center items-center px-[72px] pointer-events-none z-30"
      style={{ top: `${topY.toFixed(1)}px`, transform: 'translateY(-50%)' }}
      data-testid="short-captions"
    >
      <div className="inline-flex flex-wrap items-baseline justify-center gap-x-[28px] gap-y-[10px] max-w-[940px] text-center">
        {chunk.words.map((word, idx) => {
          const isActive = idx === chunk.activeIndex;
          const isPast = idx < chunk.activeIndex;
          const fill = isActive ? '#FFD60A' : isPast ? '#FFFFFF' : 'rgba(255, 255, 255, 0.94)';

          return (
            <span
              key={`${word.text}-${idx}`}
              className="inline-block uppercase font-black leading-[1.08] tracking-[0.02em]"
              style={{
                fontFamily: '"Archivo Black", "Bricolage Grotesque", "Inter", sans-serif',
                fontSize: '58px',
                color: fill,
                WebkitTextStroke: '10px #000000',
                paintOrder: 'stroke fill',
                textShadow: '0 5px 14px rgba(0, 0, 0, 0.78)',
                transform: isActive ? 'scale(1.07) translateY(-2px)' : 'scale(1)',
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
