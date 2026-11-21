import React from 'react';
import type { BrandLogoId } from '../../types/batch';

export const NOTO_ICON_SLUGS = {
  brain: 'brain',
  lock: 'locked',
  shield: 'shield',
  rocket: 'rocket',
  fire: 'fire',
  chart: 'chart-increasing',
  chartDown: 'chart-decreasing',
  clock: 'clock',
  bulb: 'bulb',
  money: 'money-bag',
  bank: 'bank',
  code: 'code',
  magnifyingGlass: 'search',
  bell: 'bell',
  check: 'check',
  warning: 'warning',
  robot: 'robot',
} as const;

const NOTO_ICON_ALIASES: Record<string, string> = {
  'magnifying-glass-tilted-left': 'search',
  'magnifying-glass': 'search',
  scales: 'balance-scale',
  'light-bulb': 'bulb',
  lock: 'locked',
  unlock: 'unlocked',
  alert: 'warning',
  'cross-mark': 'cross',
  'electric-plug': 'connected',
  'globe-with-meridians': 'globe',
};

export function NotoSvgIcon({
  name,
  size = 44,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const raw = String(name || 'bulb').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  const safe = NOTO_ICON_ALIASES[raw] || raw || 'bulb';
  return (
    <img
      src={`/icons/${safe}.svg`}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
    />
  );
}

export function BrandLogoBadge({
  brand = 'ai',
  size = 44,
}: {
  brand?: BrandLogoId;
  size?: number;
}) {
  const s = String(size);

  if (brand === 'claude') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: '#D97757',
        }}
      >
        <svg width={Math.round(size * 0.68)} height={Math.round(size * 0.68)} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2.5v19M4.8 6.8l14.4 10.4M19.2 6.8L4.8 17.2M2.5 12h19"
            stroke="#FFFBF5"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (brand === 'openai') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0 border border-black/10 bg-white"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 9.5L12 7.5l3.5 2v4L12 15.5l-3.5-2z" />
          <path d="M12 3v4.5M19.8 7.5l-4.3 2M19.8 16.5l-4.3-2M12 21v-5.5M4.2 16.5l4.3-2M4.2 7.5l4.3 2" />
        </svg>
      </div>
    );
  }

  if (brand === 'deepseek') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: '#2563EB',
        }}
      >
        <svg width={Math.round(size * 0.68)} height={Math.round(size * 0.68)} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 13.5c2.2-5 7.2-6.8 11.4-4.2c1.8 1.1 2.7 3.2 4.6 3.2c-1 2.8-2.9 5.5-7.4 5.5c-4.3 0-7.2-1.8-8.6-4.5z"
            fill="#FFFFFF"
          />
          <circle cx="14.5" cy="12" r="1.3" fill="#2563EB" />
        </svg>
      </div>
    );
  }

  if (brand === 'github') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0 bg-[#14161B]"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={Math.round(size * 0.64)} height={Math.round(size * 0.64)} viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.53 2.86 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-1.03-.01-1.87-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.85.09-.67.35-1.12.64-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.7.12 2.5.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.48A10.26 10.26 0 0 0 22 12.24C22 6.58 17.52 2 12 2z" />
        </svg>
      </div>
    );
  }

  if (brand === 'instagram') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: 'linear-gradient(45deg, #F58529, #DD2A7B, #515BD4)',
        }}
      >
        <svg width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.1" fill="#FFFFFF" stroke="none" />
        </svg>
      </div>
    );
  }

  if (brand === 'tiktok') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0 bg-[#111111]"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} viewBox="0 0 24 24" fill="none">
          <path
            d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  if (brand === 'apple') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0 bg-[#F3F4F6] border border-black/10"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} viewBox="0 0 24 24" fill="#1F2937">
          <path d="M16.5 12.7c0-2.1 1.7-3.1 1.8-3.2c-1-1.4-2.5-1.6-3-1.7c-1.3-.1-2.5.8-3.1.8c-.6 0-1.6-.8-2.7-.8c-1.4 0-2.7.8-3.4 2.1c-1.5 2.5-.4 6.2 1 8.2c.7 1 1.5 2.1 2.6 2c1 0 1.4-.7 2.7-.7c1.2 0 1.6.7 2.7.7c1.1 0 1.8-1 2.5-2c.8-1.1 1.1-2.2 1.1-2.3c0 0-2.2-.8-2.2-3.1zM14.4 6.4c.6-.7 1-1.7.9-2.7c-.9 0-1.9.6-2.5 1.3c-.5.6-1 1.6-.9 2.6c1 .1 2-.5 2.5-1.2z" />
        </svg>
      </div>
    );
  }

  if (brand === 'google') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0 bg-white border border-black/10"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9c-.3 1.3-1 2.4-2.2 3.2v2.6h3.5c2.1-1.9 3.3-4.7 3.3-7.7z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.6c-1 .7-2.3 1.1-3.8 1.1c-2.9 0-5.4-2-6.3-4.7H2.1v2.7C3.9 20.4 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.7 14.1c-.2-.7-.3-1.4-.3-2.1s.1-1.4.3-2.1V7.2H2.1C1.4 8.6 1 10.3 1 12s.4 3.4 1.1 4.8l3.6-2.7z" />
          <path fill="#EA4335" d="M12 5.2c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.4 2 14.9 1 12 1C7.7 1 3.9 3.6 2.1 7.2l3.6 2.7C6.6 7.2 9.1 5.2 12 5.2z" />
        </svg>
      </div>
    );
  }

  if (brand === 'youtube') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0 bg-[#FF0000]"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" fill="#FFFFFF">
          <polygon points="8,5 19,12 8,19" />
        </svg>
      </div>
    );
  }

  if (brand === 'x') {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center shrink-0 bg-[#111111]"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={Math.round(size * 0.54)} height={Math.round(size * 0.54)} viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7L4.8 22H1.4l7.9-9.1L1 2h7l4.8 6.4L18.2 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] flex items-center justify-center shrink-0 bg-[#258EFF]"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.1" style={{ width: `${Math.round(size * 0.56)}px`, height: `${Math.round(size * 0.56)}px` }}>
        <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4z" />
      </svg>
    </div>
  );
}
