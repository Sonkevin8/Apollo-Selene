// MapPhaser — Auckland map powered by Leaflet + OpenStreetMap
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const AUCKLAND = { lat: -36.8509, lng: 174.7645 };
const DEFAULT_ZOOM = 13;

const MapPhaser = ({ userLocation, mixtapePegs = [] }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const pegMarkersRef = useRef([]);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [AUCKLAND.lat, AUCKLAND.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      pegMarkersRef.current = [];
    };
  }, []);

  // Update user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    const target = userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)
      ? userLocation
      : AUCKLAND;

    const pulseIcon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#e63946;border:2px solid #fff;box-shadow:0 0 0 4px rgba(230,57,70,0.35);animation:pulse-dot 1.2s ease-in-out infinite;"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    userMarkerRef.current = L.marker([target.lat, target.lng], { icon: pulseIcon })
      .addTo(map)
      .bindPopup('Auckland');
  }, [userLocation]);

  // Update mixtape peg markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    pegMarkersRef.current.forEach((m) => m.remove());
    pegMarkersRef.current = [];

    mixtapePegs.forEach(({ lat, lng }, i) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const pegIcon = L.divIcon({
        className: '',
        html: '<div style="width:12px;height:12px;border-radius:50%;background:#ffd700;border:2px solid #cc8800;box-shadow:0 0 0 3px rgba(255,215,0,0.4);"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const marker = L.marker([lat, lng], { icon: pegIcon })
        .addTo(map)
        .bindPopup(`Mixtape Peg ${i + 1}`);
      pegMarkersRef.current.push(marker);
    });
  }, [JSON.stringify(mixtapePegs)]);

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 4px rgba(230,57,70,0.35); }
          50% { box-shadow: 0 0 0 8px rgba(230,57,70,0.1); }
        }
        .leaflet-container { font-family: inherit; }
      `}</style>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden' }}
      />
    </>
  );
};

export default MapPhaser;

