'use client';

import React from 'react';

interface LakhanAvatarProps {
  className?: string;
  size?: number;
}

export default function LakhanAvatar({ className = '', size = 52 }: LakhanAvatarProps) {
  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 bg-[#FEEBC8] border-2 border-white shadow-xs flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label="Delivery Partner Lakhan"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Warm round backdrop */}
        <circle cx="50" cy="50" r="50" fill="#FEEBC8" />

        {/* Shoulders & Polo Shirt (Blinkit Yellow) */}
        <path
          d="M18 100 C18 78, 30 70, 50 70 C70 70, 82 78, 82 100 Z"
          fill="#F6B819"
        />
        {/* Collar details */}
        <path
          d="M42 70 L50 82 L58 70 Z"
          fill="#E09F07"
        />
        <path
          d="M36 70 L46 76 L50 82 L42 70"
          fill="#D69403"
        />
        <path
          d="M64 70 L54 76 L50 82 L58 70"
          fill="#D69403"
        />

        {/* Neck */}
        <rect x="44" y="60" width="12" height="14" rx="3" fill="#E8A87C" />

        {/* Face */}
        <ellipse cx="50" cy="48" rx="18" ry="20" fill="#F7C59F" />

        {/* Ears */}
        <circle cx="31" cy="48" r="4.5" fill="#E8A87C" />
        <circle cx="69" cy="48" r="4.5" fill="#E8A87C" />

        {/* Hair sides */}
        <path
          d="M31 43 C31 36, 36 33, 40 33 C40 38, 35 43, 31 43 Z"
          fill="#2D2424"
        />
        <path
          d="M69 43 C69 36, 64 33, 60 33 C60 38, 65 43, 69 43 Z"
          fill="#2D2424"
        />

        {/* Eyebrows */}
        <path
          d="M40 40 Q44 38 47 40"
          stroke="#4A3427"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M53 40 Q56 38 60 40"
          stroke="#4A3427"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyes (Smiling & friendly) */}
        <circle cx="43.5" cy="45" r="2.2" fill="#241B15" />
        <circle cx="56.5" cy="45" r="2.2" fill="#241B15" />
        <circle cx="44.2" cy="44.3" r="0.7" fill="#FFFFFF" />
        <circle cx="57.2" cy="44.3" r="0.7" fill="#FFFFFF" />

        {/* Soft blush */}
        <ellipse cx="38" cy="50" rx="3" ry="1.5" fill="#F29F80" opacity="0.5" />
        <ellipse cx="62" cy="50" rx="3" ry="1.5" fill="#F29F80" opacity="0.5" />

        {/* Nose */}
        <path
          d="M50 46 L48.5 51 L51.5 51"
          stroke="#D48A62"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Smile (Happy open smile) */}
        <path
          d="M44 55 Q50 62 56 55"
          stroke="#8A3B24"
          strokeWidth="2"
          strokeLinecap="round"
          fill="#FFFFFF"
        />

        {/* Delivery Cap (Yellow with peak) */}
        {/* Cap Dome */}
        <path
          d="M31 35 C31 20, 69 20, 69 35 Z"
          fill="#F6B819"
        />
        {/* Cap Visor / Peak */}
        <path
          d="M26 35 C28 32, 45 31, 74 35 C71 39, 45 40, 26 35 Z"
          fill="#D69403"
        />
        {/* Cap Emblem / Badge */}
        <circle cx="50" cy="27" r="3.5" fill="#FFFFFF" opacity="0.9" />
        <circle cx="50" cy="27" r="1.8" fill="#15803D" />
      </svg>
    </div>
  );
}

