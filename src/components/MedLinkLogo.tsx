import React from 'react';

interface MedLinkLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'light' | 'dark' | 'color';
}

export default function MedLinkLogo({
  className = '',
  size = 'md',
  showText = true,
  variant = 'color',
}: MedLinkLogoProps) {
  // Dimensions based on size
  const dimensions = {
    sm: { width: 'w-10', height: 'h-10', iconSize: 40 },
    md: { width: 'w-16', height: 'h-16', iconSize: 64 },
    lg: { width: 'w-32', height: 'h-32', iconSize: 128 },
    xl: { width: 'w-48', height: 'h-48', iconSize: 192 },
  }[size];

  // Colors based on variant
  const colors = {
    color: {
      teal: '#0284C7',
      gold: '#0D9488',
      textMain: 'text-slate-900',
      textSub: 'text-slate-500',
    },
    light: {
      teal: '#38BDF8',
      gold: '#2DD4BF',
      textMain: 'text-white',
      textSub: 'text-slate-300',
    },
    dark: {
      teal: '#0284C7',
      gold: '#0D9488',
      textMain: 'text-slate-900',
      textSub: 'text-slate-500',
    },
  }[variant];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} id="medlink-logo-container">
      {/* High-Fidelity SVG Icon */}
      <svg
        viewBox="0 0 200 200"
        className={`${dimensions.width} ${dimensions.height} transition-all duration-300`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* CROSS: TEAL PORTION (Top, Left, and Inner Center-Left) */}
        <path
          d="M 75,55 L 110,55 L 110,95 L 140,95 L 140,110 C 120,115 105,100 95,90 C 85,80 75,70 75,55 Z"
          fill={colors.teal}
        />
        {/* Left Arm of the Teal Cross */}
        <path
          d="M 35,95 L 75,95 L 75,130 C 55,130 35,115 35,95 Z"
          fill={colors.teal}
        />

        {/* CROSS: GOLD PORTION (Bottom, Right, and Inner Center-Right) */}
        <path
          d="M 110,115 L 110,150 L 75,150 L 75,135 C 90,130 100,125 110,115 Z"
          fill={colors.gold}
        />
        {/* Right Arm of the Gold Cross */}
        <path
          d="M 110,95 L 140,95 L 140,115 C 130,115 110,105 110,95 Z"
          fill={colors.gold}
        />

        {/* STETHOSCOPE SWOOP & LOOP */}
        {/* Beautiful continuous line curving below the cross, through the center, forming a loop at the top, and coming down to the chestpiece */}
        <path
          d="M 32,112 C 32,130 55,145 75,135 C 95,125 110,108 120,95 C 135,75 145,50 120,40 C 100,32 95,50 105,75 C 115,100 125,115 145,110"
          stroke={colors.teal}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* STETHOSCOPE CHESTPIECE */}
        {/* Outer Teal Circle */}
        <circle
          cx="145"
          cy="105"
          r="14"
          fill="none"
          stroke={colors.teal}
          strokeWidth="6"
        />
        {/* Inner Gold Disc */}
        <circle
          cx="145"
          cy="105"
          r="8"
          fill={colors.gold}
        />
      </svg>

      {/* Typography Label */}
      {showText && (
        <div className="text-center mt-3 select-none">
          <h1 className={`text-2xl font-black tracking-[0.15em] uppercase font-sans ${colors.textMain}`}>
            MEDLINK
          </h1>
          <p className={`text-[9px] font-extrabold tracking-[0.25em] uppercase mt-1 ${colors.textSub}`}>
            DIGITAL HEALTH RECORD SYSTEM
          </p>
        </div>
      )}
    </div>
  );
}
