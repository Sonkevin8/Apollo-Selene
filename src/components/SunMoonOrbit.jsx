import React, { useState, useEffect } from 'react';
import '../styles/SunMoonOrbit.css';

const MARGIN = 16; // px from viewport edge

function computePosition() {
  const W = window.innerWidth - MARGIN * 2;
  const H = window.innerHeight - MARGIN * 2;
  const P = 2 * (W + H);

  const now = new Date();
  const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const fraction = secs / 86400;
  const dist = fraction * P;

  let x, y;
  if (dist <= W) {
    // Top edge: left → right (midnight → ~6am-ish depending on aspect ratio)
    x = MARGIN + dist;
    y = MARGIN;
  } else if (dist <= W + H) {
    // Right edge: top → bottom
    x = MARGIN + W;
    y = MARGIN + (dist - W);
  } else if (dist <= 2 * W + H) {
    // Bottom edge: right → left
    x = MARGIN + W - (dist - W - H);
    y = MARGIN + H;
  } else {
    // Left edge: bottom → top
    x = MARGIN;
    y = MARGIN + H - (dist - 2 * W - H);
  }

  return { x, y };
}

export default function SunMoonOrbit({ theme }) {
  const [pos, setPos] = useState(() => computePosition());

  useEffect(() => {
    const tick = () => setPos(computePosition());
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
      <span
        className={`orbit-icon ${isDay ? 'orbit-icon--sun' : 'orbit-icon--moon'}`}
        style={{ left: pos.x, top: pos.y }}
      >
        {isDay ? '☀️' : '🌙'}
      </span>
    </div>
  );
}
