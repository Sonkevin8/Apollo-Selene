import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import './Earth.css';

const viewpoints = {
  global: { lat: 18, lng: 10, altitude: 2.1 },
  northAmerica: { lat: 39.5, lng: -98.35, altitude: 1.35 },
  europe: { lat: 50.11, lng: 8.68, altitude: 1.2 },
  asia: { lat: 35.68, lng: 139.69, altitude: 1.3 },
};

const hotspots = [
  { lat: 40.7128, lng: -74.006, size: 0.4, label: 'New York' },
  { lat: 51.5072, lng: -0.1276, size: 0.34, label: 'London' },
  { lat: 35.6764, lng: 139.65, size: 0.35, label: 'Tokyo' },
  { lat: -33.8688, lng: 151.2093, size: 0.33, label: 'Sydney' },
  { lat: 6.5244, lng: 3.3792, size: 0.29, label: 'Lagos' },
  { lat: -23.5505, lng: -46.6333, size: 0.32, label: 'Sao Paulo' },
];

const DETAIL_ZOOM_DISTANCE = 180;

const airRoutes = [
  {
    startLat: 40.7128,
    startLng: -74.006,
    endLat: 51.5072,
    endLng: -0.1276,
    altitude: 0.27,
    label: 'NYC to London',
  },
  {
    startLat: 51.5072,
    startLng: -0.1276,
    endLat: 35.6764,
    endLng: 139.65,
    altitude: 0.31,
    label: 'London to Tokyo',
  },
  {
    startLat: 35.6764,
    startLng: 139.65,
    endLat: -33.8688,
    endLng: 151.2093,
    altitude: 0.21,
    label: 'Tokyo to Sydney',
  },
  {
    startLat: 6.5244,
    startLng: 3.3792,
    endLat: -23.5505,
    endLng: -46.6333,
    altitude: 0.29,
    label: 'Lagos to Sao Paulo',
  },
];

const windStreams = [
  { lat: 16, lng: -46, maxRadius: 8, propagationSpeed: 2.4, repeatPeriod: 900 },
  { lat: 38, lng: -140, maxRadius: 10, propagationSpeed: 2.1, repeatPeriod: 1100 },
  { lat: -22, lng: 80, maxRadius: 9, propagationSpeed: 1.8, repeatPeriod: 1250 },
  { lat: 54, lng: 35, maxRadius: 7, propagationSpeed: 2.6, repeatPeriod: 980 },
  { lat: -36, lng: -12, maxRadius: 11, propagationSpeed: 1.7, repeatPeriod: 1320 },
];

const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 43758.5453123) * 143758.5453;
  return value - Math.floor(value);
};

const createTerrainPoints = () => {
  const clusters = [
    { lat: 27.98, lng: 86.92, count: 42, spread: 3.6, minAlt: 0.07, maxAlt: 0.14, type: 'terrain-mountain' },
    { lat: -32.65, lng: -70.01, count: 36, spread: 4.2, minAlt: 0.065, maxAlt: 0.13, type: 'terrain-mountain' },
    { lat: 46.57, lng: 10.25, count: 26, spread: 2.8, minAlt: 0.052, maxAlt: 0.11, type: 'terrain-mountain' },
    { lat: 39.12, lng: -105.67, count: 30, spread: 4.4, minAlt: 0.045, maxAlt: 0.095, type: 'terrain-hill' },
    { lat: 43.64, lng: 142.9, count: 22, spread: 2.7, minAlt: 0.042, maxAlt: 0.085, type: 'terrain-hill' },
    { lat: -6.62, lng: 146.84, count: 24, spread: 3.1, minAlt: 0.05, maxAlt: 0.1, type: 'terrain-hill' },
  ];

  const terrainPoints = [];

  clusters.forEach((cluster, clusterIndex) => {
    for (let index = 0; index < cluster.count; index += 1) {
      const seed = (clusterIndex + 1) * 1000 + index * 13.37;
      const angle = pseudoRandom(seed) * Math.PI * 2;
      const distance = Math.sqrt(pseudoRandom(seed + 1.97)) * cluster.spread;
      const altitude = cluster.minAlt + pseudoRandom(seed + 9.13) * (cluster.maxAlt - cluster.minAlt);

      terrainPoints.push({
        lat: cluster.lat + Math.cos(angle) * distance,
        lng: cluster.lng + Math.sin(angle) * distance,
        altitude,
        type: cluster.type,
      });
    }
  });

  return terrainPoints;
};

const terrainPoints = createTerrainPoints();

const cartoonPalettes = {
  classic: {
    label: 'Classic',
    globeColor: '#a3dcff',
    emissive: '#10274a',
    atmosphereColor: '#8fe1ff',
    pointColor: '#ffe173',
    outlineColor: '#44b9ff',
    cloudColor: '#d6f2ff',
  },
  mint: {
    label: 'Mint Pop',
    globeColor: '#8de8d1',
    emissive: '#0f3540',
    atmosphereColor: '#96ffe3',
    pointColor: '#fff1ad',
    outlineColor: '#5affd9',
    cloudColor: '#d5fff4',
  },
  sunset: {
    label: 'Sunset Pop',
    globeColor: '#ffba7f',
    emissive: '#4a1f2c',
    atmosphereColor: '#ff9bc7',
    pointColor: '#fff4b5',
    outlineColor: '#ff8d6e',
    cloudColor: '#ffe7d3',
  },
};

const createToonGradientTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 5;
  canvas.height = 1;

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const shades = ['#1a2f57', '#2f5f9c', '#5295d1', '#87c8ef', '#d6f1ff'];
  shades.forEach((shade, index) => {
    context.fillStyle = shade;
    context.fillRect(index, 0, 1, 1);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
};

const createLowPolyTexture = (imageUrl) =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 256;
      sampleCanvas.height = 128;

      const sampleContext = sampleCanvas.getContext('2d');
      if (!sampleContext) {
        resolve(null);
        return;
      }

      sampleContext.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height);

      const imageData = sampleContext.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
      const pixels = imageData.data;

      const oceanBands = [
        [24, 67, 120],
        [31, 84, 136],
        [42, 104, 160],
        [58, 126, 182],
        [79, 151, 206],
        [103, 182, 227],
      ];

      const landBands = [
        [66, 117, 67],
        [82, 133, 75],
        [100, 149, 84],
        [123, 163, 96],
        [149, 177, 113],
        [186, 198, 133],
      ];

      const bandCount = oceanBands.length;
      const blockSize = 1;
      for (let y = 0; y < sampleCanvas.height; y += blockSize) {
        for (let x = 0; x < sampleCanvas.width; x += blockSize) {
          const index = (y * sampleCanvas.width + x) * 4;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];

          const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
          const bandIndex = Math.min(bandCount - 1, Math.floor(luminance * bandCount));
          const isOcean = blue > red && blue > green;
          const [r, g, b] = isOcean ? oceanBands[bandIndex] : landBands[bandIndex];

          for (let by = 0; by < blockSize; by += 1) {
            for (let bx = 0; bx < blockSize; bx += 1) {
              const px = x + bx;
              const py = y + by;
              if (px >= sampleCanvas.width || py >= sampleCanvas.height) {
                continue;
              }

              const pixelIndex = (py * sampleCanvas.width + px) * 4;
              pixels[pixelIndex] = r;
              pixels[pixelIndex + 1] = g;
              pixels[pixelIndex + 2] = b;
            }
          }
        }
      }

      sampleContext.putImageData(imageData, 0, 0);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 2048;
      finalCanvas.height = 1024;

      const finalContext = finalCanvas.getContext('2d');
      if (!finalContext) {
        resolve(null);
        return;
      }

      finalContext.imageSmoothingEnabled = true;
      finalContext.drawImage(sampleCanvas, 0, 0, finalCanvas.width, finalCanvas.height);

      const texture = new THREE.CanvasTexture(finalCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      resolve(texture);
    };

    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });

function Earth() {
  const globeContainerRef = useRef(null);
  const globeRef = useRef(null);
  const materialCacheRef = useRef(null);
  const detailStateRef = useRef({ terrainVisible: false });
  const accentLayersRef = useRef({ outlineMesh: null, cloudMesh: null, scene: null, animationId: null });
  const [visualMode, setVisualMode] = useState('cartoon');
  const [cartoonPalette, setCartoonPalette] = useState('classic');

  const getHotspotAndTerrainPoints = (includeTerrain) =>
    includeTerrain ? [...hotspots, ...terrainPoints] : hotspots;

  const applyPointStyles = (globe, mode, paletteKey) => {
    if (mode === 'cartoon') {
      const palette = cartoonPalettes[paletteKey] || cartoonPalettes.classic;
      globe
        .pointRadius((point) => {
          if (point.type === 'terrain-mountain') {
            return 0.1;
          }

          if (point.type === 'terrain-hill') {
            return 0.075;
          }

          return 0.24;
        })
        .pointColor((point) => {
          if (point.type === 'terrain-mountain') {
            return '#f7eee2';
          }

          if (point.type === 'terrain-hill') {
            return '#cadc9b';
          }

          return palette.pointColor;
        });
      return;
    }

    globe
      .pointRadius((point) => {
        if (point.type === 'terrain-mountain') {
          return 0.075;
        }

        if (point.type === 'terrain-hill') {
          return 0.058;
        }

        return 0.2;
      })
      .pointColor((point) => {
        if (point.type === 'terrain-mountain') {
          return '#e4ecf6';
        }

        if (point.type === 'terrain-hill') {
          return '#8dac7b';
        }

        return '#ffb656';
      });
  };

  const applyLayerStyles = (globe, mode, paletteKey) => {
    if (mode === 'cartoon') {
      const palette = cartoonPalettes[paletteKey] || cartoonPalettes.classic;
      globe
        .arcColor(() => ['#fff2ca', '#ffab73'])
        .arcDashLength(0.42)
        .arcDashGap(0.88)
        .arcDashAnimateTime(2800)
        .ringColor(() => palette.atmosphereColor);
      return;
    }

    globe
      .arcColor(() => ['#8ec6ff', '#f6fbff'])
      .arcDashLength(0.32)
      .arcDashGap(1.02)
      .arcDashAnimateTime(3600)
      .ringColor(() => '#8ab7ff');
  };

  const applyZoomDetail = (globe, force = false) => {
    const controls = globe.controls();
    const distance = typeof controls.getDistance === 'function' ? controls.getDistance() : Number.MAX_VALUE;
    const shouldShowTerrain = distance <= DETAIL_ZOOM_DISTANCE;

    if (!force && detailStateRef.current.terrainVisible === shouldShowTerrain) {
      return;
    }

    detailStateRef.current.terrainVisible = shouldShowTerrain;
    globe.pointsData(getHotspotAndTerrainPoints(shouldShowTerrain));
  };

  const applyCartoonPalette = (globe, paletteKey) => {
    const materials = materialCacheRef.current;
    if (!materials) {
      return;
    }

    const palette = cartoonPalettes[paletteKey] || cartoonPalettes.classic;

    materials.toonMaterial.color.set(palette.globeColor);
    materials.toonMaterial.emissive.set(palette.emissive);
    materials.toonMaterial.needsUpdate = true;

    if (materials.outlineMaterial) {
      materials.outlineMaterial.color.set(palette.outlineColor);
      materials.outlineMaterial.needsUpdate = true;
    }

    if (materials.cloudMaterial) {
      materials.cloudMaterial.color.set(palette.cloudColor);
      materials.cloudMaterial.needsUpdate = true;
    }

    globe
      .showAtmosphere(true)
      .atmosphereColor(palette.atmosphereColor)
      .atmosphereAltitude(0.34)
      .pointColor(() => palette.pointColor)
      .pointRadius(0.25);
  };

  const applyVisualMode = (globe, mode) => {
    const materials = materialCacheRef.current;
    if (!materials) {
      return;
    }

    if (mode === 'cartoon') {
      applyCartoonPalette(globe, cartoonPalette);
      globe.globeMaterial(materials.toonMaterial);

      if (accentLayersRef.current.outlineMesh) {
        accentLayersRef.current.outlineMesh.visible = true;
      }

      if (accentLayersRef.current.cloudMesh) {
        accentLayersRef.current.cloudMesh.visible = true;
      }
      return;
    }

    globe
      .showAtmosphere(true)
      .atmosphereColor('#79b9ff')
      .atmosphereAltitude(0.2)
      .pointColor(() => '#ffb656')
      .pointRadius(0.2);
    globe.globeMaterial(materials.realisticMaterial);

    if (accentLayersRef.current.outlineMesh) {
      accentLayersRef.current.outlineMesh.visible = false;
    }

    if (accentLayersRef.current.cloudMesh) {
      accentLayersRef.current.cloudMesh.visible = false;
    }
  };

  useEffect(() => {
    if (!globeContainerRef.current || globeRef.current) {
      return;
    }

    const globe = Globe()(globeContainerRef.current)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#8fe1ff')
      .atmosphereAltitude(0.34)
      .pointsData(getHotspotAndTerrainPoints(false))
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude((point) => point.altitude ?? point.size)
      .pointRadius(0.25)
      .pointColor(() => '#ffe173')
      .pointLabel((point) => point.label || '')
      .arcsData(airRoutes)
      .arcStartLat('startLat')
      .arcStartLng('startLng')
      .arcEndLat('endLat')
      .arcEndLng('endLng')
      .arcAltitude('altitude')
      .arcStroke(0.95)
      .arcLabel((route) => `Air Route: ${route.label}`)
      .arcDashLength(0.42)
      .arcDashGap(0.88)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(2800)
      .arcsTransitionDuration(0)
      .ringsData(windStreams)
      .ringLat('lat')
      .ringLng('lng')
      .ringMaxRadius('maxRadius')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod')
      .ringColor(() => '#8fe1ff');

    const toonGradientTexture = createToonGradientTexture();
    const topologyTexture = new THREE.TextureLoader().load(
      'https://unpkg.com/three-globe/example/img/earth-topology.png'
    );
    const earthTexture = new THREE.TextureLoader().load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
    );

    topologyTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const toonMaterial = new THREE.MeshToonMaterial({
      map: earthTexture,
      gradientMap: toonGradientTexture,
      color: '#a3dcff',
      emissive: '#10274a',
      emissiveIntensity: 0.2,
      flatShading: false,
    });

    const realisticMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: topologyTexture,
      bumpScale: 0.45,
      shininess: 6,
      specular: new THREE.Color('#2d3d55'),
    });

    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: cartoonPalettes.classic.outlineColor,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });

    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: cartoonPalettes.classic.cloudColor,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });

    const outlineMesh = new THREE.Mesh(new THREE.SphereGeometry(103, 48, 48), outlineMaterial);
    const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(102, 48, 48), cloudMaterial);

    const scene = globe.scene();
    scene.add(outlineMesh);
    scene.add(cloudMesh);

    accentLayersRef.current.outlineMesh = outlineMesh;
    accentLayersRef.current.cloudMesh = cloudMesh;
    accentLayersRef.current.scene = scene;

    const animateCloudLayer = () => {
      if (accentLayersRef.current.cloudMesh) {
        accentLayersRef.current.cloudMesh.rotation.y += 0.00085;
        accentLayersRef.current.cloudMesh.rotation.x += 0.00014;
      }

      accentLayersRef.current.animationId = window.requestAnimationFrame(animateCloudLayer);
    };

    animateCloudLayer();

    materialCacheRef.current = {
      toonMaterial,
      realisticMaterial,
      outlineMaterial,
      cloudMaterial,
      toonGradientTexture,
      earthTexture,
      topologyTexture,
      lowPolyTexture: null,
    };

    createLowPolyTexture('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg').then(
      (lowPolyTexture) => {
        if (!materialCacheRef.current || !lowPolyTexture) {
          if (lowPolyTexture) {
            lowPolyTexture.dispose();
          }
          return;
        }

        materialCacheRef.current.lowPolyTexture = lowPolyTexture;
        materialCacheRef.current.toonMaterial.map = lowPolyTexture;
        materialCacheRef.current.toonMaterial.needsUpdate = true;
      }
    );

    applyVisualMode(globe, 'cartoon');
    applyPointStyles(globe, 'cartoon', cartoonPalette);
    applyLayerStyles(globe, 'cartoon', cartoonPalette);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.45;
    globe.controls().enablePan = false;
    globe.controls().minDistance = 130;
    globe.controls().maxDistance = 370;

    const syncZoomDetail = () => {
      applyZoomDetail(globe);
    };

    globe.controls().addEventListener('change', syncZoomDetail);

    globe.pointOfView(viewpoints.global, 0);
    applyZoomDetail(globe, true);

    const updateGlobeSize = () => {
      if (!globeContainerRef.current) {
        return;
      }

      globe
        .width(globeContainerRef.current.clientWidth)
        .height(globeContainerRef.current.clientHeight);
    };

    updateGlobeSize();
    window.addEventListener('resize', updateGlobeSize);

    globeRef.current = globe;

    return () => {
      window.removeEventListener('resize', updateGlobeSize);
      globe.controls().removeEventListener('change', syncZoomDetail);
      globe.pauseAnimation();
      if (accentLayersRef.current.animationId) {
        window.cancelAnimationFrame(accentLayersRef.current.animationId);
      }

      if (accentLayersRef.current.scene && accentLayersRef.current.outlineMesh) {
        accentLayersRef.current.scene.remove(accentLayersRef.current.outlineMesh);
        accentLayersRef.current.outlineMesh.geometry.dispose();
      }

      if (accentLayersRef.current.scene && accentLayersRef.current.cloudMesh) {
        accentLayersRef.current.scene.remove(accentLayersRef.current.cloudMesh);
        accentLayersRef.current.cloudMesh.geometry.dispose();
      }

      accentLayersRef.current = {
        outlineMesh: null,
        cloudMesh: null,
        scene: null,
        animationId: null,
      };

      if (materialCacheRef.current) {
        materialCacheRef.current.toonMaterial.dispose();
        materialCacheRef.current.realisticMaterial.dispose();
        materialCacheRef.current.outlineMaterial.dispose();
        materialCacheRef.current.cloudMaterial.dispose();
        materialCacheRef.current.toonGradientTexture.dispose();
        materialCacheRef.current.earthTexture.dispose();
        materialCacheRef.current.topologyTexture.dispose();
        if (materialCacheRef.current.lowPolyTexture) {
          materialCacheRef.current.lowPolyTexture.dispose();
        }
      }
      if (globeContainerRef.current) {
        globeContainerRef.current.innerHTML = '';
      }
      materialCacheRef.current = null;
      detailStateRef.current = { terrainVisible: false };
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!globeRef.current) {
      return;
    }

    applyVisualMode(globeRef.current, visualMode);
    applyPointStyles(globeRef.current, visualMode, cartoonPalette);
    applyLayerStyles(globeRef.current, visualMode, cartoonPalette);
  }, [visualMode, cartoonPalette]);

  const moveCamera = (viewKey) => {
    const view = viewpoints[viewKey];
    if (!view || !globeRef.current) {
      return;
    }

    globeRef.current.pointOfView(view, 1200);
  };

  return (
    <div className="content-section earth-page">
      <section className="earth-card">
        <div className="earth-header">
          <p className="section-kicker">Interactive Planet View</p>
          <h1>Cartoon Earth Explorer</h1>
          <p>
            Drag to orbit, scroll to zoom, and jump to key regions. Use the visual toggle to switch
            between a realistic look and a cel-shaded cartoon planet with a low-poly land and ocean
            map. Air routes, wind currents, and cloud layers keep it lively. Zoom in to reveal
            mountain and hill terrain details.
          </p>
        </div>

        <div className="earth-visual-toggle" role="group" aria-label="Earth visual mode">
          <button
            type="button"
            className={`button-link secondary-link ${visualMode === 'realistic' ? 'is-active' : ''}`}
            onClick={() => setVisualMode('realistic')}
          >
            Realistic
          </button>
          <button
            type="button"
            className={`button-link secondary-link ${visualMode === 'cartoon' ? 'is-active' : ''}`}
            onClick={() => setVisualMode('cartoon')}
          >
            Cartoon
          </button>
        </div>

        <div className="earth-palette-toggle" role="group" aria-label="Cartoon palette">
          {Object.entries(cartoonPalettes).map(([key, palette]) => (
            <button
              key={key}
              type="button"
              className={`button-link secondary-link ${cartoonPalette === key ? 'is-active' : ''}`}
              onClick={() => setCartoonPalette(key)}
              disabled={visualMode !== 'cartoon'}
              aria-pressed={cartoonPalette === key}
            >
              {palette.label}
            </button>
          ))}
        </div>

        <div className="earth-actions" role="group" aria-label="Jump to regions">
          <button type="button" className="button-link secondary-link" onClick={() => moveCamera('global')}>
            Global
          </button>
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => moveCamera('northAmerica')}
          >
            North America
          </button>
          <button type="button" className="button-link secondary-link" onClick={() => moveCamera('europe')}>
            Europe
          </button>
          <button type="button" className="button-link secondary-link" onClick={() => moveCamera('asia')}>
            Asia
          </button>
        </div>

        <div className="earth-globe-wrap">
          <div className="earth-globe" ref={globeContainerRef} aria-label="3D Earth globe simulation" />
        </div>
      </section>
    </div>
  );
}

export default Earth;