import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// Placeholder world map image (should be replaced with a pixel-art/retro world map asset)
const WORLD_MAP_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/99/BlankMap-World6-Equirectangular.png';

const MapPhaser = ({ userLocation, mixtapePegs = [] }) => {
  const gameRef = useRef(null);
  const phaserRef = useRef(null);

  useEffect(() => {
    if (phaserRef.current) {
      phaserRef.current.destroy(true);
    }

    class MapScene extends Phaser.Scene {
      preload() {
        this.load.image('world', WORLD_MAP_URL);
        this.load.image('peg', 'https://cdn-icons-png.flaticon.com/512/684/684908.png'); // Simple pin icon
      }
      create() {
        // Draw world map
        const map = this.add.image(0, 0, 'world').setOrigin(0, 0).setDisplaySize(800, 400);
        // Draw user location peg
        if (userLocation) {
          const { x, y } = latLngToMap(userLocation.lat, userLocation.lng, 800, 400);
          this.add.image(x, y, 'peg').setDisplaySize(24, 24);
        }
        // Draw mixtape pegs
        mixtapePegs.forEach(({ lat, lng }) => {
          const { x, y } = latLngToMap(lat, lng, 800, 400);
          this.add.image(x, y, 'peg').setTint(0xffd700).setDisplaySize(20, 20);
        });
      }
    }

    // Convert lat/lng to x/y on equirectangular map
    function latLngToMap(lat, lng, width, height) {
      const x = ((lng + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      return { x, y };
    }

    phaserRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 400,
      parent: gameRef.current,
      scene: MapScene,
      transparent: true,
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
