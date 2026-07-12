import React from 'react';

const DEFAULT_ORB_COLORS = ['#c200ff', '#8f00ff'];
const DEFAULT_BLUR_ORB_COLORS = ['#c200ff', '#b400ff', '#db3fff', '#8f00ff'];
const ORB_LAYOUTS = [
  { top: '5%', left: '68%', size: 'clamp(84px, 11vw, 146px)', duration: '6s', delay: '0s' },
  { top: '18%', left: '14%', size: 'clamp(70px, 9vw, 124px)', duration: '7.4s', delay: '0.7s' },
  { top: '34%', left: '76%', size: 'clamp(58px, 8vw, 108px)', duration: '8.2s', delay: '0.3s' },
  { top: '52%', left: '22%', size: 'clamp(66px, 9vw, 118px)', duration: '7.1s', delay: '1.2s' },
  { top: '62%', left: '84%', size: 'clamp(56px, 8vw, 98px)', duration: '8.8s', delay: '0.9s' },
  { top: '12%', left: '48%', size: 'clamp(50px, 7vw, 88px)', duration: '9.6s', delay: '0.5s' },
];

const BLUR_ORB_LAYOUTS = [
  { top: '18%', size: 'clamp(80px, 14vw, 200px)', duration: '9s', delay: '0s', direction: 'normal' },
  { top: '42%', size: 'clamp(60px, 10vw, 140px)', duration: '12s', delay: '2.5s', direction: 'reverse' },
  { top: '65%', size: 'clamp(50px, 8vw, 110px)', duration: '7s', delay: '1s', direction: 'normal' },
  { top: '8%', size: 'clamp(90px, 16vw, 220px)', duration: '14s', delay: '4s', direction: 'reverse' },
  { top: '28%', size: 'clamp(68px, 11vw, 156px)', duration: '10.5s', delay: '1.7s', direction: 'normal' },
  { top: '54%', size: 'clamp(74px, 12vw, 168px)', duration: '11.8s', delay: '0.9s', direction: 'reverse' },
];

const clampOrbCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(6, parsed));
};

const clampBlurOrbCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 4;
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

const getBlurOrbColor = (siteContent, index) => {
  const key = `selene_blur_orb_${index + 1}_color`;
  const fallback = DEFAULT_BLUR_ORB_COLORS[index % DEFAULT_BLUR_ORB_COLORS.length];
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

const buildBlurOrbStyle = (hexColor, index) => {
  const base = toRgbTuple(hexColor);
  const bright = [lighten(base[0], 0.3), lighten(base[1], 0.3), lighten(base[2], 0.3)];
  const fade = [darken(base[0], 0.18), darken(base[1], 0.18), darken(base[2], 0.18)];
  const layout = BLUR_ORB_LAYOUTS[index % BLUR_ORB_LAYOUTS.length];

  return {
    top: layout.top,
    width: layout.size,
    height: layout.size,
    animationDuration: layout.duration,
    animationDelay: layout.delay,
    animationDirection: layout.direction,
    '--scanner-core': rgba(bright, 0.84),
    '--scanner-fade': rgba(fade, 0.08),
    '--scanner-glow': rgba(base, 0.34),
  };
};

const SeleneNightVibe = ({ siteContent = {} }) => {
  const orbCount = clampOrbCount(siteContent.selene_orb_count);
  const blurOrbCount = clampBlurOrbCount(siteContent.selene_blur_orb_count);
  const orbItems = Array.from({ length: orbCount }, (_, index) => ({
    style: buildOrbStyle(getOrbColor(siteContent, index), index),
    key: `selene-orb-${index}`,
  }));
  const blurOrbItems = Array.from({ length: blurOrbCount }, (_, index) => ({
    style: buildBlurOrbStyle(getBlurOrbColor(siteContent, index), index),
    key: `selene-blur-orb-${index}`,
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
        {blurOrbItems.map((blurOrb) => (
          <span className="neon-scanner" key={blurOrb.key} style={blurOrb.style} />
        ))}
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
