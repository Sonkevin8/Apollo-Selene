import React, { useEffect, useMemo, useRef, useState } from 'react';
import MapPhaser from '../components/MapPhaser';
import Globe from 'globe.gl';
import * as THREE from 'three';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import './Earth.css';

const viewpoints = {
  global: { lat: 18, lng: 10, altitude: 2.1 },
  northAmerica: { lat: 39.5, lng: -98.35, altitude: 1.35 },
  europe: { lat: 50.11, lng: 8.68, altitude: 1.2 },
  asia: { lat: 35.68, lng: 139.69, altitude: 1.3 },
};

const DELIVERY_TABLE_NAME = import.meta.env.VITE_DELIVERY_TABLE || 'mixtape_routes_public';

const demoDeliveryRoutes = [
  {
    id: 'route-1',
    sender: 'Moonwax Pressing, Detroit',
    receiver: 'DJ Solara, Berlin',
    senderAirportCode: 'DTW',
    receiverAirportCode: 'BER',
    startLat: 42.3314,
    startLng: -83.0458,
    endLat: 52.52,
    endLng: 13.405,
    altitude: 0.29,
    durationSeconds: 8 * 60 * 60,
    offsetSeconds: 0,
    createdAtMs: Date.now() - 3.1 * 60 * 60 * 1000,
    status: 'in_flight',
  },
  {
    id: 'route-2',
    sender: 'Pulse Crate Studio, London',
    receiver: 'DJ Kairo, Lagos',
    senderAirportCode: 'LHR',
    receiverAirportCode: 'LOS',
    startLat: 51.5072,
    startLng: -0.1276,
    endLat: 6.5244,
    endLng: 3.3792,
    altitude: 0.24,
    durationSeconds: 6 * 60 * 60,
    offsetSeconds: 11 * 60,
    createdAtMs: Date.now() - 2.2 * 60 * 60 * 1000,
    status: 'in_flight',
  },
  {
    id: 'route-3',
    sender: 'Neon Tape Works, Tokyo',
    receiver: 'DJ Noctis, Sydney',
    senderAirportCode: 'HND',
    receiverAirportCode: 'SYD',
    startLat: 35.6764,
    startLng: 139.65,
    endLat: -33.8688,
    endLng: 151.2093,
    altitude: 0.22,
    durationSeconds: 9 * 60 * 60,
    offsetSeconds: 7 * 60,
    createdAtMs: Date.now() - 4.4 * 60 * 60 * 1000,
    status: 'in_flight',
  },
  {
    id: 'route-4',
    sender: 'Solar Groove Lab, Sao Paulo',
    receiver: 'DJ Orpheus, New York',
    senderAirportCode: 'GRU',
    receiverAirportCode: 'JFK',
    startLat: -23.5505,
    startLng: -46.6333,
    endLat: 40.7128,
    endLng: -74.006,
    altitude: 0.28,
    durationSeconds: 10 * 60 * 60,
    offsetSeconds: 5 * 60,
    createdAtMs: Date.now() - 5.5 * 60 * 60 * 1000,
    status: 'in_flight',
  },
];

const createHubPoints = (routes) => {
  const uniqueHubs = new Map();

  routes.forEach((route) => {
    const senderKey = `${route.startLat}:${route.startLng}`;
    if (!uniqueHubs.has(senderKey)) {
      uniqueHubs.set(senderKey, {
        lat: route.startLat,
        lng: route.startLng,
        size: 0.35,
        label: `Sender Hub: ${route.sender}`,
        type: 'sender',
      });
    }

    const receiverKey = `${route.endLat}:${route.endLng}`;
    if (!uniqueHubs.has(receiverKey)) {
      uniqueHubs.set(receiverKey, {
        lat: route.endLat,
        lng: route.endLng,
        size: 0.35,
        label: `Receiver Hub: ${route.receiver}`,
        type: 'receiver',
      });
    }
  });

  return Array.from(uniqueHubs.values());
};

const numberFrom = (...values) => {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const stringFrom = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const unixMsFrom = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return Date.now();
};

const mapRowToDeliveryRoute = (row, index) => {
  const startLat = numberFrom(
    row.sender_airport_lat,
    row.sender_lat,
    row.origin_lat,
    row.from_lat,
    row.start_lat
  );
  const startLng = numberFrom(
    row.sender_airport_lng,
    row.sender_lng,
    row.origin_lng,
    row.from_lng,
    row.start_lng
  );
  const endLat = numberFrom(
    row.receiver_airport_lat,
    row.receiver_lat,
    row.destination_lat,
    row.to_lat,
    row.end_lat
  );
  const endLng = numberFrom(
    row.receiver_airport_lng,
    row.receiver_lng,
    row.destination_lng,
    row.to_lng,
    row.end_lng
  );

  if ([startLat, startLng, endLat, endLng].some((value) => value === null)) {
    return null;
  }

  const durationFromSeconds = numberFrom(
    row.duration_seconds,
    row.duration_seconds_estimate,
    row.duration,
    24 * 60
  );
  const durationFromFlightMinutes = (numberFrom(row.flight_duration_minutes, 0) || 0) * 60;
  const durationSeconds = Math.max(60, durationFromSeconds || 0, durationFromFlightMinutes);

  const flightDurationMinutes = Math.max(
    1,
    Math.round(numberFrom(row.flight_duration_minutes, durationSeconds / 60, 0))
  );

  return {
    id: String(row.id || row.order_id || `live-${index}`),
    sender:
      stringFrom(
        row.sender_airport_code,
        row.sender_airport_name,
        row.sender_hub,
        row.sender_name,
        row.sender,
        row.origin_name,
        row.from_name
      ) ||
      `Sender ${index + 1}`,
    receiver:
      stringFrom(
        row.receiver_airport_code,
        row.receiver_airport_name,
        row.receiver_hub,
        row.receiver_name,
        row.receiver,
        row.destination_name,
        row.to_name
      ) ||
      `Receiver ${index + 1}`,
    senderAirportCode: stringFrom(row.sender_airport_code, row.sender_hub, row.sender_name),
    receiverAirportCode: stringFrom(row.receiver_airport_code, row.receiver_hub, row.receiver_name),
    senderAddress: stringFrom(row.sender_address),
    receiverAddress: stringFrom(row.receiver_address),
    startLat,
    startLng,
    endLat,
    endLng,
    altitude: numberFrom(row.altitude, row.route_altitude, row.flight_altitude, 0.25),
    durationSeconds,
    offsetSeconds: numberFrom(row.offset_seconds, row.offset, index * 5, 0),
    createdAtMs: unixMsFrom(row.created_at, row.createdAt),
    status: stringFrom(row.status) || 'in_flight',
    flightDurationMinutes,
    senderVehicleMinutes: Math.round(numberFrom(row.sender_vehicle_minutes, 0)),
    receiverVehicleMinutes: Math.round(numberFrom(row.receiver_vehicle_minutes, 0)),
    totalVehicleMinutes: Math.round(
      numberFrom(
        row.total_vehicle_minutes,
        numberFrom(row.sender_vehicle_minutes, 0) + numberFrom(row.receiver_vehicle_minutes, 0),
        0
      )
    ),
  };
};

const DETAIL_ZOOM_DISTANCE = 200;
const MAP_SYSTEM_DISTANCE = 170;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getRouteProgress = (route, nowMs) => {
  if (route.status === 'delivered') {
    return 1;
  }

  const durationSeconds = Math.max(60, numberFrom(route.durationSeconds, route.duration, 0));
  const elapsedSeconds = (nowMs - numberFrom(route.createdAtMs, Date.now())) / 1000 +
    numberFrom(route.offsetSeconds, route.offset, 0);

  if (elapsedSeconds <= 0) {
    return 0;
  }

  return clamp(elapsedSeconds / durationSeconds, 0, 1);
};

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

const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;
const radiansToDegrees = (radians) => (radians * 180) / Math.PI;

const earthDistanceKm = (latOne, lngOne, latTwo, lngTwo) => {
  const radiusKm = 6371;
  const deltaLat = degreesToRadians(latTwo - latOne);
  const deltaLng = degreesToRadians(lngTwo - lngOne);

  const latOneRadians = degreesToRadians(latOne);
  const latTwoRadians = degreesToRadians(latTwo);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latOneRadians) * Math.cos(latTwoRadians) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radiusKm * c;
};

const toMapCoordinate = (lat, lng) => ({
  x: ((lng + 180) / 360) * 100,
  y: ((90 - lat) / 180) * 100,
});

const interpolateGreatCircle = (startLat, startLng, endLat, endLng, progress) => {
  const startLatRadians = degreesToRadians(startLat);
  const startLngRadians = degreesToRadians(startLng);
  const endLatRadians = degreesToRadians(endLat);
  const endLngRadians = degreesToRadians(endLng);

  const startVector = new THREE.Vector3(
    Math.cos(startLatRadians) * Math.cos(startLngRadians),
    Math.sin(startLatRadians),
    Math.cos(startLatRadians) * Math.sin(startLngRadians)
  );

  const endVector = new THREE.Vector3(
    Math.cos(endLatRadians) * Math.cos(endLngRadians),
    Math.sin(endLatRadians),
    Math.cos(endLatRadians) * Math.sin(endLngRadians)
  );

  const dotValue = THREE.MathUtils.clamp(startVector.dot(endVector), -1, 1);
  const omega = Math.acos(dotValue);

  if (omega < 1e-6) {
    return { lat: startLat, lng: startLng };
  }

  const sinOmega = Math.sin(omega);
  const scaleStart = Math.sin((1 - progress) * omega) / sinOmega;
  const scaleEnd = Math.sin(progress * omega) / sinOmega;

  const interpolated = startVector.clone().multiplyScalar(scaleStart).add(endVector.clone().multiplyScalar(scaleEnd)).normalize();

  const latitude = Math.asin(interpolated.y);
  const longitude = Math.atan2(interpolated.z, interpolated.x);

  return {
    lat: radiansToDegrees(latitude),
    lng: radiansToDegrees(longitude),
  };
};

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
  const deliveryRoutesRef = useRef(demoDeliveryRoutes);
  const hubPointsRef = useRef(createHubPoints(demoDeliveryRoutes));
  const supabaseChannelRef = useRef(null);
  const materialCacheRef = useRef(null);
  const detailStateRef = useRef({ terrainVisible: false });
  const mapSystemStateRef = useRef({
    active: false,
    lastUpdateTime: 0,
    lastFocus: { lat: viewpoints.global.lat, lng: viewpoints.global.lng },
  });
  const deliveryAnimationRef = useRef({ animationId: null, lastUiUpdate: 0 });
  const accentLayersRef = useRef({ outlineMesh: null, cloudMesh: null, scene: null, animationId: null });
  // Only realistic mode
  const [dataSourceLabel, setDataSourceLabel] = useState('Demo Routes');
  const [routeCount, setRouteCount] = useState(demoDeliveryRoutes.length);
  const [deliveryRoutesData, setDeliveryRoutesData] = useState(demoDeliveryRoutes);
  const [mapSystemActive, setMapSystemActive] = useState(false);
  const [mapFocus, setMapFocus] = useState({ lat: viewpoints.global.lat, lng: viewpoints.global.lng });
  const [mapZoomDistance, setMapZoomDistance] = useState(null);
  const [liveDeliveries, setLiveDeliveries] = useState([]);

  const getHotspotAndTerrainPoints = (includeTerrain) =>
    includeTerrain ? [...hubPointsRef.current, ...terrainPoints] : hubPointsRef.current;

  const applyDeliveryRoutes = (routes, sourceLabel) => {
    const safeRoutes = routes.length ? routes : demoDeliveryRoutes;

    deliveryRoutesRef.current = safeRoutes;
    hubPointsRef.current = createHubPoints(safeRoutes);
    setDeliveryRoutesData(safeRoutes);
    setRouteCount(safeRoutes.length);
    setDataSourceLabel(sourceLabel || (routes.length ? 'Live Orders' : 'Demo Routes'));
  };

  const applyPointStyles = (globe) => {
    globe
      .pointRadius((point) => {
        if (point.type === 'sender' || point.type === 'receiver') {
          return 0.25;
        }
        if (point.type === 'terrain-mountain') {
          return 0.075;
        }
        if (point.type === 'terrain-hill') {
          return 0.058;
        }
        return 0.2;
      })
      .pointColor((point) => {
        if (point.type === 'sender') {
          return '#ffc777';
        }
        if (point.type === 'receiver') {
          return '#d8f4a1';
        }
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
        .arcColor(() => ['#fff0c4', '#ff9a6b'])
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

  const updateMapSystemMode = (globe, force = false) => {
    const controls = globe.controls();
    const distance = typeof controls.getDistance === 'function' ? controls.getDistance() : Number.MAX_VALUE;
    const shouldActivateMap = distance <= MAP_SYSTEM_DISTANCE;
    const now = Date.now();
    const camera = globe.pointOfView();

    if (force || mapSystemStateRef.current.active !== shouldActivateMap) {
      mapSystemStateRef.current.active = shouldActivateMap;
      setMapSystemActive(shouldActivateMap);
    }

    if (!shouldActivateMap || !camera) {
      return;
    }

    const focusDelta = earthDistanceKm(
      mapSystemStateRef.current.lastFocus.lat,
      mapSystemStateRef.current.lastFocus.lng,
      camera.lat,
      camera.lng
    );

    if (force || now - mapSystemStateRef.current.lastUpdateTime > 180 || focusDelta > 35) {
      setMapFocus({ lat: camera.lat, lng: camera.lng });
      setMapZoomDistance(Math.round(distance));
      mapSystemStateRef.current.lastUpdateTime = now;
      mapSystemStateRef.current.lastFocus = { lat: camera.lat, lng: camera.lng };
    }
  };

  const nearbyHubPoints = useMemo(() => {
    if (!mapSystemActive) {
      return [];
    }

    return [...hubPointsRef.current]
      .map((hub) => ({
        ...hub,
        distanceKm: earthDistanceKm(mapFocus.lat, mapFocus.lng, hub.lat, hub.lng),
      }))
      .sort((first, second) => first.distanceKm - second.distanceKm)
      .slice(0, 8);
  }, [mapFocus, mapSystemActive, routeCount]);

  const nearbyCouriers = useMemo(() => {
    if (!mapSystemActive) {
      return [];
    }

    return [...liveDeliveries]
      .filter((delivery) => typeof delivery.lat === 'number' && typeof delivery.lng === 'number')
      .map((delivery) => ({
        ...delivery,
        distanceKm: earthDistanceKm(mapFocus.lat, mapFocus.lng, delivery.lat, delivery.lng),
      }))
      .sort((first, second) => first.distanceKm - second.distanceKm)
      .slice(0, 6);
  }, [liveDeliveries, mapFocus, mapSystemActive]);

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
      // Removed arcs (delivery lines) and rings (wind streaks)
      .htmlElementsData([])
      .htmlLat('lat')
      .htmlLng('lng')
      .htmlAltitude('altitude')
      .htmlElement((delivery) => {
        const marker = document.createElement('div');
        marker.className = 'stork-courier';
        marker.innerHTML = [
          '<span class="stork-body"></span>',
          '<span class="stork-wing stork-wing--left"></span>',
          '<span class="stork-wing stork-wing--right"></span>',
          '<span class="stork-beak"></span>',
          '<span class="stork-leg stork-leg--left"></span>',
          '<span class="stork-leg stork-leg--right"></span>',
          '<span class="stork-cassette-box">▣</span>',
        ].join('');
        marker.setAttribute('title', `${delivery.sender} to ${delivery.receiver}`);
        return marker;
      });

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
      emissiveIntensity: 0.2
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

    // Only realistic mode
    globe.showAtmosphere(true)
      .atmosphereColor('#79b9ff')
      .atmosphereAltitude(0.2)
      .pointColor(() => '#ffb656')
      .pointRadius(0.2);
    if (materialCacheRef.current) {
      globe.globeMaterial(materialCacheRef.current.realisticMaterial);
    }
    applyPointStyles(globe);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.45;
    globe.controls().enablePan = false;
    globe.controls().minDistance = 170; // Prevent zooming in too close
    globe.controls().maxDistance = 370;

    const syncZoomDetail = () => {
      applyZoomDetail(globe);
      updateMapSystemMode(globe);
    };

    globe.controls().addEventListener('change', syncZoomDetail);

      const updateDeliveries = (timeStamp) => {
      const nowMs = Date.now();

      const courierPositions = deliveryRoutesRef.current.map((route) => {
        const routeProgress = getRouteProgress(route, nowMs);
        const currentPosition = interpolateGreatCircle(
          route.startLat,
          route.startLng,
          route.endLat,
          route.endLng,
          routeProgress
        );

        return {
          id: route.id,
          sender: route.sender,
          receiver: route.receiver,
          senderAirportCode: route.senderAirportCode,
          receiverAirportCode: route.receiverAirportCode,
          senderAddress: route.senderAddress,
          receiverAddress: route.receiverAddress,
          flightDurationMinutes: route.flightDurationMinutes,
          senderVehicleMinutes: route.senderVehicleMinutes,
          receiverVehicleMinutes: route.receiverVehicleMinutes,
          totalVehicleMinutes: route.totalVehicleMinutes,
          routeStatus: route.status,
          lat: currentPosition.lat,
          lng: currentPosition.lng,
          altitude: route.altitude + 0.04 + Math.sin((timeStamp / 1000) * 3.3) * 0.015,
          progress: routeProgress,
        };
      });

      globe.htmlElementsData(courierPositions);

      if (timeStamp - deliveryAnimationRef.current.lastUiUpdate > 350) {
        setLiveDeliveries(
          courierPositions.map((courier) => {
            const percentage = Math.round(courier.progress * 100);
            const isDelivered = courier.routeStatus === 'delivered' || percentage >= 100;

            return {
              id: courier.id,
              sender: courier.sender,
              receiver: courier.receiver,
              senderAirportCode: courier.senderAirportCode,
              receiverAirportCode: courier.receiverAirportCode,
              senderAddress: courier.senderAddress,
              receiverAddress: courier.receiverAddress,
              flightDurationMinutes: courier.flightDurationMinutes,
              senderVehicleMinutes: courier.senderVehicleMinutes,
              receiverVehicleMinutes: courier.receiverVehicleMinutes,
              totalVehicleMinutes: courier.totalVehicleMinutes,
              progress: percentage,
              status: isDelivered ? 'Delivered' : percentage >= 94 ? 'Arriving Now' : 'In Flight',
              lat: courier.lat,
              lng: courier.lng,
            };
          })
        );
        deliveryAnimationRef.current.lastUiUpdate = timeStamp;
      }

      deliveryAnimationRef.current.animationId = window.requestAnimationFrame(updateDeliveries);
    };

    deliveryAnimationRef.current.animationId = window.requestAnimationFrame(updateDeliveries);

    globe.pointOfView(viewpoints.global, 0);
    applyZoomDetail(globe, true);
    updateMapSystemMode(globe, true);

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
      if (supabaseChannelRef.current && supabase) {
        supabase.removeChannel(supabaseChannelRef.current);
      }
      if (deliveryAnimationRef.current.animationId) {
        window.cancelAnimationFrame(deliveryAnimationRef.current.animationId);
      }
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
      mapSystemStateRef.current = {
        active: false,
        lastUpdateTime: 0,
        lastFocus: { lat: viewpoints.global.lat, lng: viewpoints.global.lng },
      };
      deliveryAnimationRef.current = { animationId: null, lastUiUpdate: 0 };
      supabaseChannelRef.current = null;
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!globeRef.current) {
      return;
    }

    globeRef.current.arcsData(deliveryRoutesData);
    applyZoomDetail(globeRef.current, true);
    updateMapSystemMode(globeRef.current, true);
  }, [deliveryRoutesData]);

  useEffect(() => {
    const loadLiveDeliveries = async () => {
      if (!isSupabaseConfigured || !supabase) {
        applyDeliveryRoutes(demoDeliveryRoutes, 'Demo Routes');
        return;
      }

      const { data, error } = await supabase
        .from(DELIVERY_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) {
        applyDeliveryRoutes(demoDeliveryRoutes, 'Demo Routes');
        return;
      }

      const mappedRoutes = (data || [])
        .map((row, index) => mapRowToDeliveryRoute(row, index))
        .filter(Boolean);

      applyDeliveryRoutes(mappedRoutes, mappedRoutes.length ? 'Live Orders' : 'Demo Routes');
    };

    loadLiveDeliveries();

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const channel = supabase
      .channel(`delivery-orders-${DELIVERY_TABLE_NAME}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DELIVERY_TABLE_NAME,
        },
        () => {
          loadLiveDeliveries();
        }
      )
      .subscribe();

    supabaseChannelRef.current = channel;

    return () => {
      if (supabaseChannelRef.current && supabase) {
        supabase.removeChannel(supabaseChannelRef.current);
      }
      supabaseChannelRef.current = null;
    };
  }, []);



  const moveCamera = (viewKey) => {
    const view = viewpoints[viewKey];
    if (!view || !globeRef.current) {
      return;
    }

    globeRef.current.pointOfView(view, 1200);
  };

  const exitMapSystem = () => {
    if (!globeRef.current) {
      return;
    }

    globeRef.current.pointOfView(viewpoints.global, 1100);
  };

  const focusNearestHub = () => {
    if (!globeRef.current || !nearbyHubPoints.length) {
      return;
    }

    const nearest = nearbyHubPoints[0];
    globeRef.current.pointOfView({ lat: nearest.lat, lng: nearest.lng, altitude: 1.08 }, 950);
  };

  const focusNearestCourier = () => {
    if (!globeRef.current || !nearbyCouriers.length) {
      return;
    }

    const nearest = nearbyCouriers[0];
    globeRef.current.pointOfView({ lat: nearest.lat, lng: nearest.lng, altitude: 1.02 }, 900);
  };

  return (
    <div className="content-section earth-page">
      <section className={`earth-card ${mapSystemActive ? 'earth-card--map-mode' : ''}`}>
        <div className="earth-header">
          <p className="section-kicker">Interactive Planet View</p>
          <h1>Stork Cassette Delivery Globe</h1>
          <p>
            Track music sets in a playful global simulation where storks carry cassette orders from
            sender studios to DJ receivers in real time. Drag to orbit, scroll to zoom, and zoom in
            for terrain detail.
          </p>
          <p className="earth-data-source">
            Data Source: {dataSourceLabel} | Active Routes: {routeCount}
          </p>
        </div>

        {/* Removed visual and palette toggles, only realistic mode remains */}

        {/* Removed region jump actions, only globe and map system remain */}

        {!mapSystemActive ? (
          <section className="delivery-panel" aria-label="Live delivery status">
            <h3>Live Stork Dispatch Board</h3>
            <p>Airport-to-airport flight arcs with separate first/last-mile vehicle time estimates.</p>
            <div className="delivery-list">
              {liveDeliveries.map((delivery) => (
                <article key={delivery.id} className="delivery-item">
                  <div className="delivery-headline">
                    <strong>{delivery.senderAirportCode || delivery.sender}</strong>
                    <span>to</span>
                    <strong>{delivery.receiverAirportCode || delivery.receiver}</strong>
                  </div>
                  <div className="delivery-meta">
                    <span>{delivery.status}</span>
                    <span>{delivery.progress}%</span>
                  </div>
                  <div className="delivery-meta">
                    <span>Flight: {delivery.flightDurationMinutes || 0} min</span>
                    <span>Vehicle: {delivery.totalVehicleMinutes || 0} min</span>
                  </div>
                  <div className="delivery-meta">
                    <span>{delivery.senderAddress || 'Sender address not set'}</span>
                    <span>{delivery.receiverAddress || 'Receiver address not set'}</span>
                  </div>
                  <div className="delivery-progress-track" aria-hidden="true">
                    <span className="delivery-progress-fill" style={{ width: `${delivery.progress}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className={`earth-globe-wrap ${mapSystemActive ? 'earth-globe-wrap--map-mode' : ''}`}>
          {mapSystemActive ? (
            <>
              {/* Pause globe animation when map is active */}
              {globeRef.current && globeRef.current.pauseAnimation && globeRef.current.pauseAnimation()}
              <MapPhaser
                userLocation={mapFocus}
                mixtapePegs={[
                  ...nearbyHubPoints.map(hub => ({ lat: hub.lat, lng: hub.lng })),
                  ...nearbyCouriers.map(courier => ({ lat: courier.lat, lng: courier.lng }))
                ]}
              />
            </>
          ) : (
            <div className="earth-globe" ref={globeContainerRef} aria-label="3D Earth globe simulation" />
          )}
        </div>
      </section>
    </div>
  );
}

export default Earth;