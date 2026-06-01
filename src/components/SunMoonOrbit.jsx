import React, { useState, useEffect } from 'react';
import '../styles/SunMoonOrbit.css';

const MARGIN = 16;

function positionAtDist(dist, W, H) {
  const P = 2 * (W + H);
  dist = ((dist % P) + P) % P; // normalise so moon wraps cleanly

  let x, y;
  if (dist <= W) {
    x = MARGIN + dist;
    y = MARGIN;
  } else if (dist <= W + H) {
    x = MARGIN + W;
    y = MARGIN + (dist - W);
  } else if (dist <= 2 * W + H) {
    x = MARGIN + W - (dist - W - H);
    y = MARGIN + H;
  } else {
    x = MARGIN;
    y = MARGIN + H - (dist - 2 * W - H);
  }
  return { x, y };
}

function computePositions() {
  const W = window.innerWidth  - MARGIN * 2;
  const H = window.innerHeight - MARGIN * 2;
  const P = 2 * (W + H);

  const now  = new Date();
  const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const sunDist = (secs / 86400) * P;

  return {
    sun:  positionAtDist(sunDist,         W, H),
    moon: positionAtDist(sunDist + P / 2, W, H), // always opposite
  };
}

function SunIcon() {
  return (
    <svg viewBox="0 0 36 36" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="7" fill="#FFD94A" />
      {[0,45,90,135,180,225,270,315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 18 + 10 * Math.cos(rad);
        const y1 = 18 + 10 * Math.sin(rad);
        const x2 = 18 + 14 * Math.cos(rad);
        const y2 = 18 + 14 * Math.sin(rad);
        return (
          <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#FFD94A" strokeWidth="2.5" strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 36 36" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="moon-crescent">
          <circle cx="18" cy="18" r="11" fill="white" />
          <circle cx="23" cy="14" r="9"   fill="black" />
        </mask>
      </defs>
      {/* base disc */}
      <circle cx="18" cy="18" r="11" fill="#6b7280" mask="url(#moon-crescent)" />
      {/* subtle surface shading */}
      <circle cx="18" cy="18" r="11" fill="url(#moon-shade)" mask="url(#moon-crescent)" opacity="0.4" />
      <defs>
        <radialGradient id="moon-shade" cx="35%" cy="35%" r="65%">
          <stop offset="0%"  stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#374151" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function SunMoonOrbit({ theme }) {
  const [pos, setPos] = useState(() => computePositions());

  useEffect(() => {
    const tick = () => setPos(computePositions());
    const id = setInterval(tick, 1000);
    window.addEventListener('resize', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', tick);
    };
  }, []);

  const isDay = theme === 'apollo';

  return (
    <div className="sun-moon-orbit" aria-hidden="true">
      <div className={`orbit-track ${isDay ? 'orbit-track--day' : 'orbit-track--night'}`} />

      {/* Sun — always on track, primary when day */}
      <span className={`orbit-icon orbit-icon--sun ${isDay ? 'is-primary' : 'is-secondary'}`}
        style={{ left: pos.sun.x, top: pos.sun.y }}>
        <SunIcon />
      </span>

      {/* Moon — always on track, primary when night */}
      <span className={`orbit-icon orbit-icon--moon ${!isDay ? 'is-primary' : 'is-secondary'}`}
        style={{ left: pos.moon.x, top: pos.moon.y }}>
        <MoonIcon />
      </span>
    </div>
  );
}
