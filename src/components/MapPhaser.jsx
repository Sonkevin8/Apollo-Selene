import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// Approximate major landmass outlines as latitude/longitude polygons
// Each entry is an array of [lng, lat] pairs (simplified)
const LAND_POLYGONS = [
  // North America
  [[-168,71],[-141,60],[-124,49],[-117,32],[-87,16],[-77,8],[-82,10],[-85,10],[-90,16],[-97,19],[-105,20],[-109,23],[-115,28],[-120,35],[-123,46],[-124,49],[-132,54],[-141,60],[-141,69],[-157,71],[-168,71]],
  // South America
  [[-80,8],[-77,8],[-65,1],[-52,-4],[-35,-7],[-35,-24],[-53,-34],[-58,-38],[-65,-42],[-66,-55],[-69,-55],[-72,-51],[-75,-42],[-68,-32],[-70,-18],[-75,-10],[-80,-2],[-77,1],[-80,8]],
  // Europe
  [[0,51],[5,48],[8,48],[10,54],[14,55],[18,57],[24,60],[30,60],[28,65],[22,70],[14,68],[10,63],[5,58],[0,51]]  ,
  // Africa
  [[-17,14],[-15,10],[-15,5],[-7,4],[2,5],[9,4],[15,2],[28,-2],[37,-2],[42,10],[44,12],[42,12],[50,12],[43,15],[38,20],[37,22],[32,28],[35,32],[32,32],[26,34],[18,34],[10,32],[2,28],[-5,24],[-13,17],[-17,14]],
  // Asia
  [[26,70],[32,65],[40,60],[55,57],[60,55],[75,55],[85,53],[90,50],[100,52],[110,53],[130,52],[140,48],[142,44],[135,34],[125,22],[115,15],[105,12],[100,5],[104,1],[110,-5],[120,-8],[130,-2],[140,5],[148,6],[145,10],[140,16],[130,20],[120,22],[115,25],[120,30],[115,35],[110,38],[100,42],[90,44],[80,42],[72,36],[66,25],[60,20],[55,14],[50,10],[43,12],[40,18],[38,22],[35,28],[36,33],[26,36],[26,40],[28,48],[26,55],[26,60],[26,70]],
  // Australia
  [[130,-14],[136,-12],[140,-16],[145,-18],[148,-20],[154,-24],[153,-28],[151,-34],[149,-38],[143,-38],[137,-35],[130,-32],[115,-34],[114,-30],[114,-22],[120,-16],[130,-14]],
];

const MapPhaser = ({ userLocation, mixtapePegs = [] }) => {
  const gameRef = useRef(null);
  const phaserRef = useRef(null);

  useEffect(() => {
    if (phaserRef.current) {
      phaserRef.current.destroy(true);
      phaserRef.current = null;
    }

    const W = 800;
    const H = 400;

    function latLngToXY(lat, lng) {
      const x = ((lng + 180) / 360) * W;
      const y = ((90 - lat) / 180) * H;
      return { x, y };
    }

    class MapScene extends Phaser.Scene {
      create() {
        // Ocean background
        const gfx = this.add.graphics();
        gfx.fillStyle(0x0a1e3c, 1);
        gfx.fillRect(0, 0, W, H);

        // Grid lines
        gfx.lineStyle(1, 0x1a3a6c, 0.5);
        for (let lng = -180; lng <= 180; lng += 30) {
          const x = ((lng + 180) / 360) * W;
          gfx.beginPath();
          gfx.moveTo(x, 0);
          gfx.lineTo(x, H);
          gfx.strokePath();
        }
        for (let lat = -90; lat <= 90; lat += 30) {
          const y = ((90 - lat) / 180) * H;
          gfx.beginPath();
          gfx.moveTo(0, y);
          gfx.lineTo(W, y);
          gfx.strokePath();
        }

        // Landmasses
        gfx.lineStyle(1, 0x4a9a6a, 0.8);
        gfx.fillStyle(0x2d6a4f, 0.85);
        LAND_POLYGONS.forEach(poly => {
          gfx.beginPath();
          poly.forEach(([lng, lat], i) => {
            const { x, y } = latLngToXY(lat, lng);
            if (i === 0) gfx.moveTo(x, y);
            else gfx.lineTo(x, y);
          });
          gfx.closePath();
          gfx.fillPath();
          gfx.strokePath();
        });

        // User location peg
        if (userLocation) {
          const { x, y } = latLngToXY(userLocation.lat, userLocation.lng);
          const dot = this.add.graphics();
          dot.fillStyle(0xff4444, 1);
          dot.fillCircle(x, y, 7);
          dot.lineStyle(2, 0xffffff, 1);
          dot.strokeCircle(x, y, 7);
          // Pulse tween
          this.tweens.add({ targets: dot, scaleX: 1.4, scaleY: 1.4, alpha: 0.6, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });
        }

        // Mixtape delivery pegs
        mixtapePegs.forEach(({ lat, lng }) => {
          const { x, y } = latLngToXY(lat, lng);
          const peg = this.add.graphics();
          peg.fillStyle(0xffd700, 1);
          peg.fillCircle(x, y, 5);
          peg.lineStyle(1, 0xffa500, 1);
          peg.strokeCircle(x, y, 5);
        });
      }
    }

    phaserRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: W,
      height: H,
      parent: gameRef.current,
      scene: MapScene,
      transparent: true,
      backgroundColor: 'transparent',
    });

    return () => {
      if (phaserRef.current) {
        phaserRef.current.destroy(true);
        phaserRef.current = null;
      }
    };
  }, [userLocation, JSON.stringify(mixtapePegs)]);

  return <div ref={gameRef} style={{ width: 800, height: 400, margin: '0 auto' }} />;
};

export default MapPhaser;
