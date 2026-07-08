
import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { supabase, EVENTS_TABLE, EVENT_GUESTS_TABLE, EVENT_ATTENDANCE_TABLE } from '../lib/supabaseClient';


// Helper to call Supabase Edge Function for Stripe checkout
const createTicketCheckout = async ({ event, quantity = 1 }) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  }

  const origin = window.location.origin;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || anonKey;

  const res = await fetch(
    `${supabaseUrl}/functions/v1/create-ticket-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        quantity: Math.max(1, Math.min(10, Math.floor(quantity))),
        origin,
      }),
    }
  );

  if (!res.ok) {
    let msg = `Edge Function returned ${res.status}`;
    try { const e = await res.json(); msg = e?.error || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  if (data?.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data?.error || 'No checkout URL returned.');
  }
};
// Helper to call Supabase Edge Function for a voluntary contribution on free events
const createContributionCheckout = async ({ event, amountCents }) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  }

  const origin = window.location.origin;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || anonKey;

  const res = await fetch(
    `${supabaseUrl}/functions/v1/create-ticket-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        isContribution: true,
        eventId: event.id,
        eventTitle: event.title,
        amountCents,
        origin,
      }),
    }
  );

  if (!res.ok) {
    let msg = `Edge Function returned ${res.status}`;
    try { const e = await res.json(); msg = e?.error || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  if (data?.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data?.error || 'No checkout URL returned.');
  }
};

const ATTENDANCE_DETAILS_STORAGE_KEY = 'apollo-selene-attendance-details';
const CURRENT_USER_ID_STORAGE_KEY = 'apollo-selene-current-user-id';

const EVENT_PHASES = {
  apollo: 'apollo',
  selene: 'selene'
};

const defaultEvents = [
  {
    id: 1,
    title: 'Sunroom Sketch Session',
    date: '2024-12-28',
    time: '2:00 PM - 5:00 PM',
    location: 'Apollo Selene Lounge',
    description: 'A bright afternoon sketch session with tea, open tables, and enough quiet structure to ease into conversation while the room is full of daylight.',
    poster: 'https://images.pexels.com/photos/1109541/pexels-photo-1109541.jpeg?auto=compress&cs=tinysrgb&w=400',
    attendees: 23,
    maxAttendees: 50,
    phase: EVENT_PHASES.apollo
  },
  {
    id: 2,
    title: 'Moonlight Story Circle',
    date: '2025-01-05',
    time: '7:00 PM - 9:00 PM',
    location: 'Riverside Quiet Room',
    description: 'A low-pressure gathering for listening, reflecting, and sharing stories at your own pace in a calm environment.',
    poster: 'https://images.pexels.com/photos/1708936/pexels-photo-1708936.jpeg?auto=compress&cs=tinysrgb&w=400',
    attendees: 15,
    maxAttendees: 30,
    phase: EVENT_PHASES.selene
  },
  {
    id: 3,
    title: 'Apollo Selene Open House',
    date: '2025-01-15',
    time: '6:00 PM - 10:00 PM',
    location: 'The Lantern Hall',
    description: 'Meet the community, explore upcoming plans, and enjoy a welcoming night designed for easy conversation and gentle connection.',
    poster: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400',
    attendees: 42,
    maxAttendees: 100,
    phase: EVENT_PHASES.selene
  }
];

// Guest lists and attendance are now stored in Supabase

const createGuestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getCurrentUserId = () => {
  if (typeof window === 'undefined') {
    return 'server-user';
  }

  const existingUserId = window.localStorage.getItem(CURRENT_USER_ID_STORAGE_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  const newUserId = `user-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(CURRENT_USER_ID_STORAGE_KEY, newUserId);
  return newUserId;
};

const normalizeGuestEntry = (entry, index) => {
  if (typeof entry === 'string') {
    return {
      id: `legacy-${index}-${entry}`,
      name: entry,
      contact: '',
      addedBy: null
    };
  }

  return {
    id: entry?.id || createGuestId(),
    name: entry?.name || '',
    contact: entry?.contact || '',
    addedBy: entry?.addedBy || null
  };
};

const normalizeGuestLists = (guestLists) => {
  const normalized = {};

  Object.entries(guestLists || {}).forEach(([eventId, entries]) => {
    normalized[eventId] = (entries || [])
      .map((entry, index) => normalizeGuestEntry(entry, index))
      .filter((entry) => entry.name);
  });

  return normalized;
};

const isValidContact = (value) => {
  const trimmedValue = value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\+?[\d\s().-]{7,20}$/;

  return emailPattern.test(trimmedValue) || phonePattern.test(trimmedValue);
};

const getStoredJson = (key, fallbackValue) => {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  try {
    const savedValue = window.localStorage.getItem(key);
    if (!savedValue) {
      return fallbackValue;
    }

    return JSON.parse(savedValue);
  } catch {
    return fallbackValue;
  }
};

const inferEventPhase = (timeRange = '') => {
  const firstTime = timeRange.split('-')[0]?.trim() || timeRange.trim();
  const match = firstTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);

  if (!match) {
    return EVENT_PHASES.selene;
  }

  const hour = Number(match[1]) % 12;
  const minutes = Number(match[2] || 0);
  const meridiem = match[3].toUpperCase();
  const hour24 = meridiem === 'PM' ? hour + 12 : hour;
  const startsAfterDaylight = hour24 > 17 || (hour24 === 17 && minutes > 30);

  return startsAfterDaylight ? EVENT_PHASES.selene : EVENT_PHASES.apollo;
};

// Resolve an ordered array of up to 8 non-empty poster URLs from an event object.
// Supports both the new `posters` text[] column and the legacy `poster` string.
const resolvePosters = (event) => {
  const arr = Array.isArray(event?.posters) && event.posters.length
    ? event.posters
    : event?.poster
      ? [event.poster]
      : [];
  return arr.filter(Boolean).slice(0, 8);
};

const normalizeEvent = (event) => ({
  ...event,
  phase: event?.phase || inferEventPhase(event?.time)
});

const normalizeEvents = (items) => (items || []).map(normalizeEvent);

const isEventFinished = (event) => {
  if (!event?.date) return false;
  const endDate = new Date(event.date);
  const timeRange = event.time || '';
  const parts = timeRange.split('-').map((part) => part.trim()).filter(Boolean);
  const endTime = parts.length > 1 ? parts[1] : parts[0] || '';
  const match = endTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (match) {
    const hour = Number(match[1]) % 12;
    const minute = Number(match[2] || 0);
    const meridiem = match[3].toUpperCase();
    endDate.setHours(meridiem === 'PM' ? hour + 12 : hour, minute, 0, 0);
  } else {
    endDate.setHours(23, 59, 59, 999);
  }
  return endDate.getTime() <= Date.now();
};

// ── Inline poster slideshow ──────────────────────────────────────────────────
const PosterSlideshow = ({ images }) => {
  const [idx, setIdx] = React.useState(0);
  const valid = (images || []).filter(Boolean);
  if (!valid.length) return null;

  // Auto-advance
  React.useEffect(() => {
    if (valid.length <= 1) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % valid.length), 4000);
    return () => clearInterval(timer);
  }, [valid.length]);

  const prev = (e) => { e.stopPropagation(); setIdx((i) => (i - 1 + valid.length) % valid.length); };
  const next = (e) => { e.stopPropagation(); setIdx((i) => (i + 1) % valid.length); };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '0', lineHeight: 0, width: '100%', height: '100%' }}>
      <img
        src={valid[idx]}
        alt={`Poster ${idx + 1}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.3s' }}
      />
      {valid.length > 1 && (
        <>
          <button
            onClick={prev}
            style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
          >‹</button>
          <button
            onClick={next}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
          >›</button>
          <div style={{ position: 'absolute', bottom: 7, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 2 }}>
            {valid.map((_, i) => (
              <span
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? '#fff' : 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'inline-block', transition: 'background 0.2s' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const createEventDraft = (theme) => ({
  title: '',
  date: '',
  time: '',
  phase: theme === EVENT_PHASES.apollo ? EVENT_PHASES.apollo : EVENT_PHASES.selene,
  location: '',
  description: '',
  poster: '',
  posters: ['', '', '', '', '', '', '', ''],
  posterGalleryMap: [null, null, null, null, null, null, null, null],
  maxAttendees: 50,
  ticket_price: ''
});

const POSTER_BUCKET = 'event-posters';

const uploadPosterImage = async (file, index) => {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = file.name.split('.').pop().toLowerCase();
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!allowed.includes(ext)) throw new Error('Only JPG, PNG, WEBP, or GIF images are allowed.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image must be under 10 MB.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `posters/${Date.now()}-${index}-${safeName}`;
  const { error } = await supabase.storage.from(POSTER_BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(POSTER_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

const Events = ({ theme }) => {
  const { getToken } = useAuth();
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => window.localStorage.getItem('apollo-admin') === 'true');
  const [galleryItems, setGalleryItems] = useState([]);
  // sync admin state when other pages update it
  useEffect(() => {
    const syncAdmin = () => {
      setIsAdmin(window.localStorage.getItem('apollo-admin') === 'true');
      setAdminPassword(window.localStorage.getItem('apollo-admin-password') || '');
    };
    // initial sync
    syncAdmin();
    window.addEventListener('apollo-admin-changed', syncAdmin);
    return () => window.removeEventListener('apollo-admin-changed', syncAdmin);
  }, []);
  const [galleryActionLoading, setGalleryActionLoading] = useState({});
  const [galleryActionMsg, setGalleryActionMsg] = useState({});
  const [posterUploading, setPosterUploading] = useState([false, false, false, false, false, false, false, false]);
  const [posterUploadError, setPosterUploadError] = useState([null, null, null, null, null, null, null, null]);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [adminPassword, setAdminPassword] = useState(() => window.localStorage.getItem('apollo-admin-password') || '');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [newEvent, setNewEvent] = useState(() => createEventDraft(theme));
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventData, setEditEventData] = useState({
    title: '',
    date: '',
    time: '',
    phase: EVENT_PHASES.selene,
    location: '',
    description: '',
    poster: '',
    posters: ['', '', '', '', '', '', '', ''],
    posterGalleryMap: [null, null, null, null, null, null, null, null],
    maxAttendees: 50,
    ticket_price: ''
  });
  const [currentUserId] = useState(() => getCurrentUserId());
  // Guest/attendance state
  const [eventGuestLists, setEventGuestLists] = useState({});
  const [attendanceDetails, setAttendanceDetails] = useState({});
  const [userAttendance, setUserAttendance] = useState(new Set());
  const [openGuestListForEvent, setOpenGuestListForEvent] = useState(null);
  const [showAttendConfirm, setShowAttendConfirm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [attendeeForm, setAttendeeForm] = useState({ name: '', contact: '' });
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [extraGuestForm, setExtraGuestForm] = useState({ name: '', contact: '' });
  const [attendeeContactError, setAttendeeContactError] = useState('');
  const [extraGuestContactError, setExtraGuestContactError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [voucherInputs, setVoucherInputs] = useState({});   // eventId → code string
  const [voucherNames, setVoucherNames] = useState({});     // eventId → display name string
  const [voucherMsgs, setVoucherMsgs] = useState({});       // eventId → {text, ok}
  const [voucherOpen, setVoucherOpen] = useState({});       // eventId → bool
  const [voucherRedeeming, setVoucherRedeeming] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [attendConfirmLoading, setAttendConfirmLoading] = useState(false);
  const [addEventLoading, setAddEventLoading] = useState(false);
  const [editEventLoading, setEditEventLoading] = useState(false);
  const [attendActionLoading, setAttendActionLoading] = useState({});  // eventId → bool
  const [addGuestLoading, setAddGuestLoading] = useState(false);
  const [igModal, setIgModal] = useState(null);
  const [igCaption, setIgCaption] = useState('');
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState('');
  const [igSuccess, setIgSuccess] = useState('');
  const [qrModal, setQrModal] = useState(null);   // null or event object
  const [qrCopied, setQrCopied] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const [contributionModal, setContributionModal] = useState(null); // event object or null
  const [contributionAmount, setContributionAmount] = useState('10');
  const [contributionLoading, setContributionLoading] = useState(false);
  const [contributionError, setContributionError] = useState('');

  const redeemVoucher = async (event) => {
    const code = (voucherInputs[event.id] || '').trim().toUpperCase();
    const displayName = (voucherNames[event.id] || '').trim();
    if (!code) return;
    if (!displayName) {
      setVoucherMsgs((p) => ({ ...p, [event.id]: { text: 'Please enter your name.', ok: false } }));
      return;
    }
    setVoucherRedeeming((p) => ({ ...p, [event.id]: true }));
    setVoucherMsgs((p) => ({ ...p, [event.id]: null }));

    const { data, error } = await supabase
      .from('vouchers')
      .select('id, used')
      .eq('code', code)
      .single();

    if (error || !data) {
      setVoucherMsgs((p) => ({ ...p, [event.id]: { text: 'Voucher not found.', ok: false } }));
      setVoucherRedeeming((p) => ({ ...p, [event.id]: false }));
      return;
    }
    if (data.used) {
      setVoucherMsgs((p) => ({ ...p, [event.id]: { text: 'This voucher has already been used.', ok: false } }));
      setVoucherRedeeming((p) => ({ ...p, [event.id]: false }));
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const usedBy = session?.user?.email || session?.user?.id || 'guest';

    await supabase.from('vouchers').update({ used: true, used_at: new Date().toISOString(), used_by: usedBy }).eq('id', data.id);

    // Add user directly to guest list (same flow as Stripe success)
    const { data: existingAttendance } = await supabase
      .from(EVENT_ATTENDANCE_TABLE)
      .select('*')
      .eq('event_id', event.id)
      .eq('user_id', currentUserId);
    if (!existingAttendance || existingAttendance.length === 0) {
      const { data: newGuest } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .insert([{ event_id: event.id, name: displayName, contact: usedBy, added_by: currentUserId }])
        .select();
      const guestId = newGuest && newGuest[0]?.id;
      await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .upsert({ event_id: event.id, user_id: currentUserId, guest_id: guestId, name: displayName, contact: usedBy });
      const { data: evData } = await supabase.from(EVENTS_TABLE).select('*').eq('id', event.id).maybeSingle();
      if (evData) {
        await supabase.from(EVENTS_TABLE).update({ attendees: (evData.attendees || 0) + 1 }).eq('id', event.id);
      }
      // Refresh state
      const { data: evList } = await supabase.from(EVENTS_TABLE).select('*').order('date', { ascending: true });
      if (evList) setEvents(normalizeEvents(evList));
      const { data: guestData } = await supabase.from(EVENT_GUESTS_TABLE).select('*');
      const guestLists = {};
      (guestData || []).forEach(g => {
        if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
        guestLists[g.event_id].push(g);
      });
      setEventGuestLists(guestLists);
      const { data: attendanceData } = await supabase.from(EVENT_ATTENDANCE_TABLE).select('*');
      const attendanceMap = {};
      const userSet = new Set();
      (attendanceData || []).forEach(a => {
        attendanceMap[a.event_id] = a;
        if (a.user_id === currentUserId) userSet.add(a.event_id);
      });
      setAttendanceDetails(attendanceMap);
      setUserAttendance(userSet);

      // Send confirmation email if we have an address
      if (usedBy && usedBy.includes('@')) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const { data: { session: authSession } } = await supabase.auth.getSession();
          const accessToken = authSession?.access_token || anonKey;
          await fetch(`${supabaseUrl}/functions/v1/send-ticket-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({
              email: usedBy,
              eventTitle: event.title,
              eventDate: event.date,
              eventLocation: event.location,
            }),
          });
        } catch (_e) { /* don't block UI if email fails */ }
      }
    }

    setVoucherMsgs((p) => ({ ...p, [event.id]: { text: '✓ Voucher accepted — you\'re on the list!', ok: true } }));
    setVoucherOpen((p) => ({ ...p, [event.id]: false }));
    setVoucherInputs((p) => ({ ...p, [event.id]: '' }));
    setVoucherNames((p) => ({ ...p, [event.id]: '' }));
    setVoucherRedeeming((p) => ({ ...p, [event.id]: false }));
  };


  // Fetch events, guests, and attendance from Supabase on mount
  useEffect(() => {
    if (!supabase) { setLoadingEvents(false); return; }
    const fetchAll = async () => {
      setLoadingEvents(true);
      try {
        // Fetch all three in parallel
        const [eventRes, guestRes, attendanceRes] = await Promise.all([
          supabase.from(EVENTS_TABLE).select('*').order('date', { ascending: true }),
          supabase.from(EVENT_GUESTS_TABLE).select('*'),
          supabase.from(EVENT_ATTENDANCE_TABLE).select('*'),
        ]);
        if (eventRes.data) setEvents(normalizeEvents(eventRes.data));
        const guestLists = {};
        (guestRes.data || []).forEach(g => {
          if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
          guestLists[g.event_id].push(g);
        });
        setEventGuestLists(guestLists);
        const attendanceMap = {};
        const userSet = new Set();
        (attendanceRes.data || []).forEach(a => {
          attendanceMap[a.event_id] = a;
          if (a.user_id === currentUserId) userSet.add(a.event_id);
        });
        setAttendanceDetails(attendanceMap);
        setUserAttendance(userSet);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchAll();
  }, [currentUserId]);

  // Load gallery items whenever admin is active (covers page refresh while already logged in)
  useEffect(() => {
    if (isAdmin && supabase && galleryItems.length === 0) {
      supabase.from('gallery_items').select('id, title, artist').order('title').then(({ data }) => {
        if (data) setGalleryItems(data);
      });
    }
  }, [isAdmin]);

  // Deep-link: scroll to + highlight event from ?event= URL param
  useEffect(() => {
    if (loadingEvents) return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('event');
    if (!targetId) return;
    const el = document.getElementById(`event-card-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedEventId(targetId);
      setTimeout(() => setHighlightedEventId(null), 3500);
    }
  }, [loadingEvents]);

  const getEventUrl = (event) =>
    `${window.location.origin}/events?event=${event.id}`;

  const openQrModal = (event) => {
    setQrCopied(false);
    setQrModal(event);
  };

  const copyEventLink = async (event) => {
    const url = getEventUrl(event);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2200);
  };

  const downloadQrCode = async (event) => {
    setQrDownloading(true);
    try {
      const src = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(getEventUrl(event))}&margin=20`;
      const res = await fetch(src);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert('Failed to download QR code. Try right-clicking the QR image and saving it.');
    } finally {
      setQrDownloading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) {
      alert('Supabase is not configured.');
      return;
    }
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin', {
        body: { username: loginData.username, password: loginData.password },
      });
      if (error) {
        const detail = error?.context ? JSON.stringify(await error.context?.json?.().catch(() => error.context)) : '';
        alert(`Login error: ${error.message}\nStatus: ${error.status || 'unknown'}\nDetail: ${detail || JSON.stringify(error)}`);
        return;
      }
      if (!data?.success) {
        alert('Invalid credentials.');
        return;
      }
      setIsAdmin(true);
      window.localStorage.setItem('apollo-admin', 'true');
      setAdminPassword(loginData.password);
      window.localStorage.setItem('apollo-admin-password', loginData.password);
      setGalleryActionMsg({});
      setShowLogin(false);
      setLoginData({ username: '', password: '' });
      // galleryItems will be fetched by the isAdmin useEffect
    } finally {
      setLoginLoading(false);
    }
  };

  const openIgModal = (event) => {
    const posters = resolvePosters(event);
    const defaultCaption = `${event.title}\n📅 ${event.date}${event.time ? ' · ' + event.time : ''}\n📍 ${event.location || ''}\n\n${event.description || ''}\n\n#ApolloSelene #Event`;
    setIgCaption(defaultCaption);
    setIgError('');
    setIgSuccess('');
    setIgModal(event);
    if (!posters.length) {
      setIgError('This event has no poster image. Add a poster before posting to Instagram.');
    }
  };

  const addEventToGallery = async (event) => {
    if (!supabase) return;

    const posters = resolvePosters(event);
    const imageUrl = posters[0];
    if (!imageUrl) {
      setGalleryActionMsg((prev) => ({ ...prev, [event.id]: 'No poster image available to add.' }));
      return;
    }

    setGalleryActionLoading((prev) => ({ ...prev, [event.id]: true }));
    setGalleryActionMsg((prev) => ({ ...prev, [event.id]: '' }));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
      }

      // Prefer Clerk token if available via useAuth hook
      let clerkToken = null;
      try {
        if (typeof getToken === 'function') {
          clerkToken = await getToken();
        }
      } catch (e) {
        clerkToken = null;
      }

      // If we have a Clerk token, use the Clerk-backed function
      if (clerkToken) {
        const res = await fetch(`${supabaseUrl}/functions/v1/add-gallery-item-clerk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${clerkToken}`,
          },
          body: JSON.stringify({
            eventId: event.id,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location,
            title: event.title || 'Untitled Event Artwork',
            description: event.description || 'Artwork added from a completed Apollo Selene event.',
            medium: 'Event Poster',
            year: event.date ? new Date(event.date).getFullYear().toString() : '',
            story: `Added from the completed event on ${event.date}${event.time ? ` (${event.time})` : ''}.`,
            imageUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Edge function returned ${res.status}`);
        }
        setGalleryActionMsg((prev) => ({ ...prev, [event.id]: 'Added to gallery successfully.' }));
        return;
      }

      // Fall back to password-based auth if no Clerk token
      if (!isAdmin || !adminPassword) {
        throw new Error('Admin login is required to add events to the gallery.');
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/add-gallery-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          adminPassword,
          eventId: event.id,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          title: event.title || 'Untitled Event Artwork',
          description: event.description || 'Artwork added from a completed Apollo Selene event.',
          medium: 'Event Poster',
          year: event.date ? new Date(event.date).getFullYear().toString() : '',
          story: `Added from the completed event on ${event.date}${event.time ? ` (${event.time})` : ''}.`,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Edge function returned ${res.status}`);
      }
      setGalleryActionMsg((prev) => ({ ...prev, [event.id]: 'Added to gallery successfully.' }));

    } catch (error) {
      setGalleryActionMsg((prev) => ({ ...prev, [event.id]: error?.message || 'Failed to add to gallery.' }));
    } finally {
      setGalleryActionLoading((prev) => ({ ...prev, [event.id]: false }));
    }
  };

  const postToInstagram = async () => {
    if (!igModal) return;
    setIgError('');
    setIgSuccess('');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      setIgError('Supabase env vars missing.');
      return;
    }
    const imageUrl = resolvePosters(igModal)[0] || '';
    if (!imageUrl) {
      setIgError('This event has no poster image to post.');
      return;
    }
    setIgLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/post-instagram-ad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          imageUrl,
          caption: igCaption,
          adminToken: adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setIgSuccess(`Posted! Instagram post ID: ${data.postId}`);
    } catch (err) {
      setIgError(err.message || 'Failed to post to Instagram.');
    } finally {
      setIgLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!supabase) {
      alert('Supabase is not configured. Check your environment variables.');
      return;
    }
    setAddEventLoading(true);
    const event = {
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      phase: newEvent.phase || inferEventPhase(newEvent.time),
      location: newEvent.location,
      description: newEvent.description,
      poster: newEvent.posters.filter(Boolean)[0] || newEvent.poster || '',
      posters: newEvent.posters.filter(Boolean),
      max_attendees: newEvent.maxAttendees,
      attendees: 0,
      ticketed: newEvent.ticketed === true ? true : false,
      ticket_price: newEvent.ticketed && newEvent.ticket_price !== '' ? (parseFloat(newEvent.ticket_price) || null) : null,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from(EVENTS_TABLE).insert([event]);
    if (error) {
      alert('Failed to save event: ' + error.message);
      return;
    }
    const { data } = await supabase
      .from(EVENTS_TABLE)
      .select('*')
      .order('date', { ascending: true });
    setEvents(normalizeEvents(data));
    // Apply gallery image assignments
    for (let i = 0; i < 4; i++) {
      const galleryId = newEvent.posterGalleryMap?.[i];
      const url = (newEvent.posters[i] || '').trim();
      if (galleryId && url) {
        await supabase.from('gallery_items').update({ image_url: url }).eq('id', galleryId);
      }
    }
    setNewEvent(createEventDraft(theme));
    setShowAddEvent(false);
    setAddEventLoading(false);
  };

  const openEditEventModal = (event) => {
    setEditingEventId(event.id);
    setEditEventData({
      title: event.title,
      date: event.date,
      time: event.time,
      phase: event.phase || inferEventPhase(event.time),
      location: event.location,
      description: event.description,
      poster: event.poster,
      posters: Array.isArray(event.posters) && event.posters.length ? [...event.posters, '', '', '', '', '', '', '', ''].slice(0, 8) : [event.poster || '', '', '', '', '', '', '', ''],
      posterGalleryMap: [null, null, null, null, null, null, null, null],
      maxAttendees: event.maxAttendees,
      ticket_price: event.ticket_price != null ? String(event.ticket_price) : ''
    });
    if (isAdmin && supabase && galleryItems.length === 0) {
      supabase.from('gallery_items').select('id, title, artist').order('title').then(({ data }) => {
        if (data) setGalleryItems(data);
      });
    }
    setShowEditEvent(true);
  };

  const closeEditEventModal = () => {
    setShowEditEvent(false);
    setEditingEventId(null);
    setEditEventData({
      title: '',
      date: '',
      time: '',
      phase: EVENT_PHASES.selene,
      location: '',
      description: '',
      poster: '',
      posters: ['', '', '', '', '', '', '', ''],
      posterGalleryMap: [null, null, null, null, null, null, null, null],
      maxAttendees: 50
    });
  };

  const handleEditEvent = async (e) => {
    e.preventDefault();
    if (!editingEventId) {
      return;
    }
    setEditEventLoading(true);

    const parsedMaxAttendees = Number(editEventData.maxAttendees);
    const safeMaxAttendees = Number.isFinite(parsedMaxAttendees) && parsedMaxAttendees > 0
      ? parsedMaxAttendees
      : 1;

    const posterGalleryMap = editEventData.posterGalleryMap || [null, null, null, null, null, null, null, null];
    const update = {
      ...editEventData,
      phase: editEventData.phase || inferEventPhase(editEventData.time),
      posters: (editEventData.posters || []).filter(Boolean),
      max_attendees: safeMaxAttendees,
      ticket_price: editEventData.ticketed && editEventData.ticket_price !== ''
        ? (parseFloat(editEventData.ticket_price) || null)
        : null,
      updated_at: new Date().toISOString()
    };
    // Remove non-DB fields
    delete update.maxAttendees;
    delete update.posterGalleryMap;

    await supabase
      .from(EVENTS_TABLE)
      .update(update)
      .eq('id', editingEventId);

    // Refresh events from backend
    const { data } = await supabase
      .from(EVENTS_TABLE)
      .select('*')
      .order('date', { ascending: true });
    setEvents(normalizeEvents(data));
    // Apply gallery image assignments
    for (let i = 0; i < 4; i++) {
      const galleryId = posterGalleryMap[i];
      const url = ((editEventData.posters || [])[i] || '').trim();
      if (galleryId && url) {
        await supabase.from('gallery_items').update({ image_url: url }).eq('id', galleryId);
      }
    }

    setEditEventLoading(false);
    closeEditEventModal();
  };

  const handleDeleteEvent = async (eventId) => {
    const eventToDelete = events.find((event) => event.id === eventId);
    if (!eventToDelete) {
      return;
    }

    const confirmed = window.confirm(`Remove "${eventToDelete.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    await supabase
      .from(EVENTS_TABLE)
      .delete()
      .eq('id', eventId);

    // Refresh events from backend
    const { data } = await supabase
      .from(EVENTS_TABLE)
      .select('*')
      .order('date', { ascending: true });
    setEvents(normalizeEvents(data));

    setEventGuestLists((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setAttendanceDetails((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setUserAttendance((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });

    if (openGuestListForEvent === eventId) {
      closeGuestListModal();
    }
    if (selectedEventId === eventId) {
      closeAttendConfirm();
    }
    if (editingEventId === eventId) {
      closeEditEventModal();
    }
  };

  const closeAttendConfirm = () => {
    setShowAttendConfirm(false);
    setSelectedEventId(null);
    setAttendeeForm({ name: '', contact: '' });
    setAttendeeContactError('');
  };

  const openAttendConfirm = (eventId) => {
    setSelectedEventId(eventId);
    setShowAttendConfirm(true);
  };

  const confirmAttendance = async (e) => {
    e.preventDefault();
    const event = events.find((item) => item.id === selectedEventId);
    if (!event || event.attendees >= event.maxAttendees) {
      closeAttendConfirm();
      return;
    }
    const attendeeName = attendeeForm.name.trim();
    const attendeeContact = attendeeForm.contact.trim();
    if (!isValidContact(attendeeContact)) {
      setAttendeeContactError('Enter a valid email or phone number.');
      return;
    }
    setAttendeeContactError('');
    setAttendConfirmLoading(true);
    // Add guest
    let guestId;
    const { data: existingGuests } = await supabase
      .from(EVENT_GUESTS_TABLE)
      .select('*')
      .eq('event_id', selectedEventId)
      .eq('name', attendeeName)
      .eq('added_by', currentUserId);
    if (existingGuests && existingGuests.length > 0) {
      guestId = existingGuests[0].id;
    } else {
      const { data: newGuest } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .insert([{ event_id: selectedEventId, name: attendeeName, contact: attendeeContact, added_by: currentUserId }])
        .select();
      guestId = newGuest && newGuest[0]?.id;
    }
    // Add attendance
    await supabase
      .from(EVENT_ATTENDANCE_TABLE)
      .upsert({ event_id: selectedEventId, user_id: currentUserId, guest_id: guestId, name: attendeeName, contact: attendeeContact });
    // Increment event attendee count
    await supabase
      .from(EVENTS_TABLE)
      .update({ attendees: event.attendees + 1 })
      .eq('id', selectedEventId);
    // Refresh all
    const fetchAll = async () => {
      const { data: eventData } = await supabase
        .from(EVENTS_TABLE)
        .select('*')
        .order('date', { ascending: true });
      if (eventData) setEvents(normalizeEvents(eventData));
      const { data: guestData } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .select('*');
      const guestLists = {};
      (guestData || []).forEach(g => {
        if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
        guestLists[g.event_id].push(g);
      });
      setEventGuestLists(guestLists);
      const { data: attendanceData } = await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .select('*');
      const attendanceMap = {};
      const userSet = new Set();
      (attendanceData || []).forEach(a => {
        attendanceMap[a.event_id] = a;
        if (a.user_id === currentUserId) userSet.add(a.event_id);
      });
      setAttendanceDetails(attendanceMap);
      setUserAttendance(userSet);
    };
    await fetchAll();
    setAttendConfirmLoading(false);
    closeAttendConfirm();
  };

  const handleAttendEvent = async (eventId) => {
    setAttendActionLoading(prev => ({ ...prev, [eventId]: true }));
    try {
    if (userAttendance.has(eventId)) {
      // Remove attendance
      await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', currentUserId);
      // Decrement event attendee count
      const event = events.find(e => e.id === eventId);
      if (event) {
        await supabase
          .from(EVENTS_TABLE)
          .update({ attendees: Math.max(0, event.attendees - 1) })
          .eq('id', eventId);
      }
      // Refresh all
      const fetchAll = async () => {
        const { data: eventData } = await supabase
          .from(EVENTS_TABLE)
          .select('*')
          .order('date', { ascending: true });
        if (eventData) setEvents(normalizeEvents(eventData));
        const { data: guestData } = await supabase
          .from(EVENT_GUESTS_TABLE)
          .select('*');
        const guestLists = {};
        (guestData || []).forEach(g => {
          if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
          guestLists[g.event_id].push(g);
        });
        setEventGuestLists(guestLists);
        const { data: attendanceData } = await supabase
          .from(EVENT_ATTENDANCE_TABLE)
          .select('*');
        const attendanceMap = {};
        const userSet = new Set();
        (attendanceData || []).forEach(a => {
          attendanceMap[a.event_id] = a;
          if (a.user_id === currentUserId) userSet.add(a.event_id);
        });
        setAttendanceDetails(attendanceMap);
        setUserAttendance(userSet);
      };
      await fetchAll();
    } else {
      // User wants to attend a free event — open confirmation form
      openAttendConfirm(eventId);
    }
    } finally {
      setAttendActionLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const toggleGuestList = (eventId) => {
    setShowAddGuestForm(false);
    setExtraGuestForm({ name: '', contact: '' });
    setOpenGuestListForEvent((prev) => (prev === eventId ? null : eventId));
  };

  const closeGuestListModal = () => {
    setOpenGuestListForEvent(null);
    setShowAddGuestForm(false);
    setExtraGuestForm({ name: '', contact: '' });
    setExtraGuestContactError('');
  };

  const openAddGuestForm = () => {
    setExtraGuestContactError('');
    setShowAddGuestForm(true);
  };

  const handleAddAnotherGuest = async (e) => {
    e.preventDefault();
    const eventId = openGuestListForEvent;
    const event = events.find((item) => item.id === eventId);
    if (!event || event.attendees >= event.maxAttendees) {
      return;
    }
    const guestName = extraGuestForm.name.trim();
    const guestContact = extraGuestForm.contact.trim();
    if (!guestName || !guestContact) {
      return;
    }
    if (!isValidContact(guestContact)) {
      setExtraGuestContactError('Enter a valid email or phone number.');
      return;
    }
    setExtraGuestContactError('');
    setAddGuestLoading(true);
    // Check for duplicate
    const { data: existingGuests } = await supabase
      .from(EVENT_GUESTS_TABLE)
      .select('*')
      .eq('event_id', eventId)
      .eq('name', guestName)
      .eq('added_by', currentUserId);
    if (existingGuests && existingGuests.length > 0) {
      setShowAddGuestForm(false);
      setExtraGuestForm({ name: '', contact: '' });
      return;
    }
    // Add guest
    await supabase
      .from(EVENT_GUESTS_TABLE)
      .insert([{ event_id: eventId, name: guestName, contact: guestContact, added_by: currentUserId }]);
    // Increment event attendee count
    await supabase
      .from(EVENTS_TABLE)
      .update({ attendees: event.attendees + 1 })
      .eq('id', eventId);
    // Refresh all
    const fetchAll = async () => {
      const { data: eventData } = await supabase
        .from(EVENTS_TABLE)
        .select('*')
        .order('date', { ascending: true });
      if (eventData) setEvents(normalizeEvents(eventData));
      const { data: guestData } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .select('*');
      const guestLists = {};
      (guestData || []).forEach(g => {
        if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
        guestLists[g.event_id].push(g);
      });
      setEventGuestLists(guestLists);
      const { data: attendanceData } = await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .select('*');
      const attendanceMap = {};
      const userSet = new Set();
      (attendanceData || []).forEach(a => {
        attendanceMap[a.event_id] = a;
        if (a.user_id === currentUserId) userSet.add(a.event_id);
      });
      setAttendanceDetails(attendanceMap);
      setUserAttendance(userSet);
    };
    await fetchAll();
    setAddGuestLoading(false);
    setExtraGuestForm({ name: '', contact: '' });
    setShowAddGuestForm(false);
  };

  const removeGuestFromEvent = async (eventId, guestId) => {
    if (!isAdmin) return;
    const guest = (eventGuestLists[eventId] || []).find((entry) => entry.id === guestId);
    if (!guest) {
      return;
    }
    await supabase
      .from(EVENT_GUESTS_TABLE)
      .delete()
      .eq('id', guestId);
    // Decrement event attendee count
    const event = events.find(e => e.id === eventId);
    if (event) {
      await supabase
        .from(EVENTS_TABLE)
        .update({ attendees: Math.max(0, event.attendees - 1) })
        .eq('id', eventId);
    }
    // Remove attendance if this guest was the user's attendance
    const attendance = attendanceDetails[eventId];
    if (attendance && attendance.guest_id === guestId && attendance.user_id === currentUserId) {
      await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', currentUserId);
    }
    // Refresh all
    const fetchAll = async () => {
      const { data: eventData } = await supabase
        .from(EVENTS_TABLE)
        .select('*')
        .order('date', { ascending: true });
      if (eventData) setEvents(normalizeEvents(eventData));
      const { data: guestData } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .select('*');
      const guestLists = {};
      (guestData || []).forEach(g => {
        if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
        guestLists[g.event_id].push(g);
      });
      setEventGuestLists(guestLists);
      const { data: attendanceData } = await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .select('*');
      const attendanceMap = {};
      const userSet = new Set();
      (attendanceData || []).forEach(a => {
        attendanceMap[a.event_id] = a;
        if (a.user_id === currentUserId) userSet.add(a.event_id);
      });
      setAttendanceDetails(attendanceMap);
      setUserAttendance(userSet);
    };
    await fetchAll();
  };

  const visibleEvents = events.filter((event) => (event.phase || inferEventPhase(event.time)) === theme);
  const phaseTitle = theme === EVENT_PHASES.apollo ? 'Apollo daylight invitations' : 'Selene night invitations';
  const phaseSummary = theme === EVENT_PHASES.apollo
    ? 'Apollo mode reveals only daytime gatherings, salons, and afternoon invitations held in full light.'
    : 'Selene mode reveals only night gatherings, after-dark circles, and invitations meant for the late-hour atmosphere.';
  const emptyStateCopy = theme === EVENT_PHASES.apollo
    ? 'No daytime invitations are unsealed right now. Switch to Selene to browse the night list.'
    : 'No night invitations are unsealed right now. Switch to Apollo to browse the daytime list.';

  const selectedGuestEvent = events.find((event) => event.id === openGuestListForEvent);

  return (
    <div className="content-section">
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--accent-color)',
            boxShadow: '0 0 8px 2px color-mix(in srgb, var(--accent-color) 65%, transparent)',
            flexShrink: 0,
          }} />
          Apollo Selene Events <span className="name-secret">secrets</span>
        </h1>
        <div className="flex gap-2">
          {!isAdmin && (
            <button onClick={() => setShowLogin(true)} className="admin-btn">
              Login
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={() => setShowAddEvent(true)} className="add-event-btn">
                Add Event
              </button>
              <button onClick={() => {
                setIsAdmin(false);
                setAdminPassword('');
                setGalleryActionMsg({});
                window.localStorage.removeItem('apollo-admin');
                window.localStorage.removeItem('apollo-admin-password');
              }} className="logout-btn">
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card events-intro-card">
        <p className="section-kicker" style={{ color: 'var(--accent-color)', fontWeight: 700, letterSpacing: '0.22em' }}>Invitation Circle</p>
        <h2>{phaseTitle}</h2>
        <p>
          This is the private bulletin room of Apollo Selene. New gatherings appear here quietly, with limited seats and details shared only when each announcement is unsealed.
        </p>
        <p>
          {phaseSummary}
        </p>
      </div>

      {/* Admin Login Modal */}
      {qrModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Share Event</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-color)', marginBottom: '0.85rem' }}>
              <strong>{qrModal.title}</strong>
              {qrModal.date && <span> &mdash; {new Date(qrModal.date).toLocaleDateString()}</span>}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(getEventUrl(qrModal))}&margin=14&color=000000&bgcolor=ffffff`}
                alt="QR Code"
                style={{ width: 240, height: 240, borderRadius: 12, border: '1px solid var(--border-color-strong)', display: 'block' }}
              />
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted-color)', textAlign: 'center', marginBottom: '0.75rem' }}>
              Scan to land directly on this event &amp; purchase tickets
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={getEventUrl(qrModal)}
                style={{ flex: 1, fontSize: '0.76rem', padding: '0.38rem 0.55rem', borderRadius: 8, border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--muted-color)', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
                onFocus={e => e.target.select()}
              />
              <button
                type="button"
                onClick={() => copyEventLink(qrModal)}
                style={{ padding: '0.38rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap', borderRadius: 8, flexShrink: 0 }}
              >
                {qrCopied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => downloadQrCode(qrModal)}
                disabled={qrDownloading}
              >
                {qrDownloading ? 'Downloading…' : 'Download QR Code'}
              </button>
              <button type="button" onClick={() => setQrModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {igModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Post to Instagram</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-color)', marginBottom: '0.5rem' }}>
              <strong>{igModal.title}</strong> — first poster image will be used.
            </p>
            {resolvePosters(igModal)[0] && (
              <img
                src={resolvePosters(igModal)[0]}
                alt="Preview"
                style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, marginBottom: '0.75rem' }}
              />
            )}
            <textarea
              rows={6}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--text-color)', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }}
              value={igCaption}
              onChange={(e) => setIgCaption(e.target.value)}
              placeholder="Caption…"
              disabled={igLoading}
            />
            {igError && <p style={{ color: '#e55', fontSize: '0.82rem', marginTop: '0.4rem' }}>{igError}</p>}
            {igSuccess && <p style={{ color: '#4caf50', fontSize: '0.82rem', marginTop: '0.4rem' }}>{igSuccess}</p>}
            <div className="modal-actions" style={{ marginTop: '0.75rem' }}>
              {!igSuccess && (
                <button
                  type="button"
                  onClick={postToInstagram}
                  disabled={igLoading || !resolvePosters(igModal)[0] || !igCaption.trim()}
                  style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', color: '#fff', border: 'none' }}
                >
                  {igLoading ? 'Posting…' : 'Post Now'}
                </button>
              )}
              <button type="button" onClick={() => { setIgModal(null); setIgError(''); setIgSuccess(''); }} disabled={igLoading}>
                {igSuccess ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Admin Login</h3>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required
              />
              <div className="modal-actions">
                <button type="submit" disabled={loginLoading}>{loginLoading ? 'Logging in…' : 'Login'}</button>
                <button type="button" onClick={() => setShowLogin(false)} disabled={loginLoading}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Event</h3>
            <form onSubmit={handleAddEvent}>
              <input
                type="text"
                placeholder="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                required
              />
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Time (e.g., 7:00 PM - 9:00 PM)"
                value={newEvent.time}
                onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                required
              />
              <select
                value={newEvent.phase}
                onChange={(e) => setNewEvent({ ...newEvent, phase: e.target.value })}
                required
              >
                <option value={EVENT_PHASES.apollo}>Apollo Day Event</option>
                <option value={EVENT_PHASES.selene}>Selene Night Event</option>
              </select>
              <input
                type="text"
                placeholder="Location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                required
              />
              <textarea
                placeholder="Event Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                rows="4"
                required
              />
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--muted-color)' }}>Poster Images (up to 8)</p>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} style={{ marginBottom: i < 7 ? '10px' : 0 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <input
                        type="url"
                        placeholder={`Poster ${i + 1} URL${i === 0 ? ' (required for slideshow)' : ' (optional)'}`}
                        value={newEvent.posters[i] || ''}
                        onChange={(e) => {
                          const updated = [...newEvent.posters];
                          updated[i] = e.target.value;
                          setNewEvent({ ...newEvent, posters: updated });
                        }}
                        style={{ flex: 1, margin: 0 }}
                      />
                      <label style={{ cursor: posterUploading[i] ? 'wait' : 'pointer', whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--text-color)', userSelect: 'none' }}>
                        {posterUploading[i] ? 'Uploading…' : 'Upload'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: 'none' }}
                          disabled={posterUploading[i]}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            e.target.value = '';
                            const errs = [...posterUploadError]; errs[i] = null; setPosterUploadError(errs);
                            const busy = [...posterUploading]; busy[i] = true; setPosterUploading(busy);
                            try {
                              const url = await uploadPosterImage(file, i);
                              const updated = [...newEvent.posters]; updated[i] = url;
                              setNewEvent(prev => ({ ...prev, posters: updated }));
                            } catch (err) {
                              const e2 = [...posterUploadError]; e2[i] = err.message; setPosterUploadError(e2);
                            } finally {
                              const done = [...posterUploading]; done[i] = false; setPosterUploading(done);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {posterUploadError[i] && (
                      <p style={{ margin: '0 0 4px', fontSize: '0.78rem', color: 'var(--error-color, #e05)' }}>{posterUploadError[i]}</p>
                    )}
                    {(newEvent.posters[i] || '').trim() && (
                      <select
                        value={newEvent.posterGalleryMap?.[i] || ''}
                        onChange={(e) => {
                          const updated = [...(newEvent.posterGalleryMap || [null, null, null, null, null, null, null, null])];
                          updated[i] = e.target.value || null;
                          setNewEvent({ ...newEvent, posterGalleryMap: updated });
                        }}
                        style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--text-color)', fontSize: '0.82rem' }}
                      >
                        <option value="">— Don't add to gallery —</option>
                        {galleryItems.map((g) => (
                          <option key={g.id} value={g.id}>{g.title}{g.artist ? ` · ${g.artist}` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              <input
                type="number"
                placeholder="Max Attendees"
                value={newEvent.maxAttendees}
                onChange={(e) => setNewEvent({...newEvent, maxAttendees: parseInt(e.target.value)})}
                min="1"
                required
              />
              <div style={{ margin: '10px 0' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!newEvent.ticketed}
                    onChange={e => setNewEvent({ ...newEvent, ticketed: e.target.checked, ticket_price: e.target.checked ? newEvent.ticket_price : '' })}
                  />
                  {' '}Require ticket purchase (Stripe)
                </label>
              </div>
              {newEvent.ticketed && (
                <input
                  type="number"
                  placeholder="Ticket price (e.g. 10.00)"
                  value={newEvent.ticket_price}
                  onChange={e => setNewEvent({ ...newEvent, ticket_price: e.target.value })}
                  min="0"
                  step="0.01"
                  style={{ marginTop: '0.25rem' }}
                />
              )}
              <div className="modal-actions">
                <button type="submit" disabled={addEventLoading}>{addEventLoading ? 'Saving…' : 'Add Event'}</button>
                <button type="button" onClick={() => setShowAddEvent(false)} disabled={addEventLoading}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditEvent && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Event</h3>
            <form onSubmit={handleEditEvent}>
              <input
                type="text"
                placeholder="Event Title"
                value={editEventData.title}
                onChange={(e) => setEditEventData({ ...editEventData, title: e.target.value })}
                required
              />
              <input
                type="date"
                value={editEventData.date}
                onChange={(e) => setEditEventData({ ...editEventData, date: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Time (e.g., 7:00 PM - 9:00 PM)"
                value={editEventData.time}
                onChange={(e) => setEditEventData({ ...editEventData, time: e.target.value })}
                required
              />
              <select
                value={editEventData.phase}
                onChange={(e) => setEditEventData({ ...editEventData, phase: e.target.value })}
                required
              >
                <option value={EVENT_PHASES.apollo}>Apollo Day Event</option>
                <option value={EVENT_PHASES.selene}>Selene Night Event</option>
              </select>
              <input
                type="text"
                placeholder="Location"
                value={editEventData.location}
                onChange={(e) => setEditEventData({ ...editEventData, location: e.target.value })}
                required
              />
              <textarea
                placeholder="Event Description"
                value={editEventData.description}
                onChange={(e) => setEditEventData({ ...editEventData, description: e.target.value })}
                rows="4"
                required
              />
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--muted-color)' }}>Poster Images (up to 8)</p>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} style={{ marginBottom: i < 7 ? '10px' : 0 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <input
                        type="url"
                        placeholder={`Poster ${i + 1} URL${i === 0 ? ' (required for slideshow)' : ' (optional)'}`}
                        value={(editEventData.posters || ['', '', '', '', '', '', '', ''])[i] || ''}
                        onChange={(e) => {
                          const updated = [...(editEventData.posters || ['', '', '', '', '', '', '', ''])];
                          updated[i] = e.target.value;
                          setEditEventData({ ...editEventData, posters: updated });
                        }}
                        style={{ flex: 1, margin: 0 }}
                      />
                      <label style={{ cursor: posterUploading[i] ? 'wait' : 'pointer', whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--text-color)', userSelect: 'none' }}>
                        {posterUploading[i] ? 'Uploading…' : 'Upload'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: 'none' }}
                          disabled={posterUploading[i]}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            e.target.value = '';
                            const errs = [...posterUploadError]; errs[i] = null; setPosterUploadError(errs);
                            const busy = [...posterUploading]; busy[i] = true; setPosterUploading(busy);
                            try {
                              const url = await uploadPosterImage(file, i);
                              const updated = [...(editEventData.posters || ['', '', '', '', '', '', '', ''])]; updated[i] = url;
                              setEditEventData(prev => ({ ...prev, posters: updated }));
                            } catch (err) {
                              const e2 = [...posterUploadError]; e2[i] = err.message; setPosterUploadError(e2);
                            } finally {
                              const done = [...posterUploading]; done[i] = false; setPosterUploading(done);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {posterUploadError[i] && (
                      <p style={{ margin: '0 0 4px', fontSize: '0.78rem', color: 'var(--error-color, #e05)' }}>{posterUploadError[i]}</p>
                    )}
                    {((editEventData.posters || [])[i] || '').trim() && (
                      <select
                        value={(editEventData.posterGalleryMap || [null, null, null, null, null, null, null, null])[i] || ''}
                        onChange={(e) => {
                          const updated = [...(editEventData.posterGalleryMap || [null, null, null, null, null, null, null, null])];
                          updated[i] = e.target.value || null;
                          setEditEventData({ ...editEventData, posterGalleryMap: updated });
                        }}
                        style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--text-color)', fontSize: '0.82rem' }}
                      >
                        <option value="">— Don't add to gallery —</option>
                        {galleryItems.map((g) => (
                          <option key={g.id} value={g.id}>{g.title}{g.artist ? ` · ${g.artist}` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              <input
                type="number"
                placeholder="Max Attendees"
                value={editEventData.maxAttendees}
                onChange={(e) => setEditEventData({ ...editEventData, maxAttendees: Number(e.target.value) })}
                min="1"
                required
              />
              <div style={{ margin: '10px 0' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!editEventData.ticketed}
                    onChange={e => setEditEventData({ ...editEventData, ticketed: e.target.checked, ticket_price: e.target.checked ? editEventData.ticket_price : '' })}
                  />
                  {' '}Require ticket purchase (Stripe)
                </label>
              </div>
              {editEventData.ticketed && (
                <input
                  type="number"
                  placeholder="Ticket price (e.g. 10.00)"
                  value={editEventData.ticket_price}
                  onChange={e => setEditEventData({ ...editEventData, ticket_price: e.target.value })}
                  min="0"
                  step="0.01"
                  style={{ marginTop: '0.25rem' }}
                />
              )}
              <div className="modal-actions">
                <button type="submit" disabled={editEventLoading}>{editEventLoading ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" onClick={closeEditEventModal} disabled={editEventLoading}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {contributionModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Consider Contributing</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted-color)', marginBottom: '0.85rem' }}>
              <strong>{contributionModal.title}</strong> is a free event. If you enjoyed it or want to help make future gatherings possible, a voluntary contribution is warmly welcomed.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
              {['5', '10', '20', '30'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setContributionAmount(preset)}
                  style={{
                    padding: '0.38rem 0.9rem',
                    borderRadius: 8,
                    border: contributionAmount === preset
                      ? '2px solid var(--accent-color)'
                      : '1px solid var(--border-color-strong)',
                    background: contributionAmount === preset ? 'color-mix(in srgb, var(--accent-color) 15%, transparent)' : 'var(--nav-link-bg)',
                    color: contributionAmount === preset ? 'var(--accent-color)' : 'var(--text-color)',
                    fontWeight: contributionAmount === preset ? 700 : 400,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--muted-color)' }}>Custom: $</span>
              <input
                type="number"
                min="1"
                max="500"
                step="1"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                style={{ width: '6rem', padding: '0.35rem 0.5rem', borderRadius: 8, border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--text-color)', fontSize: '0.9rem' }}
              />
            </div>
            {contributionError && (
              <p style={{ color: '#e55', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{contributionError}</p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                disabled={contributionLoading || !contributionAmount || parseFloat(contributionAmount) < 1}
                onClick={async () => {
                  setContributionError('');
                  const amountCents = Math.round(parseFloat(contributionAmount) * 100);
                  if (!Number.isFinite(amountCents) || amountCents < 100 || amountCents > 50000) {
                    setContributionError('Please enter an amount between NZ$1 and NZ$500.');
                    return;
                  }
                  setContributionLoading(true);
                  try {
                    await createContributionCheckout({ event: contributionModal, amountCents });
                  } catch (err) {
                    setContributionError(err.message || 'Checkout failed. Please try again.');
                  } finally {
                    setContributionLoading(false);
                  }
                }}
              >
                {contributionLoading ? 'Opening checkout…' : `Contribute $${parseFloat(contributionAmount || 0).toFixed(2)}`}
              </button>
              <button
                type="button"
                onClick={() => { setContributionModal(null); setContributionError(''); setContributionAmount('10'); }}
                disabled={contributionLoading}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attend Confirmation Modal */}
      {showAttendConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Attendance</h3>
            <p>
              Please share your name and a contact method to confirm your spot.
            </p>
            <form onSubmit={confirmAttendance}>
              <input
                type="text"
                placeholder="Your Name"
                value={attendeeForm.name}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Contact (email or phone)"
                value={attendeeForm.contact}
                onChange={(e) => {
                  setAttendeeForm({ ...attendeeForm, contact: e.target.value });
                  if (attendeeContactError) {
                    setAttendeeContactError('');
                  }
                }}
                required
              />
              {attendeeContactError && <p className="form-error">{attendeeContactError}</p>}
              <div className="modal-actions">
                <button type="submit" disabled={attendConfirmLoading}>{attendConfirmLoading ? 'Confirming…' : 'Confirm'}</button>
                <button type="button" onClick={closeAttendConfirm} disabled={attendConfirmLoading}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest List Modal */}
      {openGuestListForEvent && (
        <div className="modal-overlay">
          <div className="modal guest-list-modal">
            <h3>{selectedGuestEvent ? `${selectedGuestEvent.title} Guest List` : 'Guest List'}</h3>
            {(eventGuestLists[openGuestListForEvent] || []).length > 0 ? (
              <ul className="guest-list">
                {(eventGuestLists[openGuestListForEvent] || []).map((guest) => (
                  <li key={guest.id} className="guest-list-item">
                    <span>{guest.name}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        className="remove-guest-btn"
                        onClick={() => removeGuestFromEvent(openGuestListForEvent, guest.id)}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="guest-list-empty">No attendees listed yet.</p>
            )}

            {isAdmin && (eventGuestLists[openGuestListForEvent] || []).length > 0 && !showAddGuestForm && (
              <button
                type="button"
                className="add-guest-btn"
                onClick={openAddGuestForm}
                disabled={selectedGuestEvent ? selectedGuestEvent.attendees >= selectedGuestEvent.maxAttendees : false}
              >
                {selectedGuestEvent && selectedGuestEvent.attendees >= selectedGuestEvent.maxAttendees
                  ? 'Event Full'
                  : 'Add Another Guest'}
              </button>
            )}

            {isAdmin && showAddGuestForm && (
              <form className="add-guest-form" onSubmit={handleAddAnotherGuest}>
                <input
                  type="text"
                  placeholder="Guest Name"
                  value={extraGuestForm.name}
                  onChange={(e) => setExtraGuestForm({ ...extraGuestForm, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Contact (email or phone)"
                  value={extraGuestForm.contact}
                  onChange={(e) => {
                    setExtraGuestForm({ ...extraGuestForm, contact: e.target.value });
                    if (extraGuestContactError) {
                      setExtraGuestContactError('');
                    }
                  }}
                  required
                />
                {extraGuestContactError && <p className="form-error">{extraGuestContactError}</p>}
                <div className="modal-actions add-guest-actions">
                  <button type="submit" disabled={addGuestLoading}>{addGuestLoading ? 'Saving…' : 'Save Guest'}</button>
                  <button
                    type="button"
                    disabled={addGuestLoading}
                    onClick={() => {
                      setShowAddGuestForm(false);
                      setExtraGuestContactError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="modal-actions">
              <button type="button" onClick={closeGuestListModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events Grid */}
      <div className="events-grid">
        {loadingEvents ? (
          <div className="card events-empty-state">
            <p className="section-kicker">Loading</p>
            <h3>Fetching events…</h3>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="card events-empty-state">
            <p className="section-kicker">Nothing Unsealed</p>
            <h3>{phaseTitle}</h3>
            <p>{emptyStateCopy}</p>
          </div>
        ) : visibleEvents.map(event => (
          <div
            key={event.id}
            id={`event-card-${event.id}`}
            className={`event-card${highlightedEventId === String(event.id) ? ' event-card--highlighted' : ''}`}
          >
            <div className="event-content">
              <div className="event-card-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <p className="event-whisper">Sealed announcement</p>
                  <span className="event-seal">
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-color)', boxShadow: '0 0 5px 1px color-mix(in srgb, var(--accent-color) 70%, transparent)', marginRight: '0.35rem', flexShrink: 0 }} />
                    {event.phase === EVENT_PHASES.apollo ? 'Day Invitation' : 'Night Invitation'}
                  </span>
                </div>
                {resolvePosters(event).length > 0 && (
                  <div style={{ width: 200, height: 200, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <PosterSlideshow images={resolvePosters(event)} />
                  </div>
                )}
              </div>
              <h3>{event.title}</h3>
              {event.updatedAt && (
                <p className="event-updated-at">
                  Last updated: {new Date(event.updatedAt).toLocaleString()}
                </p>
              )}
              <div className="event-details">
                <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {event.time}</p>
                <p><strong>Location:</strong> {event.location}</p>
              </div>
              <p className="event-description">{event.description}</p>
              
              <div className="event-attendance">
                {isAdmin && (
                  <div className="event-admin-actions">
                    <button
                      type="button"
                      className="event-admin-btn"
                      onClick={() => openEditEventModal(event)}
                    >
                      Edit Event
                    </button>
                    <button
                      type="button"
                      className="event-admin-btn event-admin-btn-danger"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      Remove Event
                    </button>
                    <button
                      type="button"
                      className="event-admin-btn"
                      style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', color: '#fff', border: 'none' }}
                      onClick={() => openIgModal(event)}
                    >
                      Post to Instagram
                    </button>
                    <button
                      type="button"
                      className="event-admin-btn"
                      onClick={() => openQrModal(event)}
                    >
                      QR &amp; Link
                    </button>
                    {isEventFinished(event) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                        <button
                          type="button"
                          className="event-admin-btn"
                          style={{ background: '#2d3748', color: '#fff', border: 'none' }}
                          onClick={() => addEventToGallery(event)}
                          disabled={galleryActionLoading[event.id]}
                        >
                          {galleryActionLoading[event.id] ? 'Adding…' : 'Add to Gallery and Artwork'}
                        </button>
                        {galleryActionMsg[event.id] && (
                          <span style={{ fontSize: '0.82rem', color: galleryActionMsg[event.id].includes('successfully') ? '#4caf50' : '#e55' }}>
                            {galleryActionMsg[event.id]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="attendance-info">
                  <span className="attendee-count">
                    {event.attendees}/{event.maxAttendees} reserved seats
                  </span>
                  {attendanceDetails[event.id] && userAttendance.has(event.id) && (
                    <span className="attendee-count">
                      Invitation held as {attendanceDetails[event.id].name}
                    </span>
                  )}
                  <div className="attendance-bar">
                    <div 
                      className="attendance-fill" 
                      style={{ width: `${(event.attendees / event.maxAttendees) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {event.ticketed !== false && !userAttendance.has(event.id) && event.attendees < event.maxAttendees && (
                  <div className="ticket-quantity-row">
                    <label className="ticket-quantity-label" htmlFor={`qty-${event.id}`}>Qty</label>
                    <button
                      type="button"
                      className="ticket-qty-btn"
                      onClick={() => setTicketQuantities(q => ({ ...q, [event.id]: Math.max(1, (q[event.id] || 1) - 1) }))}
                      aria-label="Decrease quantity"
                    >−</button>
                    <input
                      id={`qty-${event.id}`}
                      type="number"
                      className="ticket-qty-input"
                      min="1"
                      max={Math.min(10, event.maxAttendees - event.attendees)}
                      value={ticketQuantities[event.id] || 1}
                      onChange={e => {
                        const val = Math.max(1, Math.min(10, Math.min(event.maxAttendees - event.attendees, parseInt(e.target.value) || 1)));
                        setTicketQuantities(q => ({ ...q, [event.id]: val }));
                      }}
                    />
                    <button
                      type="button"
                      className="ticket-qty-btn"
                      onClick={() => setTicketQuantities(q => ({ ...q, [event.id]: Math.min(10, Math.min(event.maxAttendees - event.attendees, (q[event.id] || 1) + 1)) }))}
                      aria-label="Increase quantity"
                    >+</button>
                  </div>
                )}
                <button 
                  className={`attend-btn ${userAttendance.has(event.id) ? 'attending' : ''}`}
                  disabled={checkoutLoading || attendActionLoading[event.id] || (!userAttendance.has(event.id) && event.attendees >= event.maxAttendees)}
                  onClick={async () => {
                    setCheckoutError('');
                    if (event.ticketed && !userAttendance.has(event.id)) {
                      setCheckoutLoading(true);
                      try {
                        await createTicketCheckout({ event, quantity: ticketQuantities[event.id] || 1 });
                      } catch (err) {
                        setCheckoutError(err.message || 'Checkout failed.');
                      } finally {
                        setCheckoutLoading(false);
                      }
                    } else {
                      handleAttendEvent(event.id);
                    }
                  }}
                >
                  {checkoutLoading
                    ? 'Opening checkout…'
                    : attendActionLoading[event.id]
                      ? 'Please wait…'
                      : userAttendance.has(event.id)
                        ? 'Release Invitation'
                        : event.attendees >= event.maxAttendees
                          ? 'Sealed Full'
                          : event.ticketed === false
                            ? 'Attend Free'
                            : event.ticket_price != null && parseFloat(event.ticket_price) > 0
                              ? `Buy Ticket · $${parseFloat(event.ticket_price).toFixed(2)}`
                              : 'Buy Ticket'}
                </button>
                {checkoutError && (
                  <p style={{ color: '#e55', fontSize: '0.8rem', marginTop: '0.35rem' }}>{checkoutError}</p>
                )}
                {/* Voucher redemption */}
                {event.ticketed !== false && !userAttendance.has(event.id) && (event.maxAttendees == null || event.attendees < event.maxAttendees) && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {!voucherOpen[event.id] ? (
                      <button
                        type="button"
                        onClick={() => setVoucherOpen((p) => ({ ...p, [event.id]: true }))}
                        style={{ background: 'none', border: 'none', color: 'var(--muted-color)', fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        Have a voucher?
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Your name"
                          value={voucherNames[event.id] || ''}
                          onChange={(e) => setVoucherNames((p) => ({ ...p, [event.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && redeemVoucher(event)}
                          maxLength={80}
                          style={{ width: '9rem', padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--text-color)', fontSize: '0.9rem' }}
                        />
                        <input
                          type="text"
                          placeholder="Voucher code"
                          value={voucherInputs[event.id] || ''}
                          onChange={(e) => setVoucherInputs((p) => ({ ...p, [event.id]: e.target.value.toUpperCase() }))}
                          onKeyDown={(e) => e.key === 'Enter' && redeemVoucher(event)}
                          maxLength={8}
                          style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', width: '8rem', padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color-strong)', background: 'var(--nav-link-bg)', color: 'var(--text-color)', fontSize: '0.9rem', textTransform: 'uppercase' }}
                        />
                        <button
                          type="button"
                          disabled={voucherRedeeming[event.id]}
                          onClick={() => redeemVoucher(event)}
                          style={{ padding: '0.3rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color-strong)', background: 'var(--button-bg)', color: 'var(--button-text)', cursor: 'pointer', fontSize: '0.82rem' }}
                        >
                          {voucherRedeeming[event.id] ? '…' : 'Redeem'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoucherOpen((p) => ({ ...p, [event.id]: false }))}
                          style={{ background: 'none', border: 'none', color: 'var(--muted-color)', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {voucherMsgs[event.id] && (
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: voucherMsgs[event.id].ok ? '#5cb85c' : '#e55' }}>
                        {voucherMsgs[event.id].text}
                      </p>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 4, fontSize: 13, color: '#888' }}>
                  {event.ticketed === false ? 'Free event' : 'Ticketed event'}
                </div>

                {event.ticketed === false && (
                  <button
                    type="button"
                    onClick={() => { setContributionAmount('10'); setContributionError(''); setContributionModal(event); }}
                    style={{
                      marginTop: '0.6rem',
                      width: '100%',
                      padding: '0.45rem 1rem',
                      borderRadius: 10,
                      border: '1px dashed color-mix(in srgb, var(--accent-color) 55%, transparent)',
                      background: 'color-mix(in srgb, var(--accent-color) 8%, transparent)',
                      color: 'var(--accent-color)',
                      fontSize: '0.85rem',
                      fontStyle: 'italic',
                      cursor: 'pointer',
                      letterSpacing: '0.02em',
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                  >
                    ✦ Consider contributing
                  </button>
                )}

                <div className="guest-list-controls">
                  <button
                    type="button"
                    className="guest-list-btn"
                    onClick={() => toggleGuestList(event.id)}
                  >
                    View Guest List
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Events;