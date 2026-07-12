import React from 'react';

const DEFAULT_CLOUD_COLORS = ['#ffffff', '#fff7ea', '#ffeccf'];
const CLOUD_LAYOUTS = [
  { top: '16%', left: '-10%', width: 'clamp(110px, 15vw, 190px)', opacity: 1, animation: 'apollo-cloud-drift 20s linear infinite' },
  { top: '28%', left: '-18%', width: 'clamp(130px, 19vw, 230px)', opacity: 0.74, animation: 'apollo-cloud-drift 24s linear infinite 3s' },
  { top: '10%', left: '38%', width: 'clamp(90px, 13vw, 160px)', opacity: 0.56, animation: 'apollo-cloud-bob 8s ease-in-out infinite' },
  { top: '36%', left: '14%', width: 'clamp(98px, 14vw, 176px)', opacity: 0.62, animation: 'apollo-cloud-bob 10s ease-in-out infinite 1.2s' },
  { top: '22%', left: '58%', width: 'clamp(86px, 12vw, 154px)', opacity: 0.58, animation: 'apollo-cloud-bob 9.2s ease-in-out infinite 0.8s' },
  { top: '44%', left: '72%', width: 'clamp(104px, 15vw, 182px)', opacity: 0.5, animation: 'apollo-cloud-bob 11s ease-in-out infinite 1.5s' },
];

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

const buildCloudStyle = (hexColor, index) => {
  const layout = CLOUD_LAYOUTS[index % CLOUD_LAYOUTS.length];
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
    style: buildCloudStyle(getCloudColor(siteContent, index), index),
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
