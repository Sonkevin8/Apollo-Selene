// MapPhaser — RPG-style delivery world map rendered with Phaser
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

const W = 800;
const H = 400;

// Deterministic noise for consistent grass/terrain texture
function tnoise(x, y) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// Paint the terrain onto a 2D canvas context
function paintTerrain(ctx) {
  ctx.fillStyle = '#7ec850';
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      const n = tnoise(x >> 2, y >> 2);
      if (n < 0.18) {
        ctx.fillStyle = `rgba(60,140,20,${0.25 + n})`;
        ctx.fillRect(x, y, 4, 4);
      } else if (n > 0.82) {
        ctx.fillStyle = `rgba(148,218,70,${(n - 0.82) * 2})`;
        ctx.fillRect(x, y, 4, 4);
      }
    }
  }

  ctx.beginPath();
  ctx.moveTo(118, 0);
  ctx.bezierCurveTo(112, 55, 130, 102, 116, 155);
  ctx.bezierCurveTo(102, 208, 122, 252, 108, 302);
  ctx.bezierCurveTo(94, 352, 112, 378, 108, 400);
  ctx.lineTo(256, 400);
  ctx.bezierCurveTo(268, 372, 254, 342, 272, 297);
  ctx.bezierCurveTo(290, 252, 274, 207, 287, 162);
  ctx.bezierCurveTo(300, 117, 284, 73, 297, 28);
  ctx.bezierCurveTo(302, 12, 296, 3, 284, 0);
  ctx.closePath();
  ctx.fillStyle = '#3ec4b8';
  ctx.fill();

  ctx.strokeStyle = 'rgba(100,228,218,0.32)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(162, 18);
  ctx.bezierCurveTo(152, 84, 168, 142, 154, 204);
  ctx.bezierCurveTo(140, 266, 158, 322, 150, 392);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(20,110,100,0.38)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(118, 0);
  ctx.bezierCurveTo(112, 55, 130, 102, 116, 155);
  ctx.bezierCurveTo(102, 208, 122, 252, 108, 302);
  ctx.bezierCurveTo(94, 352, 112, 378, 108, 400);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(284, 0);
  ctx.bezierCurveTo(310, 32, 368, 22, 418, 12);
  ctx.bezierCurveTo(448, 5, 480, 0, 492, 0);
  ctx.lineTo(492, 82);
  ctx.bezierCurveTo(468, 76, 440, 66, 400, 72);
  ctx.bezierCurveTo(358, 78, 320, 88, 300, 72);
  ctx.bezierCurveTo(294, 52, 290, 22, 284, 0);
  ctx.closePath();
  ctx.fillStyle = '#3ec4b8';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(492, 0);
  ctx.bezierCurveTo(512, 22, 522, 62, 512, 103);
  ctx.bezierCurveTo(507, 124, 528, 142, 542, 162);
  ctx.bezierCurveTo(582, 167, 632, 157, 702, 160);
  ctx.bezierCurveTo(762, 163, 800, 160, 800, 160);
  ctx.lineTo(800, 242);
  ctx.bezierCurveTo(742, 244, 682, 250, 632, 244);
  ctx.bezierCurveTo(582, 238, 547, 252, 520, 247);
  ctx.bezierCurveTo(502, 242, 492, 212, 487, 192);
  ctx.bezierCurveTo(480, 167, 484, 137, 480, 112);
  ctx.bezierCurveTo(476, 82, 482, 42, 492, 0);
  ctx.closePath();
  ctx.fillStyle = '#3ec4b8';
  ctx.fill();

  ctx.strokeStyle = 'rgba(100,228,218,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(558, 167);
  ctx.bezierCurveTo(602, 172, 662, 167, 724, 172);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(189, 200, 22, 14, 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#c8a040';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(188, 198, 13, 8, 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#78c048';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(382, 43, 18, 11, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#c8a040';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(381, 42, 11, 7, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#78c048';
  ctx.fill();

  [
    { x: 106, y: 150, w: 14, h: 8 },
    { x: 108, y: 297, w: 13, h: 7 },
    { x: 271, y: 97, w: 16, h: 8 },
    { x: 487, y: 108, w: 12, h: 6 },
  ].forEach(({ x, y, w, h }) => {
    ctx.fillStyle = '#c8a050';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d4aa62';
    ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
  });

  [
    { x: 33, y: 65, r: 30 },
    { x: 352, y: 264, r: 24 },
    { x: 712, y: 152, r: 32 },
  ].forEach(({ x, y, r }) => {
    const g2 = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
    g2.addColorStop(0, 'rgba(55,125,18,0.28)');
    g2.addColorStop(1, 'rgba(55,125,18,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function addTree(scene, x, y, s) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.1);
  g.fillEllipse(x + 2, y + Math.round(22 * s), Math.round(30 * s), Math.round(9 * s));
  g.fillStyle(0x4a2e12, 1);
  g.fillRect(x - Math.round(3 * s), y + Math.round(8 * s), Math.round(6 * s), Math.round(15 * s));
  g.fillStyle(0x2e1c06, 0.55);
  g.fillRect(x + Math.round(1 * s), y + Math.round(9 * s), Math.round(2 * s), Math.round(13 * s));
  g.fillStyle(0x2d5c10, 1);
  g.fillCircle(x, y, Math.round(20 * s));
  g.fillStyle(0x3a7020, 1);
  g.fillCircle(x - Math.round(5 * s), y - Math.round(5 * s), Math.round(14 * s));
  g.fillCircle(x + Math.round(6 * s), y - Math.round(3 * s), Math.round(12 * s));
  g.fillStyle(0x4e9030, 0.85);
  g.fillCircle(x - Math.round(7 * s), y - Math.round(10 * s), Math.round(9 * s));
  g.fillStyle(0x62a840, 0.52);
  g.fillCircle(x - Math.round(9 * s), y - Math.round(13 * s), Math.round(5 * s));
}

const MapPhaser = ({ userLocation, mixtapePegs = [] }) => {
  const gameRef = useRef(null);
  const phaserRef = useRef(null);

  useEffect(() => {
    if (phaserRef.current) {
      phaserRef.current.destroy(true);
      phaserRef.current = null;
    }

    class MapScene extends Phaser.Scene {
      create() {
        try {
          const tex = this.textures.createCanvas('terrain', W, H);
          const ctx = tex.getContext();
          paintTerrain(ctx);
          tex.refresh();
          this.add.image(0, 0, 'terrain').setOrigin(0, 0);
        } catch (_) {
          const g = this.add.graphics();
          g.fillStyle(0x7ec850, 1); g.fillRect(0, 0, W, H);
          g.fillStyle(0x3ec4b8, 1); g.fillRect(118, 0, 180, H);
        }

        const treeData = [
          { x: 54, y: 80, s: 1.1 }, { x: 30, y: 198, s: 0.92 },
          { x: 74, y: 314, s: 1.0 }, { x: 374, y: 50, s: 1.15 },
          { x: 418, y: 128, s: 0.95 }, { x: 694, y: 76, s: 1.1 },
          { x: 737, y: 200, s: 1.0 }, { x: 714, y: 337, s: 0.9 },
          { x: 356, y: 324, s: 1.05 }, { x: 340, y: 220, s: 0.84 },
          { x: 454, y: 284, s: 1.0 }, { x: 756, y: 354, s: 0.92 },
          { x: 22, y: 352, s: 0.85 },
        ];
        treeData.forEach(({ x, y, s }) => addTree(this, x, y, s));

        {
          const g = this.add.graphics();
          const bx = 94, by = 242;
          g.fillStyle(0x3a2808, 1);
          g.fillRect(bx - 3, by, 6, 22);
          g.lineStyle(4, 0x3a2808, 1);
          g.beginPath(); g.moveTo(bx, by + 2); g.lineTo(bx - 20, by - 16); g.strokePath();
          g.beginPath(); g.moveTo(bx, by + 2); g.lineTo(bx + 14, by - 12); g.strokePath();
          g.lineStyle(3, 0x3a2808, 1);
          g.beginPath(); g.moveTo(bx - 20, by - 16); g.lineTo(bx - 30, by - 8); g.strokePath();
          g.beginPath(); g.moveTo(bx - 20, by - 16); g.lineTo(bx - 23, by - 26); g.strokePath();
          g.lineStyle(2, 0x3a2808, 1);
          g.beginPath(); g.moveTo(bx + 14, by - 12); g.lineTo(bx + 24, by - 4); g.strokePath();
          g.fillStyle(0xcc50a0, 1); g.fillCircle(bx - 8, by + 22, 3);
          g.fillStyle(0xff8888, 1); g.fillCircle(bx + 5, by + 24, 2);
          g.fillStyle(0xffffff, 0.85); g.fillCircle(bx - 8, by + 21, 1);
          g.fillStyle(0xffffff, 0.85); g.fillCircle(bx + 5, by + 23, 1);
        }

        {
          const cx = 145, cy = 262;
          const cont = this.add.container(cx, cy);
          const g = this.add.graphics();
          g.fillStyle(0x000000, 0.18); g.fillEllipse(1, 14, 16, 5);
          g.fillStyle(0x3d2a60, 1);
          g.fillRect(-4, 6, 4, 8); g.fillRect(1, 6, 4, 8);
          g.fillStyle(0x201030, 1);
          g.fillRect(-5, 12, 5, 3); g.fillRect(0, 12, 5, 3);
          g.fillStyle(0x7a4828, 1); g.fillRect(-5, -4, 11, 11);
          g.fillStyle(0x5a3018, 0.48); g.fillRect(3, -3, 3, 10);
          g.fillStyle(0x9a6040, 0.38); g.fillRect(-4, -3, 2, 9);
          g.fillStyle(0x5a3820, 1); g.fillRect(5, -3, 5, 8);
          g.fillStyle(0x7a5030, 0.68); g.fillRect(6, -2, 3, 6);
          g.lineStyle(1, 0x4a2810, 1);
          g.beginPath(); g.moveTo(5, -3); g.lineTo(3, 3); g.strokePath();
          g.fillStyle(0x9070c0, 1); g.fillRect(-5, -5, 11, 3);
          g.fillStyle(0xb090e0, 0.48); g.fillRect(-5, -5, 4, 2);
          g.fillStyle(0xd4956a, 1); g.fillRect(-3, -14, 8, 9);
          g.fillStyle(0xba7a52, 0.45); g.fillRect(2, -13, 3, 8);
          g.fillStyle(0x3a2010, 1);
          g.fillRect(-1, -11, 2, 2); g.fillRect(3, -11, 2, 2);
          g.fillStyle(0x3a1a08, 1);
          g.fillRect(-4, -17, 10, 4);
          g.fillRect(-5, -15, 2, 5); g.fillRect(7, -15, 2, 4);
          g.fillStyle(0x5a3020, 0.48); g.fillRect(-2, -17, 4, 2);
          cont.add(g);
          this.tweens.add({ targets: cont, y: cy - 2, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: cont, x: cx + 1, yoyo: true, repeat: -1, duration: 840, ease: 'Sine.easeInOut' });
        }

        if (userLocation) {
          const px = ((userLocation.lng + 180) / 360) * W;
          const py = ((90 - userLocation.lat) / 180) * H;
          const dot = this.add.graphics();
          dot.fillStyle(0xff3333, 1); dot.fillCircle(px, py, 8);
          dot.lineStyle(2, 0xffffff, 1); dot.strokeCircle(px, py, 8);
          dot.fillStyle(0xff8888, 1); dot.fillCircle(px - 2, py - 2, 3);
          this.tweens.add({ targets: dot, scaleX: 1.35, scaleY: 1.35, alpha: 0.6, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });
        }

        mixtapePegs.forEach(({ lat, lng }, i) => {
          const px = ((lng + 180) / 360) * W;
          const py = ((90 - lat) / 180) * H;
          const g = this.add.graphics();
          g.fillStyle(0x000000, 0.16); g.fillEllipse(px + 2, py + 14, 10, 4);
          g.fillStyle(0xffd700, 1); g.fillCircle(px, py, 7);
          g.lineStyle(2, 0xffa500, 1); g.strokeCircle(px, py, 7);
          g.fillStyle(0xffee88, 1); g.fillCircle(px - 2, py - 2, 3);
          g.lineStyle(2, 0xcc8800, 1);
          g.beginPath(); g.moveTo(px, py + 7); g.lineTo(px + 1, py + 14); g.strokePath();
          this.tweens.add({ targets: g, scaleX: 1.18, scaleY: 1.18, yoyo: true, repeat: -1, duration: 900 + i * 200 });
        });
      }
    }

    phaserRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: W,
      height: H,
      parent: gameRef.current,
      scene: MapScene,
      backgroundColor: '#7ec850',
    });

    return () => {
      if (phaserRef.current) {
        phaserRef.current.destroy(true);
        phaserRef.current = null;
      }
    };
  }, [userLocation, JSON.stringify(mixtapePegs)]);

  return (
    <div
      ref={gameRef}
      style={{ width: W, height: H, margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }}
    />
  );
};

export default MapPhaser;
