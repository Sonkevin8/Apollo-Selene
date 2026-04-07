import React from 'react';

const ApolloGuide = ({ compact }) => (
  <svg
    className={`mobile-scroll-guide-svg${compact ? ' mobile-scroll-guide-svg--compact' : ''}`}
    viewBox="0 0 120 156"
    role="img"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="apolloCore" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff4cf" />
        <stop offset="55%" stopColor="#f2b85e" />
        <stop offset="100%" stopColor="#bf5d22" />
      </linearGradient>
      <linearGradient id="apolloDrape" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fff1d9" />
        <stop offset="100%" stopColor="#e5943a" />
      </linearGradient>
      <filter id="apolloGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="apolloSkin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffe6c8" />
        <stop offset="100%" stopColor="#f3b981" />
      </linearGradient>
      <linearGradient id="apolloHair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff4c4" />
        <stop offset="100%" stopColor="#d77429" />
      </linearGradient>
    </defs>

    <g className="guide-spark guide-spark--one">
      <circle cx="18" cy="20" r="2.2" fill="#ffd68d" />
      <path d="M18 12v5M18 23v5M10 20h5M21 20h5" stroke="#ffd68d" strokeWidth="2.2" strokeLinecap="round" />
    </g>
    <g className="guide-spark guide-spark--two">
      <circle cx="101" cy="46" r="1.8" fill="#ffc46b" />
      <path d="M101 39v4M101 49v4M94 46h4M104 46h4" stroke="#ffc46b" strokeWidth="2" strokeLinecap="round" />
    </g>

    <g className="guide-float">
      <g className="guide-halo" filter="url(#apolloGlow)">
        <circle cx="60" cy="34" r="20" fill="url(#apolloCore)" />
        <g fill="#d9742d">
          <rect x="58" y="1" width="4" height="14" rx="2" />
          <rect x="58" y="53" width="4" height="14" rx="2" />
          <rect x="27" y="32" width="14" height="4" rx="2" />
          <rect x="79" y="32" width="14" height="4" rx="2" />
          <rect x="37" y="11" width="4" height="14" rx="2" transform="rotate(-45 39 18)" />
          <rect x="79" y="47" width="4" height="14" rx="2" transform="rotate(-45 81 54)" />
          <rect x="80" y="11" width="4" height="14" rx="2" transform="rotate(45 82 18)" />
          <rect x="36" y="47" width="4" height="14" rx="2" transform="rotate(45 38 54)" />
        </g>
      </g>

      <path
        d="M46 56c4-7 10-11 14-11s10 4 14 11l-2 10H48l-2-10z"
        fill="url(#apolloHair)"
      />
      <path
        d="M46 57c5-8 9-12 14-12 4 0 9 4 14 12"
        fill="none"
        stroke="#c96826"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M49 51c5-5 8-7 11-7 4 0 8 2 11 7"
        fill="none"
        stroke="#fef0c0"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="60" cy="59" r="11.5" fill="url(#apolloSkin)" />
      <ellipse cx="55" cy="59" rx="3.2" ry="2.2" fill="#fff8ef" opacity="0.95" />
      <ellipse cx="65" cy="59" rx="3.2" ry="2.2" fill="#fff8ef" opacity="0.95" />
      <circle cx="55.4" cy="59.4" r="1.2" fill="#7f3f18" />
      <circle cx="64.6" cy="59.4" r="1.2" fill="#7f3f18" />
      <path d="M51.5 55.5c1.5-1.1 2.9-1.6 4.1-1.6 1.2 0 2.5.5 3.8 1.6" fill="none" stroke="#8b4318" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M60 59.8v3.3" stroke="#c27847" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M57.2 64.8c.9.8 1.8 1.2 2.8 1.2 1.1 0 2-.4 2.9-1.2" fill="none" stroke="#9b4d1d" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M48 67c-4 5-6 9-7 13m31-13c4 5 6 9 7 13" fill="none" stroke="#efb56d" strokeWidth="4" strokeLinecap="round" />

      <path
        d="M44 64c4-6 11-10 16-10s12 4 16 10l8 42c2 12-8 22-24 22s-26-10-24-22l8-42z"
        fill="url(#apolloDrape)"
      />
      <path
        d="M42 84c7-4 13-6 18-6 6 0 12 2 18 6"
        fill="none"
        stroke="#fff4dc"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.82"
      />
      <path
        d="M46 94c5 3 9 4 14 4 6 0 10-1 14-4"
        fill="none"
        stroke="#ffd8aa"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M48 70c2 6 7 10 12 10s10-4 12-10"
        fill="none"
        stroke="#7f3f18"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="53" cy="64" r="2.2" fill="#7f3f18" />
      <circle cx="67" cy="64" r="2.2" fill="#7f3f18" />
      <path
        d="M44 78c6 5 12 8 16 8s10-3 16-8"
        fill="none"
        stroke="#fff5e6"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />

      <g className="guide-pointer-bounce">
        <g className="guide-wave-arm">
          <path d="M45 87c-7-6-10.8-12.6-12.2-20" fill="none" stroke="#e7a04d" strokeWidth="4.8" strokeLinecap="round" />
          <path d="M32.8 67c-.2-5.6 1.1-10 4.2-13.6" fill="none" stroke="#f6c78d" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M37.4 53.6c2.4-.8 4.9-.7 7.3.2" fill="none" stroke="#f6c78d" strokeWidth="3.7" strokeLinecap="round" />
          <path d="M37.4 53.6c-1.8-1.7-2.9-3.3-3.5-5" fill="none" stroke="#f6c78d" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M37.4 53.6c-.6 2.2-.4 4.2.5 6" fill="none" stroke="#f6c78d" strokeWidth="3.1" strokeLinecap="round" />
          <path d="M40 51.8c1.2-2 2.5-3.1 4-3.6" fill="none" stroke="#f6c78d" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M41.7 53.2c1.4-1.3 3-2 4.7-2.2" fill="none" stroke="#f6c78d" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M42.5 55c1.6-.6 3.3-.7 5.1-.4" fill="none" stroke="#f6c78d" strokeWidth="2" strokeLinecap="round" />
          <path d="M41.8 56.9c1.4.1 2.9.5 4.3 1.2" fill="none" stroke="#f6c78d" strokeWidth="2" strokeLinecap="round" />
          <path d="M40.4 58.3c1.1.5 2.2 1.3 3.2 2.2" fill="none" stroke="#f6c78d" strokeWidth="1.9" strokeLinecap="round" />
        </g>
        <g className="guide-point-arm">
          <path d="M75 86c4.4 6.8 6.8 12.2 7.4 17.2" fill="none" stroke="#e7a04d" strokeWidth="4.8" strokeLinecap="round" />
          <path d="M82.4 103.2c.4 4.4-.8 8.7-3.6 13" fill="none" stroke="#f6c78d" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M78.8 116.2c-.6 3.4-.7 6.6-.4 9.8" fill="none" stroke="#f6c78d" strokeWidth="3.8" strokeLinecap="round" />
          <path d="M78.5 124.2c-.1 4 .1 7.3.4 10.1" fill="none" stroke="#f6c78d" strokeWidth="3.7" strokeLinecap="round" />
          <path d="M79 134.3c0 3.2.1 5.8.2 7.8" fill="none" stroke="#f6c78d" strokeWidth="3.1" strokeLinecap="round" />
          <path d="M79.3 142.1c.2 5 .3 8.8.2 11.5" fill="none" stroke="#f6c78d" strokeWidth="2.9" strokeLinecap="round" />
          <path d="M79.3 141.1c2-.9 3.6-1.3 5-1.3" fill="none" stroke="#f6c78d" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M79.1 138.6c-1.1.2-2.3.1-3.5-.2" fill="none" stroke="#f6c78d" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M79.2 136.6c-1.4.7-2.8 1.1-4.4 1.2" fill="none" stroke="#f6c78d" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M79.3 140c-1.3 0-2.7.3-4 .8" fill="none" stroke="#f6c78d" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M79.3 143.1c-1 .2-2.1.7-3.3 1.5" fill="none" stroke="#f6c78d" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    </g>
  </svg>
);

const SeleneGuide = ({ compact }) => (
  <svg
    className={`mobile-scroll-guide-svg${compact ? ' mobile-scroll-guide-svg--compact' : ''}`}
    viewBox="0 0 120 156"
    role="img"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="seleneGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#c8d7f4" />
        <stop offset="100%" stopColor="#7693c0" />
      </linearGradient>
      <linearGradient id="seleneDrape" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#e7eefc" />
        <stop offset="100%" stopColor="#6c86b1" />
      </linearGradient>
      <filter id="seleneMist" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="seleneSkin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f4f7ff" />
        <stop offset="100%" stopColor="#c3d2eb" />
      </linearGradient>
      <linearGradient id="seleneHair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#eef3ff" />
        <stop offset="100%" stopColor="#6f87af" />
      </linearGradient>
    </defs>

    <g className="guide-spark guide-spark--three">
      <circle cx="23" cy="18" r="1.9" fill="#e9f0ff" />
      <path d="M23 11v4M23 21v4M16 18h4M26 18h4" stroke="#e9f0ff" strokeWidth="2" strokeLinecap="round" />
    </g>
    <g className="guide-spark guide-spark--four">
      <circle cx="96" cy="50" r="1.7" fill="#dbe7ff" />
      <path d="M96 44v4M96 53v4M90 50h4M99 50h4" stroke="#dbe7ff" strokeWidth="1.8" strokeLinecap="round" />
    </g>

    <g className="guide-float">
      <g className="guide-halo" filter="url(#seleneMist)">
        <circle cx="58" cy="34" r="19" fill="url(#seleneGlow)" />
        <circle cx="66" cy="29" r="19" fill="#111b31" opacity="0.92" />
        <circle cx="87" cy="20" r="2" fill="#eaf2ff" />
        <circle cx="92" cy="29" r="1.8" fill="#eaf2ff" />
        <circle cx="29" cy="25" r="1.8" fill="#eaf2ff" />
      </g>

      <path
        d="M47 56c4-8 8-12 13-12 5 0 10 4 13 12l-2 11H49l-2-11z"
        fill="url(#seleneHair)"
      />
      <path
        d="M47 57c4-8 8-12 13-12 5 0 9 4 13 12"
        fill="none"
        stroke="#5d7297"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M47 52c5-4 9-6 13-6 4 0 8 2 13 6"
        fill="none"
        stroke="#f7fbff"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.82"
      />
      <circle cx="60" cy="60" r="11.5" fill="url(#seleneSkin)" />
      <ellipse cx="55.2" cy="59.5" rx="3.2" ry="2.2" fill="#f9fbff" opacity="0.95" />
      <ellipse cx="64.8" cy="59.5" rx="3.2" ry="2.2" fill="#f9fbff" opacity="0.95" />
      <circle cx="55.6" cy="59.8" r="1.15" fill="#20324d" />
      <circle cx="64.4" cy="59.8" r="1.15" fill="#20324d" />
      <path d="M51.8 55.7c1.2-.9 2.4-1.3 3.6-1.3 1.3 0 2.6.4 4 1.3" fill="none" stroke="#344b72" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M60 60.2v3.1" stroke="#7d97bf" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M56.8 65.1c.9.7 2 .9 3.2.9 1.2 0 2.2-.2 3.2-.9" fill="none" stroke="#324b72" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M48 68c-4 5-6.5 9-8 14m32-14c4 5 6.5 9 8 14" fill="none" stroke="#91a9d0" strokeWidth="4" strokeLinecap="round" />

      <path
        d="M44 64c4-7 10-10 16-10s12 3 16 10l8 42c2 12-8 22-24 22s-26-10-24-22l8-42z"
        fill="url(#seleneDrape)"
      />
      <path
        d="M43 85c7-4 13-6 17-6 5 0 11 2 17 6"
        fill="none"
        stroke="#f6f9ff"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity="0.82"
      />
      <path
        d="M48 97c4 2.5 8 3.5 12 3.5 5 0 9-1 12-3.5"
        fill="none"
        stroke="#c6d5ef"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M48 70c2 5 7 9 12 9s10-4 12-9"
        fill="none"
        stroke="#20324d"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="53" cy="64" r="2.2" fill="#20324d" />
      <circle cx="67" cy="64" r="2.2" fill="#20324d" />
      <path
        d="M45 81c6 4 11 6 15 6 5 0 10-2 15-6"
        fill="none"
        stroke="#f4f8ff"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />

      <g className="guide-pointer-bounce">
        <g className="guide-wave-arm">
          <path d="M45 87c-7-6-10.8-12.6-12.2-20" fill="none" stroke="#88a1ca" strokeWidth="4.8" strokeLinecap="round" />
          <path d="M32.8 67c-.2-5.6 1.1-10 4.2-13.6" fill="none" stroke="#d8e4f8" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M37.4 53.6c2.4-.8 4.9-.7 7.3.2" fill="none" stroke="#d8e4f8" strokeWidth="3.7" strokeLinecap="round" />
          <path d="M37.4 53.6c-1.8-1.7-2.9-3.3-3.5-5" fill="none" stroke="#d8e4f8" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M37.4 53.6c-.6 2.2-.4 4.2.5 6" fill="none" stroke="#d8e4f8" strokeWidth="3.1" strokeLinecap="round" />
          <path d="M40 51.8c1.2-2 2.5-3.1 4-3.6" fill="none" stroke="#d8e4f8" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M41.7 53.2c1.4-1.3 3-2 4.7-2.2" fill="none" stroke="#d8e4f8" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M42.5 55c1.6-.6 3.3-.7 5.1-.4" fill="none" stroke="#d8e4f8" strokeWidth="2" strokeLinecap="round" />
          <path d="M41.8 56.9c1.4.1 2.9.5 4.3 1.2" fill="none" stroke="#d8e4f8" strokeWidth="2" strokeLinecap="round" />
          <path d="M40.4 58.3c1.1.5 2.2 1.3 3.2 2.2" fill="none" stroke="#d8e4f8" strokeWidth="1.9" strokeLinecap="round" />
        </g>
        <g className="guide-point-arm">
          <path d="M75 86c4.4 6.8 6.8 12.2 7.4 17.2" fill="none" stroke="#88a1ca" strokeWidth="4.8" strokeLinecap="round" />
          <path d="M82.4 103.2c.4 4.4-.8 8.7-3.6 13" fill="none" stroke="#d8e4f8" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M78.8 116.2c-.6 3.4-.7 6.6-.4 9.8" fill="none" stroke="#d8e4f8" strokeWidth="3.8" strokeLinecap="round" />
          <path d="M78.5 124.2c-.1 4 .1 7.3.4 10.1" fill="none" stroke="#d8e4f8" strokeWidth="3.7" strokeLinecap="round" />
          <path d="M79 134.3c0 3.2.1 5.8.2 7.8" fill="none" stroke="#d8e4f8" strokeWidth="3.1" strokeLinecap="round" />
          <path d="M79.3 142.1c.2 5 .3 8.8.2 11.5" fill="none" stroke="#d8e4f8" strokeWidth="2.9" strokeLinecap="round" />
          <path d="M79.3 141.1c2-.9 3.6-1.3 5-1.3" fill="none" stroke="#d8e4f8" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M79.1 138.6c-1.1.2-2.3.1-3.5-.2" fill="none" stroke="#d8e4f8" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M79.2 136.6c-1.4.7-2.8 1.1-4.4 1.2" fill="none" stroke="#d8e4f8" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M79.3 140c-1.3 0-2.7.3-4 .8" fill="none" stroke="#d8e4f8" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M79.3 143.1c-1 .2-2.1.7-3.3 1.5" fill="none" stroke="#d8e4f8" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    </g>
  </svg>
);

const MobileScrollGuide = ({ theme, compact = false }) => {
  return theme === 'apollo' ? <ApolloGuide compact={compact} /> : <SeleneGuide compact={compact} />;
};

export default MobileScrollGuide;