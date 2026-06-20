import React, { useEffect, useRef } from 'react';
import '../styles/RaverSprites.css';

// Each sprite has a slightly different speed so they don't move in sync
const SPRITES = [
  { speed: 0.80, dance: 1, offsetX:   0, offsetY:   0 },
  { speed: 0.62, dance: 2, offsetX: -24, offsetY:  12 },
  { speed: 0.90, dance: 3, offsetX:  20, offsetY:  -8 },
  { speed: 0.70, dance: 1, offsetX: -12, offsetY: -22 },
  { speed: 0.85, dance: 2, offsetX:  28, offsetY:  18 },
];

// ─── Greek black-figure pottery raver poses ───────────────────
// Angular limbs, no curves, profile-style proportions

// Tiny beer bottle — neck + body hanging from hand tip (cx, cy)
function Bottle({ cx, cy, fill }) {
  return (
    <>
      <rect x={cx - 0.6} y={cy}       width={1.2} height={1.6} fill={fill} />
      <rect x={cx - 1.1} y={cy + 1.6} width={2.2} height={2.6} fill={fill} />
    </>
  );
}

function PoseA({ fill }) {
  // Both arms raised — classic "raise the roof"
  return (
    <svg viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="3.5" r="3" fill={fill} />
      <line x1="10" y1="6.5" x2="10" y2="18" stroke={fill} strokeWidth="2.2" strokeLinecap="square" />
      <polyline points="10,10 4,5 2,2"   stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points="10,10 16,5 18,2" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points="10,18 6,24 4,31"  stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points="10,18 14,24 16,31" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <Bottle cx={2}  cy={2} fill={fill} />
      <Bottle cx={18} cy={2} fill={fill} />
    </svg>
  );
}

function PoseB({ fill }) {
  // Greek profile — one arm high, one low, slight forward lean
  return (
    <svg viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="3.5" r="3" fill={fill} />
      {/* profile beak */}
      <line x1="13.5" y1="3.2" x2="16" y2="3.2" stroke={fill} strokeWidth="1.2" strokeLinecap="square" />
      <line x1="10" y1="6.5" x2="9" y2="18" stroke={fill} strokeWidth="2.2" strokeLinecap="square" />
      {/* arm high */}
      <polyline points="10,10 16,5 18,2" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      {/* arm low */}
      <polyline points="10,10 4,15 2,18" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points="9,18 4,24 3,31"   stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points="9,18 14,24 15,31" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <Bottle cx={18} cy={2}  fill={fill} />
      <Bottle cx={2}  cy={18} fill={fill} />
    </svg>
  );
}

function PoseC({ fill }) {
  // Arms wide T, slight crouch — hype person
  return (
    <svg viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="3.5" r="3" fill={fill} />
      <line x1="10" y1="6.5" x2="10" y2="18" stroke={fill} strokeWidth="2.2" strokeLinecap="square" />
      {/* arms wide */}
      <polyline points="10,11 4,8 1,11"  stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points="10,11 16,8 19,11" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      {/* legs spread */}
      <polyline points="10,18 7,23 4,31"  stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points="10,18 13,23 16,31" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <Bottle cx={1}  cy={11} fill={fill} />
      <Bottle cx={19} cy={11} fill={fill} />
    </svg>
  );
}

function PoseGirlA({ fill }) {
  // Both arms raised, long robe/skirt — Greek kore style
  return (
    <svg viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* hair bun */}
      <circle cx="10" cy="1.2" r="1.4" fill={fill} />
      {/* head */}
      <circle cx="10" cy="4.2" r="3" fill={fill} />
      {/* body */}
      <line x1="10" y1="7.2" x2="10" y2="18" stroke={fill} strokeWidth="2.2" strokeLinecap="square" />
      {/* both arms raised */}
      <polyline points="10,10 4,5 2,2"   stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points="10,10 16,5 18,2" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      {/* long robe — filled trapezoid */}
      <polygon points="5,18 15,18 18,31 2,31" fill={fill} />
      <Bottle cx={2}  cy={2} fill={fill} />
      <Bottle cx={18} cy={2} fill={fill} />
    </svg>
  );
}

function PoseGirlB({ fill }) {
  // Profile, one arm high, one low, long robe — Greek profile dancer
  return (
    <svg viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* hair knot at back */}
      <circle cx="8" cy="1.4" r="1.3" fill={fill} />
      {/* head (profile, slightly right) */}
      <circle cx="11" cy="4.2" r="3" fill={fill} />
      {/* profile nose */}
      <line x1="13.5" y1="3.8" x2="15.5" y2="3.8" stroke={fill} strokeWidth="1.2" strokeLinecap="square" />
      {/* body, slight forward lean */}
      <line x1="10" y1="7.2" x2="9" y2="18" stroke={fill} strokeWidth="2.2" strokeLinecap="square" />
      {/* arm high */}
      <polyline points="10,10 16,5 18,2" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      {/* arm low */}
      <polyline points="10,10 4,15 2,18" stroke={fill} strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" />
      {/* long robe */}
      <polygon points="4,18 14,18 16,31 2,31" fill={fill} />
      <Bottle cx={18} cy={2}  fill={fill} />
      <Bottle cx={2}  cy={18} fill={fill} />
    </svg>
  );
}

const POSES = [PoseA, PoseGirlA, PoseC, PoseGirlB, PoseB];

export default function RaverSprites({ theme }) {
  const spriteRefs = useRef([]);
  const posRef     = useRef(SPRITES.map(() => ({ x: -300, y: -300 })));
  const targetRef  = useRef({ x: -300, y: -300 });

  useEffect(() => {
    const onMouseMove = (e) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };
    const onTouchMove = (e) => {
      if (e.touches[0]) {
        targetRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    let rafId;
    const tick = () => {
      posRef.current = posRef.current.map((pos, i) => {
        const { speed, offsetX, offsetY } = SPRITES[i];
        const tx = targetRef.current.x + offsetX;
        const ty = targetRef.current.y + offsetY;
        const dx = tx - pos.x;
        const dy = ty - pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.8) return pos; // already there

        // Constant zombie speed — slow and relentless, not lerp
        const step = Math.min(speed, dist);
        const nx = pos.x + (dx / dist) * step;
        const ny = pos.y + (dy / dist) * step;

        if (spriteRefs.current[i]) {
          spriteRefs.current[i].style.left = `${nx}px`;
          spriteRefs.current[i].style.top  = `${ny}px`;
        }

        return { x: nx, y: ny };
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const fill = theme === 'selene'
    ? 'rgba(235, 205, 140, 0.92)'   // warm parchment for dark mode
    : 'rgba(38, 16, 0, 0.90)';      // rich black-figure terracotta for light mode

  return (
    <div className="raver-sprites-layer" aria-hidden="true">
      {SPRITES.map((s, i) => {
        const Pose = POSES[i];
        return (
          <div
            key={i}
            ref={(el) => { spriteRefs.current[i] = el; }}
            className={`raver-sprite raver-dance-${s.dance}`}
            style={{ animationDelay: `${-i * 0.18}s` }}
          >
            <Pose fill={fill} />
          </div>
        );
      })}
    </div>
  );
}
