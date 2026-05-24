import React, { useEffect, useRef } from 'react';
import Globe from 'globe.gl';
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

function Earth() {
  const globeContainerRef = useRef(null);
  const globeRef = useRef(null);

  useEffect(() => {
    if (!globeContainerRef.current || globeRef.current) {
      return;
    }

    const globe = Globe()(globeContainerRef.current)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#8fd9ff')
      .atmosphereAltitude(0.24)
      .pointsData(hotspots)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude('size')
      .pointRadius(0.2)
      .pointColor(() => '#ffd26f')
      .pointLabel((d) => d.label);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.45;
    globe.controls().enablePan = false;
    globe.controls().minDistance = 130;
    globe.controls().maxDistance = 370;

    globe.pointOfView(viewpoints.global, 0);

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
      globe.pauseAnimation();
      if (globeContainerRef.current) {
        globeContainerRef.current.innerHTML = '';
      }
      globeRef.current = null;
    };
  }, []);

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
          <h1>Earth Explorer</h1>
          <p>
            Drag to orbit, scroll to zoom, and jump to key regions. This is a lightweight Earth
            simulation inspired by the Google Earth interaction style.
          </p>
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