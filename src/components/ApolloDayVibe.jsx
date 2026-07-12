import React from 'react';

const DEFAULT_CLOUD_COLORS = ['#ffffff', '#fff7ea', '#ffeccf'];
const CLOUD_LAYOUTS = [
  { top: '8%', left: '-18%', width: 'clamp(110px, 16vw, 196px)', opacity: 0.9, animation: 'apollo-cloud-drift 27s linear infinite 0s' },
  { top: '20%', left: '-42%', width: 'clamp(96px, 14vw, 170px)', opacity: 0.66, animation: 'apollo-cloud-drift 35s linear infinite 4s' },
  { top: '34%', left: '-8%', width: 'clamp(92px, 13vw, 162px)', opacity: 0.62, animation: 'apollo-cloud-drift 30s linear infinite 2s' },
  { top: '46%', left: '-30%', width: 'clamp(88px, 12vw, 156px)', opacity: 0.56, animation: 'apollo-cloud-drift 38s linear infinite 6s' },
  { top: '60%', left: '-16%', width: 'clamp(98px, 14vw, 172px)', opacity: 0.54, animation: 'apollo-cloud-drift 29s linear infinite 3s' },
  { top: '72%', left: '-38%', width: 'clamp(86px, 12vw, 150px)', opacity: 0.5, animation: 'apollo-cloud-drift 41s linear infinite 9s' },
];

// Distribute early clouds across the scene so low counts still look scattered.
const CLOUD_RENDER_ORDER = [0, 1, 4, 2, 3, 5];

const clampCloudCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(6, parsed));
};

const toRgbTuple = (hex) => {
  if (typeof hex !== 'string') return [255, 255, 255];
  const cleaned = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return [255, 255, 255];
  return [
    Number.parseInt(cleaned.slice(0, 2), 16),
    Number.parseInt(cleaned.slice(2, 4), 16),
    Number.parseInt(cleaned.slice(4, 6), 16),
  ];
};

const rgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

const getCloudColor = (siteContent, index) => {
  const key = `apollo_cloud_${index + 1}_color`;
  const fallback = DEFAULT_CLOUD_COLORS[index % DEFAULT_CLOUD_COLORS.length];
  const raw = siteContent?.[key] || fallback;
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
};

const buildCloudStyle = (hexColor, layoutIndex) => {
  const layout = CLOUD_LAYOUTS[layoutIndex % CLOUD_LAYOUTS.length];
  const base = toRgbTuple(hexColor);
  return {
    top: layout.top,
    left: layout.left,
    width: layout.width,
    opacity: layout.opacity,
    animation: layout.animation,
    '--cloud-base': rgba(base, 0.58),
    '--cloud-shadow-a': rgba(base, 0.54),
    '--cloud-shadow-b': rgba(base, 0.46),
    '--cloud-shadow-c': rgba(base, 0.52),
  };
};

const ApolloDayVibe = ({ siteContent = {} }) => {
  const cloudCount = clampCloudCount(siteContent.apollo_cloud_count);
  const clouds = Array.from({ length: cloudCount }, (_, index) => ({
    key: `apollo-cloud-${index}`,
    style: buildCloudStyle(
      getCloudColor(siteContent, index),
      CLOUD_RENDER_ORDER[index % CLOUD_RENDER_ORDER.length],
    ),
  }));

  return (
    <div className="apollo-daylight-bg" aria-hidden="true">
      <div className="apollo-sun-wrap">
        <span className="apollo-sun-glow" />
        <span className="apollo-sun-core" />
        <span className="apollo-sun-ray apollo-sun-ray--one" />
        <span className="apollo-sun-ray apollo-sun-ray--two" />
        <span className="apollo-sun-ray apollo-sun-ray--three" />
      </div>

      <div className="apollo-clouds">
        {clouds.map((cloud) => (
          <span className="apollo-cloud" key={cloud.key} style={cloud.style} />
        ))}
      </div>

      <div className="apollo-haze apollo-haze--one" />
      <div className="apollo-haze apollo-haze--two" />
      <div className="apollo-horizon" />
    </div>
  );
};

export default ApolloDayVibe;
