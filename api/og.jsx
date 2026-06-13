import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d1627 0%, #1a2d50 55%, #0d1627 100%)',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient moon glow — top-right */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 38% 38%, #e8c87a 0%, #b8561e 45%, transparent 72%)',
            opacity: 0.18,
          }}
        />

        {/* Ambient sun glow — bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: -90,
            left: -90,
            width: 340,
            height: 340,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 60% 60%, #f0b35b 0%, #c86b25 50%, transparent 72%)',
            opacity: 0.14,
          }}
        />

        {/* Stars */}
        {[
          { top: 48, left: 90, size: 3, opacity: 0.7 },
          { top: 82, left: 230, size: 2, opacity: 0.5 },
          { top: 120, left: 520, size: 4, opacity: 0.6 },
          { top: 55, right: 180, size: 3, opacity: 0.7 },
          { top: 140, right: 90, size: 2, opacity: 0.5 },
          { bottom: 100, left: 160, size: 3, opacity: 0.6 },
          { bottom: 70, left: 400, size: 2, opacity: 0.5 },
          { bottom: 110, right: 130, size: 4, opacity: 0.6 },
          { bottom: 55, right: 350, size: 2, opacity: 0.45 },
        ].map((s, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: s.top,
              bottom: s.bottom,
              left: s.left,
              right: s.right,
              width: s.size,
              height: s.size,
              borderRadius: '50%',
              background: '#c9d4ea',
              opacity: s.opacity,
            }}
          />
        ))}

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            padding: '0 80px',
            textAlign: 'center',
          }}
        >
          {/* Site name */}
          <div
            style={{
              fontSize: 78,
              fontWeight: 700,
              color: '#e8c87a',
              letterSpacing: '-1px',
              lineHeight: 1.1,
              textShadow: '0 2px 24px rgba(232,200,122,0.28)',
            }}
          >
            Apollo Selene
          </div>

          {/* Divider */}
          <div
            style={{
              marginTop: 20,
              width: 280,
              height: 2,
              background: 'linear-gradient(90deg, transparent, #7991b8, transparent)',
              opacity: 0.7,
            }}
          />

          {/* Tagline */}
          <div
            style={{
              marginTop: 22,
              fontSize: 28,
              color: '#c9d4ea',
              letterSpacing: 3,
              textTransform: 'uppercase',
              opacity: 0.9,
            }}
          >
            Events · Artwork · Community
          </div>

          {/* Location */}
          <div
            style={{
              marginTop: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 22,
              color: '#7991b8',
              letterSpacing: 1.5,
            }}
          >
            <span style={{ fontSize: 18, opacity: 0.8 }}>📍</span>
            Auckland City, New Zealand
          </div>
        </div>

        {/* Bottom gradient bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 5,
            background: 'linear-gradient(90deg, #b8561e, #e49743, #c9d4ea, #e49743, #b8561e)',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
