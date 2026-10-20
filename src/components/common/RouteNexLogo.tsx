import React from 'react';

interface RouteNexLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textSize?: string;
}

export default function RouteNexLogo({
  className = 'w-7 h-7',
  size = 28,
  showText = false,
  textSize = 'text-sm',
}: RouteNexLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/logo.png"
        alt="RouteNex"
        width={size}
        height={size}
        className={`${className} object-contain rounded-lg shrink-0`}
      />
      {showText && (
        <span className={`font-bold tracking-tight text-zinc-100 font-sans ${textSize}`}>
          RouteNex
        </span>
      )}
    </div>
  );
}
