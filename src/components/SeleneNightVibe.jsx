import React from 'react';

const DEFAULT_ORB_COLORS = ['#c200ff', '#8f00ff'];
const ORB_LAYOUTS = [
  { top: '5%', left: '68%', size: 'clamp(84px, 11vw, 146px)', duration: '6s', delay: '0s' },
  { top: '18%', left: '14%', size: 'clamp(70px, 9vw, 124px)', duration: '7.4s', delay: '0.7s' },
  { top: '34%', left: '76%', size: 'clamp(58px, 8vw, 108px)', duration: '8.2s', delay: '0.3s' },
  { top: '52%', left: '22%', size: 'clamp(66px, 9vw, 118px)', duration: '7.1s', delay: '1.2s' },
  { top: '62%', left: '84%', size: 'clamp(56px, 8vw, 98px)', duration: '8.8s', delay: '0.9s' },
  { top: '12%', left: '48%', size: 'clamp(50px, 7vw, 88px)', duration: '9.6s', delay: '0.5s' },
];

const clampOrbCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(6, parsed));
};

const toRgbTuple = (hex) => {
  if (typeof hex !== 'string') return [194, 0, 255];
  const cleaned = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return [194, 0, 255];
  return [
    Number.parseInt(cleaned.slice(0, 2), 16),
    Number.parseInt(cleaned.slice(2, 4), 16),
    Number.parseInt(cleaned.slice(4, 6), 16),
  ];
};

const lighten = (value, amount) => Math.max(0, Math.min(255, Math.round(value + (255 - value) * amount)));
const darken = (value, amount) => Math.max(0, Math.min(255, Math.round(value * (1 - amount))));

const rgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

const getOrbColor = (siteContent, index) => {
  const key = `selene_orb_${index + 1}_color`;
  const fallback = DEFAULT_ORB_COLORS[index % DEFAULT_ORB_COLORS.length];
  const raw = siteContent?.[key] || fallback;
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
};

const buildOrbStyle = (hexColor, index) => {
  const base = toRgbTuple(hexColor);
  const light = [lighten(base[0], 0.55), lighten(base[1], 0.55), lighten(base[2], 0.55)];
  const dark = [darken(base[0], 0.36), darken(base[1], 0.36), darken(base[2], 0.36)];
  const glow = [lighten(base[0], 0.2), lighten(base[1], 0.2), lighten(base[2], 0.2)];
  const layout = ORB_LAYOUTS[index % ORB_LAYOUTS.length];

  return {
    top: layout.top,
    left: layout.left,
    width: layout.size,
    animationDuration: layout.duration,
    animationDelay: layout.delay,
    '--orb-light': rgba(light, 0.95),
    '--orb-dark': rgba(dark, 0.82),
    '--orb-ring': rgba(glow, 0.55),
    '--orb-glow-soft': rgba(base, 0.65),
    '--orb-glow-strong': rgba(dark, 0.4),
    '--orb-reflection': rgba(light, 0.9),
    '--orb-reflection-glow': rgba(base, 0.6),
  };
};

const SeleneNightVibe = ({ siteContent = {} }) => {
  const orbCount = clampOrbCount(siteContent.selene_orb_count);
  const orbItems = Array.from({ length: orbCount }, (_, index) => ({
    color: getOrbColor(siteContent, index),
    style: buildOrbStyle(getOrbColor(siteContent, index), index),
    key: `selene-orb-${index}`,
  }));

  return (
    <div className="selene-nightclub-bg" aria-hidden="true">
      {orbItems.map((orb) => (
        <div className="disco-orb" key={orb.key} style={orb.style}>
          <span className="disco-core" />
          <span className="disco-reflection disco-reflection--one" />
          <span className="disco-reflection disco-reflection--two" />
          <span className="disco-reflection disco-reflection--three" />
        </div>
      ))}

      <div className="club-beams">
        <span className="club-beam club-beam--one" />
        <span className="club-beam club-beam--two" />
        <span className="club-beam club-beam--three" />
        <span className="club-beam club-beam--four" />
        <span className="club-beam club-beam--five" />
      </div>

      <div className="club-flares">
        <span className="club-flare club-flare--one" />
        <span className="club-flare club-flare--two" />
        <span className="club-flare club-flare--three" />
      </div>

      <div className="neon-scanners">
        <span className="neon-scanner neon-scanner--one" />
        <span className="neon-scanner neon-scanner--two" />
        <span className="neon-scanner neon-scanner--three" />
        <span className="neon-scanner neon-scanner--four" />
      </div>

      <div className="club-dj-stage">
        <div className="club-dj-booth">
          <span className="dj-console-light dj-console-light--one" />
          <span className="dj-console-light dj-console-light--two" />
          <span className="dj-console-light dj-console-light--three" />
        </div>
        <div className="club-dj-silhouette">
          <span className="dj-head" />
          <span className="dj-body" />
        </div>
        <div className="club-crowd">
          <span className="club-crowd-wave club-crowd-wave--one" />
          <span className="club-crowd-wave club-crowd-wave--two" />
        </div>
      </div>
    </div>
  );
};

export default SeleneNightVibe;
