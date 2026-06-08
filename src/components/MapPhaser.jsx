// MapPhaser — Auckland community map with animated trees + people pegs
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const AUCKLAND = { lat: -36.8509, lng: 174.7645 };

// Auckland park / green space locations for animated trees
const TREE_SPOTS = [
  { lat: -36.8523, lng: 174.7651 }, { lat: -36.8560, lng: 174.7700 },
  { lat: -36.8480, lng: 174.7580 }, { lat: -36.8610, lng: 174.7490 },
  { lat: -36.8440, lng: 174.7760 }, { lat: -36.8590, lng: 174.7820 },
  { lat: -36.8350, lng: 174.7640 }, { lat: -36.8670, lng: 174.7560 },
  { lat: -36.8500, lng: 174.7400 }, { lat: -36.8720, lng: 174.7700 },
  { lat: -36.8410, lng: 174.7830 }, { lat: -36.8630, lng: 174.7380 },
];

// CSS pixel-art person (bobbing animation) for user pegs
const makePersonIcon = (seed = 0) => {
  const hues = [260, 200, 320, 160, 40, 0, 180];
  const h = hues[seed % hues.length];
  const delay = (seed * 0.17).toFixed(2);
  const noteDelay = (seed * 0.53).toFixed(2);
  const notes = ['♪', '♫', '♩'];
  const note = notes[seed % notes.length];
  return L.divIcon({
    className: '',
    html: `
      <div class="auck-person" style="animation-delay:${delay}s;overflow:visible">
        <div class="ap-hat" style="background:hsl(${h},60%,35%)"></div>
        <div class="ap-head"></div>
        <div class="ap-body" style="background:hsl(${h},55%,45%)"></div>
        <div class="ap-legs">
          <div class="ap-leg ap-leg-l"></div>
          <div class="ap-leg ap-leg-r" style="animation-delay:${(parseFloat(delay)+0.22).toFixed(2)}s"></div>
        </div>
        <div class="ap-shadow"></div>
        <div class="ap-note" style="animation-delay:${noteDelay}s;color:hsl(${h},85%,68%)">${note}</div>
      </div>`,
    iconSize: [20, 34],
    iconAnchor: [10, 34],
  });
};

// Animated tree divIcon
const makeTreeIcon = (seed = 0) => {
  const greens = ['#2d7a1f','#3a8a28','#1e6b14','#4a9a35','#267030'];
  const g = greens[seed % greens.length];
  const delay = (seed * 0.31).toFixed(2);
  return L.divIcon({
    className: '',
    html: `
      <div class="auck-tree" style="animation-delay:${delay}s;transform-origin:bottom center;">
        <div class="at-canopy-back" style="background:${g}cc"></div>
        <div class="at-canopy" style="background:${g}"></div>
        <div class="at-canopy-top" style="background:${g}dd"></div>
        <div class="at-trunk"></div>
        <div class="at-shadow"></div>
      </div>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
  });
};

const youAreHereIcon = L.divIcon({
  className: '',
  html: `<div class="auck-you">
    <div class="auck-you-dot"></div>
    <div class="auck-you-ring"></div>
    <div class="auck-you-ring auck-you-ring--2"></div>
    <div class="auck-you-ring auck-you-ring--3"></div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const cassettteHubIcon = L.divIcon({
  className: '',
  html: `<div class="auck-cassette">
    <div class="ac-body">
      <div class="ac-window">
        <div class="ac-reel ac-reel-l"></div>
        <div class="ac-reel ac-reel-r"></div>
      </div>
    </div>
    <div class="ac-pulse"></div>
    <div class="ac-pulse ac-pulse--2"></div>
    <div class="ac-label">MIX</div>
  </div>`,
  iconSize: [38, 32],
  iconAnchor: [19, 16],
});

const ANIM_CSS = `
  @keyframes ap-bob       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes ap-walk      { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(18deg)} }
  @keyframes tree-sway    { 0%,100%{transform:rotate(0deg)} 40%{transform:rotate(2.5deg)} 70%{transform:rotate(-1.5deg)} }
  @keyframes you-pulse    { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(2.8);opacity:0} }
  @keyframes ap-note-rise { 0%{transform:translateX(-50%) translateY(0) scale(1);opacity:1} 100%{transform:translateX(-50%) translateY(-26px) scale(0.65);opacity:0} }
  @keyframes ac-reel-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes ac-pulse     { 0%,100%{transform:scale(1);opacity:0.65} 50%{transform:scale(2.2);opacity:0} }
  @keyframes map-note-drift{ 0%{transform:translateY(0) rotate(-8deg);opacity:0} 12%{opacity:0.65} 85%{opacity:0.4} 100%{transform:translateY(-340px) rotate(14deg);opacity:0} }
  @keyframes map-scan     { 0%{transform:translateY(-100%)} 100%{transform:translateY(420px)} }

  .auck-person { position:relative; width:20px; height:34px; animation:ap-bob 1.1s ease-in-out infinite; cursor:pointer; }
  .ap-hat  { width:14px;height:5px;border-radius:3px 3px 0 0;margin:0 auto; }
  .ap-head { width:10px;height:10px;border-radius:50%;background:#d4956a;margin:0 auto;border:1px solid #b07848; }
  .ap-body { width:14px;height:10px;border-radius:4px 4px 0 0;margin:0 auto; }
  .ap-legs { display:flex;justify-content:center;gap:2px;width:14px;margin:0 auto; }
  .ap-leg  { width:5px;height:8px;border-radius:0 0 3px 3px;background:#3d2b60;animation:ap-walk 0.55s ease-in-out infinite alternate; }
  .ap-shadow{ width:10px;height:3px;border-radius:50%;background:rgba(0,0,0,0.2);margin:1px auto 0; }
  .ap-note { position:absolute;top:-14px;left:50%;font-size:11px;font-style:normal;animation:ap-note-rise 2s ease-out infinite;pointer-events:none;text-shadow:0 0 4px currentColor; }

  .auck-tree { position:relative; width:28px; height:40px; animation:tree-sway 3.4s ease-in-out infinite; cursor:default; }
  .at-canopy-back{ position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:26px;height:20px;border-radius:50%;opacity:0.5; }
  .at-canopy     { position:absolute;bottom:14px;left:50%;transform:translateX(-50%);width:24px;height:22px;border-radius:50%; }
  .at-canopy-top { position:absolute;bottom:22px;left:50%;transform:translateX(-50%);width:16px;height:16px;border-radius:50%; }
  .at-trunk      { position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:6px;height:14px;background:#6b3d1e;border-radius:2px; }
  .at-shadow     { position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:14px;height:4px;border-radius:50%;background:rgba(0,0,0,0.18); }

  .auck-you       { position:relative;width:40px;height:40px; }
  .auck-you-dot   { position:absolute;inset:14px;border-radius:50%;background:#e63946;border:2px solid #fff;box-shadow:0 0 0 2px rgba(230,57,70,0.5); }
  .auck-you-ring  { position:absolute;inset:0;border-radius:50%;border:2px solid rgba(230,57,70,0.6);animation:you-pulse 1.6s ease-out infinite; }
  .auck-you-ring--2 { animation-delay:0.55s; }
  .auck-you-ring--3 { animation-delay:1.1s; }

  .auck-cassette { position:relative;width:38px;height:32px;cursor:pointer; }
  .ac-body { width:38px;height:22px;background:#1a003a;border-radius:4px;border:1.5px solid rgba(180,0,255,0.75);box-shadow:0 0 10px rgba(180,0,255,0.5),inset 0 0 6px rgba(180,0,255,0.2); }
  .ac-window { display:flex;justify-content:space-around;align-items:center;height:100%;padding:0 6px; }
  .ac-reel { width:8px;height:8px;border-radius:50%;border:2px solid rgba(210,0,255,0.9);box-shadow:0 0 4px rgba(200,0,255,0.6);animation:ac-reel-spin 1.1s linear infinite; }
  .ac-reel-r { animation-direction:reverse;animation-duration:0.9s; }
  .ac-pulse { position:absolute;inset:-5px;border-radius:8px;border:1.5px solid rgba(180,0,255,0.55);animation:ac-pulse 2s ease-out infinite; }
  .ac-pulse--2 { animation-delay:1s; }
  .ac-label { position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;letter-spacing:0.12em;color:rgba(210,100,255,0.9);text-shadow:0 0 6px rgba(180,0,255,0.8);white-space:nowrap; }

  .map-float-note { position:absolute;font-size:17px;pointer-events:none;animation:map-note-drift linear infinite; }
  .map-float-note--1 { left:7%;  bottom:0;animation-duration:7.2s;animation-delay:0s;   color:rgba(180,0,255,0.55); }
  .map-float-note--2 { left:21%; bottom:0;animation-duration:5.8s;animation-delay:1.4s; color:rgba(100,149,237,0.55); }
  .map-float-note--3 { left:44%; bottom:0;animation-duration:8.5s;animation-delay:2.9s; color:rgba(200,0,255,0.5); }
  .map-float-note--4 { left:66%; bottom:0;animation-duration:6.4s;animation-delay:0.8s; color:rgba(180,0,255,0.52); }
  .map-float-note--5 { left:84%; bottom:0;animation-duration:7.8s;animation-delay:3.6s; color:rgba(100,200,255,0.5); }
  .map-scan-line { position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(180,0,255,0.18) 30%,rgba(200,100,255,0.22) 50%,rgba(180,0,255,0.18) 70%,transparent);pointer-events:none;animation:map-scan 5s linear infinite;z-index:910; }

  .auck-map-panel { animation: panel-slide-in 0.22s ease-out both; }
  @keyframes panel-slide-in { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
`;

const MapPhaser = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const treeMarkersRef = useRef([]);
  const youMarkerRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load profiles with location
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('profiles')
      .select('id, display_name, username, city, bio, address_lat, address_lng')
      .not('address_lat', 'is', null)
      .not('address_lng', 'is', null)
      .then(({ data }) => setUsers(data || []));
  }, []);

  // Initialise map + geolocation
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [AUCKLAND.lat, AUCKLAND.lng],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Plant animated trees at Auckland green spots
    TREE_SPOTS.forEach((spot, i) => {
      const m = L.marker([spot.lat, spot.lng], { icon: makeTreeIcon(i), interactive: false }).addTo(map);
      treeMarkersRef.current.push(m);
    });

    // Mixtape exchange hub at Auckland centre
    L.marker([AUCKLAND.lat, AUCKLAND.lng], { icon: cassettteHubIcon, zIndexOffset: 300 })
      .addTo(map)
      .bindTooltip('Mixtape Exchange Hub', { direction: 'top', offset: [0, -18] });

    // Geolocation: zoom to visitor's position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 14, { animate: true });
          if (youMarkerRef.current) youMarkerRef.current.remove();
          youMarkerRef.current = L.marker([latitude, longitude], { icon: youAreHereIcon, zIndexOffset: 500 })
            .addTo(map)
            .bindTooltip('You are here', { direction: 'top', offset: [0, -12] });
        },
        () => { /* permission denied — stay on Auckland */ },
        { timeout: 6000 }
      );
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      treeMarkersRef.current = [];
      youMarkerRef.current = null;
    };
  }, []);

  // Profile panel loader
  const openProfile = useCallback(async (profile) => {
    setLoadingProfile(true);
    setSelected({ profile, artwork: [], mixtapes: [] });
    const [artRes, mixRes] = await Promise.all([
      supabase.from('gallery_items').select('id,title,image_url,price,medium,year').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('mixtape_uploads').select('id,title,file_url,price,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }),
    ]);
    setSelected({ profile, artwork: artRes.data || [], mixtapes: mixRes.data || [] });
    setLoadingProfile(false);
  }, []);

  // Render animated-person markers for each user
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    users.forEach((profile, i) => {
      const lat = parseFloat(profile.address_lat);
      const lng = parseFloat(profile.address_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.marker([lat, lng], { icon: makePersonIcon(i), zIndexOffset: 200 })
        .addTo(map)
        .bindTooltip(profile.display_name || profile.username || 'Member', { direction: 'top', offset: [0, -36] })
        .on('click', () => openProfile(profile));
      markersRef.current.push(marker);
    });
  }, [users, openProfile]);

  const handleBuy = (item, type) => {
    const subject = encodeURIComponent(`Purchase enquiry: ${item.title}`);
    const body = encodeURIComponent(`Hi,\n\nI'm interested in purchasing "${item.title}" (${type}) listed at NZD ${item.price}.\n\nPlease get in touch.`);
    window.open(`mailto:hello@apolloselene.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <style>{ANIM_CSS}{`
        .auck-map-panel {
          position:absolute; top:0; right:0; width:300px; max-height:400px;
          overflow-y:auto; background:var(--card-bg,#1a1a2e);
          border:1px solid var(--border-color,rgba(255,255,255,0.1));
          border-radius:12px; padding:1rem; z-index:1000;
          box-shadow:0 4px 24px rgba(0,0,0,0.4); font-size:0.85rem;
        }
        .auck-map-panel h3{margin:0 0 0.25rem;font-size:1rem}
        .auck-close{float:right;background:none;border:none;color:inherit;cursor:pointer;font-size:1.1rem;margin-top:-2px}
        .auck-section{margin-top:0.75rem}
        .auck-section h4{margin:0 0 0.4rem;font-size:0.78rem;text-transform:uppercase;opacity:0.6}
        .auck-item{display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.06)}
        .auck-item:last-child{border-bottom:none}
        .auck-item img{width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0}
        .auck-item-info{flex:1;min-width:0}
        .auck-item-info strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .auck-item-info span{opacity:0.65;font-size:0.78rem}
        .auck-buy-btn{flex-shrink:0;padding:0.22rem 0.55rem;border-radius:6px;border:1px solid var(--button-bg,#6c63ff);background:transparent;color:var(--button-bg,#6c63ff);cursor:pointer;font-size:0.76rem;white-space:nowrap}
        .auck-buy-btn:hover{background:var(--button-bg,#6c63ff);color:#fff}
        .auck-audio{width:100%;margin-top:0.25rem}
        .auck-empty{opacity:0.5;font-style:italic;font-size:0.8rem}
        .leaflet-container{font-family:inherit}
      `}</style>

      <div ref={containerRef} style={{ width: '100%', height: '420px', borderRadius: '12px', overflow: 'hidden' }} />

      {/* Drifting music notes + scan line overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '12px', zIndex: 900 }}>
        <span className="map-float-note map-float-note--1">♪</span>
        <span className="map-float-note map-float-note--2">♫</span>
        <span className="map-float-note map-float-note--3">♩</span>
        <span className="map-float-note map-float-note--4">♪</span>
        <span className="map-float-note map-float-note--5">♫</span>
        <div className="map-scan-line" />
      </div>

      {selected && (
        <div className="auck-map-panel">
          <button className="auck-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
          <h3>{selected.profile.display_name || selected.profile.username || 'Member'}</h3>
          {selected.profile.city && <div style={{ opacity: 0.6, fontSize: '0.76rem' }}>{selected.profile.city}</div>}
          {selected.profile.bio && <p style={{ margin: '0.4rem 0 0', opacity: 0.85, fontSize: '0.82rem' }}>{selected.profile.bio}</p>}
          {loadingProfile ? <p style={{ opacity: 0.5, marginTop: '0.75rem' }}>Loading…</p> : (
            <>
              <div className="auck-section">
                <h4>Artwork</h4>
                {selected.artwork.length === 0
                  ? <p className="auck-empty">No artwork listed yet.</p>
                  : selected.artwork.map((item) => (
                    <div key={item.id} className="auck-item">
                      {item.image_url && <img src={item.image_url} alt={item.title} />}
                      <div className="auck-item-info">
                        <strong>{item.title}</strong>
                        <span>{item.medium}{item.year ? ` · ${item.year}` : ''}</span>
                      </div>
                      {item.price != null
                        ? <button className="auck-buy-btn" onClick={() => handleBuy(item, 'artwork')}>NZD {Number(item.price).toFixed(2)}</button>
                        : <span style={{ opacity: 0.4, fontSize: '0.72rem' }}>NFS</span>}
                    </div>
                  ))}
              </div>
              <div className="auck-section">
                <h4>Mixtapes</h4>
                {selected.mixtapes.length === 0
                  ? <p className="auck-empty">No mixtapes uploaded yet.</p>
                  : selected.mixtapes.map((item) => (
                    <div key={item.id} className="auck-item" style={{ flexWrap: 'wrap' }}>
                      <div className="auck-item-info" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ flex: 1 }}>{item.title || 'Untitled Mixtape'}</strong>
                        {item.price != null && <button className="auck-buy-btn" onClick={() => handleBuy(item, 'mixtape')}>NZD {Number(item.price).toFixed(2)}</button>}
                      </div>
                      <audio className="auck-audio" controls src={item.file_url} />
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPhaser;
