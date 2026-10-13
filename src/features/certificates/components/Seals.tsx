import React from "react";

/** Scalloped seal — fill via currentColor / CSS --cert-brand. */
export function ScallopedSeal({
  className,
  fill,
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      width="88"
      height="88"
      aria-hidden
      style={fill ? { color: fill } : undefined}
    >
      <path
        fill="currentColor"
        d="M60 4l8 10 12-4 4 12 12 4-4 12 10 8-10 8 4 12-12 4-4 12-12-4-8 10-8-10-12 4-4-12-12-4 4-12-10-8 10-8-4-12 12-4 4-12 12 4z"
      />
      <circle cx="60" cy="60" r="28" fill="#fff" fillOpacity="0.35" />
    </svg>
  );
}

/** Brandable seal with laurel wreath (white). */
export function RedWreathSeal({
  className,
  fill = "currentColor",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      width="92"
      height="92"
      aria-hidden
      style={{ color: fill }}
    >
      <path
        fill="currentColor"
        d="M60 4l8 10 12-4 4 12 12 4-4 12 10 8-10 8 4 12-12 4-4 12-12-4-8 10-8-10-12 4-4-12-12-4 4-12-10-8 10-8-4-12 12-4 4-12 12 4z"
      />
      <circle cx="60" cy="60" r="32" fill="currentColor" />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        d="M38 72c6-18 14-28 22-28s16 10 22 28M38 72c4 8 12 14 22 14s18-6 22-14"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        d="M42 58c4-2 8-2 12 0M66 58c4-2 8-2 12 0M48 48c3-3 7-4 12-2M60 46c5-2 9-1 12 2"
      />
    </svg>
  );
}

/** Medal seal — uses currentColor for chrome. */
export function MedalSeal({
  className,
  fill = "currentColor",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      width="84"
      height="84"
      aria-hidden
      style={{ color: fill }}
    >
      <path
        fill="currentColor"
        d="M60 6l7 9 11-3 3 11 11 3-3 11 9 7-9 7 3 11-11 3-3 11-11-3-7 9-7-9-11 3-3-11-11-3 3-11-9-7 9-7-3-11 11-3 3-11 11 3z"
      />
      <circle cx="60" cy="52" r="22" fill="#fff" fillOpacity="0.55" />
      <circle cx="60" cy="52" r="16" fill="none" stroke="currentColor" strokeWidth="2" />
      <path fill="currentColor" d="M52 74h16l-3 18-5-4-5 4z" />
    </svg>
  );
}

/** Faint laurel watermark for gold template background. */
export function LaurelWatermark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      width="320"
      height="320"
      aria-hidden
    >
      <g
        fill="none"
        stroke="#94a3b8"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      >
        <path d="M200 320c-40-40-70-90-70-150 0-50 20-90 50-120" />
        <path d="M200 320c40-40 70-90 70-150 0-50-20-90-50-120" />
        <path d="M140 200c-12-8-20-20-22-34M130 240c-14-6-24-18-28-32M145 160c-10-10-16-22-16-36" />
        <path d="M260 200c12-8 20-20 22-34M270 240c14-6 24-18 28-32M255 160c10-10 16-22 16-36" />
        <path d="M200 80c-8 12-12 24-12 38M200 80c8 12 12 24 12 38" />
      </g>
    </svg>
  );
}
