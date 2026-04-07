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

      <path d="M46 56c4-7 10-11 14-11s10 4 14 11l-2 10H48l-2-10z" fill="url(#apolloHair)" />
      <path d="M49 51c5-5 8-7 11-7 4 0 8 2 11 7" fill="none" stroke="#fef0c0" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <circle cx="60" cy="59" r="11.5" fill="url(#apolloSkin)" />
      <path d="M53 59h4M63 59h4" stroke="#7f3f18" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M56 65c1.2 1.4 2.5 2.1 4 2.1 1.5 0 2.8-.7 4-2.1" fill="none" stroke="#9b4d1d" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 60v2.8" stroke="#c27847" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M48 67c-5 6-7 10-9 17m33-17c5 6 7 10 9 17" fill="none" stroke="#efb56d" strokeWidth="4" strokeLinecap="round" />

      <path d="M44 64c4-6 11-10 16-10s12 4 16 10l8 42c2 12-8 22-24 22s-26-10-24-22l8-42z" fill="url(#apolloDrape)" />
      <path d="M42 84c7-4 13-6 18-6 6 0 12 2 18 6" fill="none" stroke="#fff4dc" strokeWidth="3" strokeLinecap="round" opacity="0.82" />
      <path d="M46 94c5 3 9 4 14 4 6 0 10-1 14-4" fill="none" stroke="#ffd8aa" strokeWidth="2.6" strokeLinecap="round" opacity="0.75" />
    </g>

    <g className="guide-arrow-bounce" fill="none" stroke="#b8561e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 118v21" />
      <path d="M49 129l11 11 11-11" />
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

      <path d="M47 56c4-8 8-12 13-12 5 0 10 4 13 12l-2 11H49l-2-11z" fill="url(#seleneHair)" />
      <path d="M47 52c5-4 9-6 13-6 4 0 8 2 13 6" fill="none" stroke="#f7fbff" strokeWidth="2.6" strokeLinecap="round" opacity="0.82" />
      <circle cx="60" cy="60" r="11.5" fill="url(#seleneSkin)" />
      <path d="M53.5 59h4M62.5 59h4" stroke="#20324d" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 65c1 1.4 2.3 2.1 4 2.1 1.7 0 3-.7 4-2.1" fill="none" stroke="#324b72" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60 60v2.8" stroke="#7d97bf" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M48 68c-5 6-8 10-10 17m34-17c5 6 8 10 10 17" fill="none" stroke="#91a9d0" strokeWidth="4" strokeLinecap="round" />

      <path d="M44 64c4-7 10-10 16-10s12 3 16 10l8 42c2 12-8 22-24 22s-26-10-24-22l8-42z" fill="url(#seleneDrape)" />
      <path d="M43 85c7-4 13-6 17-6 5 0 11 2 17 6" fill="none" stroke="#f6f9ff" strokeWidth="2.8" strokeLinecap="round" opacity="0.82" />
      <path d="M48 97c4 2.5 8 3.5 12 3.5 5 0 9-1 12-3.5" fill="none" stroke="#c6d5ef" strokeWidth="2.4" strokeLinecap="round" opacity="0.72" />
    </g>

    <g className="guide-arrow-bounce" fill="none" stroke="#c8d7f4" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 118v21" />
      <path d="M49 129l11 11 11-11" />
    </g>
  </svg>
);

const MobileScrollGuide = ({ theme, compact = false }) => {
  return theme === 'apollo' ? <ApolloGuide compact={compact} /> : <SeleneGuide compact={compact} />;
};

export default MobileScrollGuide;
