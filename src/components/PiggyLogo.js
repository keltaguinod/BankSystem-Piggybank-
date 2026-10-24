'use client';

// Unique custom piggy-bank mark. `color` controls the body, `accent` the coin/slot.
export default function PiggyLogo({ size = 28, color = '#ffffff', accent = '#f0c419' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-label="BankSystem piggy bank">
      {/* coin dropping into the slot */}
      <circle cx="32" cy="6" r="5" fill={accent} stroke={color} strokeWidth="1.5" />
      <line x1="32" y1="4" x2="32" y2="8" stroke={color} strokeWidth="1.2" strokeLinecap="round" />

      {/* body */}
      <path
        d="M44 22c5.5 1.6 9.5 6.2 9.8 11.6.2.3 1.9.6 2.8 2 .9 1.5.4 3.6-.2 4.8-.5 1-1.7 1.4-2.9 1.5-.9 2.4-2.6 4.5-4.8 6.1l.9 4.4c.2 1-.5 1.9-1.5 1.9h-3.5c-.8 0-1.5-.5-1.7-1.3l-.5-1.9c-1.6.4-3.3.6-5.1.6h-4c-1.8 0-3.5-.2-5.1-.6l-.5 1.9c-.2.8-.9 1.3-1.7 1.3h-3.5c-1 0-1.7-.9-1.5-1.9l.9-4.5c-3.9-2.9-6.4-7.1-6.4-11.8 0-2.1.5-4.1 1.4-5.9-1.6-.2-3-1.1-3.9-2.6-.4-.7.1-1.6.9-1.7 2.2-.2 4.2.8 5.4 2.5C16.9 26.8 22 24 28 24h4c1.2 0 2.4.1 3.5.3"
        fill={color} stroke={color} strokeWidth="0.5" strokeLinejoin="round" />

      {/* coin slot on the back */}
      <rect x="29" y="20" width="12" height="2.6" rx="1.3" fill={accent} opacity="0.95" />

      {/* snout */}
      <ellipse cx="50.5" cy="35" rx="4" ry="5" fill={color} />
      <circle cx="49.5" cy="34" r="1.1" fill={accent} opacity="0.6" />
      <circle cx="51.6" cy="36" r="1.1" fill={accent} opacity="0.6" />

      {/* eye */}
      <circle cx="44" cy="30" r="1.8" fill={accent} />
    </svg>
  );
}
