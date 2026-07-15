import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import InlineEditor from '../components/InlineEditor';
import { clearLegacyAdminSession, getLegacyAdminPassword, getLegacyAdminUsername, isAdminUiEnabled, setLegacyAdminSession } from '../lib/adminAccess';

const GALLERY_TABLE = 'gallery_items';
const GALLERY_BUCKET = 'gallery';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 4 * 60;

const isVideoUrl = (value = '') => /\.(mp4|webm|ogg)(\?.*)?$/i.test(value);
const VALID_MEDIA_ROTATIONS = [0, 90, 180, 270];

const normalizeMediaRotation = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const normalized = ((parsed % 360) + 360) % 360;
  return VALID_MEDIA_ROTATIONS.includes(normalized) ? normalized : 0;
};

const rotateMediaByStep = (currentRotation, step) => {
  const current = normalizeMediaRotation(currentRotation);
  const next = ((current + step) % 360 + 360) % 360;
  return normalizeMediaRotation(next);
};

const getFileDuration = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const mediaElement = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      mediaElement.src = '';
    };

    if (mediaElement.tagName === 'VIDEO') {
      mediaElement.preload = 'metadata';
      mediaElement.onloadedmetadata = () => {
        const duration = Number(mediaElement.duration);
        cleanup();
        resolve(duration);
      };
      mediaElement.onerror = () => {
        cleanup();
        reject(new Error(`Could not read the duration for ${file.name}.`));
      };
      mediaElement.src = objectUrl;
      return;
    }

    cleanup();
    resolve(0);
  });

const loadPastEventsData = async () => {
  if (!supabase) {
    return { galleryItems: [], events: [], guests: [] };
  }

  const [galleryRes, eventsRes, guestsRes] = await Promise.all([
    supabase
      .from(GALLERY_TABLE)
      .select('id, title, artist, description, medium, year, story, image_url, event_id, event_date, event_time, event_location, media_rotation, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, title, date, time, location, description, attendees, max_attendees, poster, posters, phase, ticketed, ticket_price')
      .order('date', { ascending: true }),
    supabase
      .from('event_guests')
      .select('*'),
  ]);

  return {
    galleryItems: galleryRes.data || [],
    events: eventsRes.data || [],
    guests: guestsRes.data || [],
  };
};

const PastEvents = ({ siteContent = {}, onSiteContentUpdated }) => {
  const isAdmin = isAdminUiEnabled();
  const [searchParams] = useSearchParams();
  const {
    past_events_title = 'Past events',
    past_events_intro = 'These are completed events that have been moved into the gallery after they finished. Each entry is treated as a piece of artwork from the community.',
  } = siteContent;
  const [pastEvents, setPastEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventGuests, setEventGuests] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingLinkId, setSavingLinkId] = useState(null);
  const [linkStatus, setLinkStatus] = useState({});
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoTitlePrefix, setPhotoTitlePrefix] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoArtist, setPhotoArtist] = useState('Apollo Selene');
  const [photoMedium, setPhotoMedium] = useState('Event Photo');
  const [photoYear, setPhotoYear] = useState('');
  const [photoStatus, setPhotoStatus] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoRemovingId, setPhotoRemovingId] = useState(null);
  const [clerkAdminActive, setClerkAdminActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.Clerk?.session);
  });
  const [mediaViewer, setMediaViewer] = useState({
    open: false,
    title: '',
    subtitle: '',
    items: [],
  });
  const [mediaRotationDrafts, setMediaRotationDrafts] = useState({});
  const [savingMediaRotationId, setSavingMediaRotationId] = useState(null);

  const selectedEventId = searchParams.get('event');

  const selectedPastEventItems = useMemo(
    () => pastEvents.filter((item) => String(item.event_id) === String(selectedEventId)),
    [pastEvents, selectedEventId]
  );

  const eventsById = useMemo(() => {
    const map = new Map();
    events.forEach((eventItem) => {
      map.set(String(eventItem.id), eventItem);
    });
    return map;
  }, [events]);

  const groupedPastEvents = useMemo(() => {
    const groups = new Map();

    pastEvents.forEach((item) => {
      const eventKey = item.event_id ? `event-${item.event_id}` : `media-${item.id}`;
      const linkedEvent = item.event_id ? eventsById.get(String(item.event_id)) : null;

      if (!groups.has(eventKey)) {
        groups.set(eventKey, {
          key: eventKey,
          eventId: item.event_id || null,
          title: linkedEvent?.title || item.title || 'Past event',
          date: linkedEvent?.date || item.event_date || null,
          time: linkedEvent?.time || item.event_time || null,
          location: linkedEvent?.location || item.event_location || null,
          description: linkedEvent?.description || item.description || '',
          coverItem: item,
          latestCreatedAt: item.created_at || null,
          items: [],
        });
      }

      const group = groups.get(eventKey);
      group.items.push(item);

      const groupCreatedAt = new Date(group.latestCreatedAt || 0).getTime();
      const itemCreatedAt = new Date(item.created_at || 0).getTime();
      if (itemCreatedAt > groupCreatedAt) {
        group.latestCreatedAt = item.created_at || group.latestCreatedAt;
      }

      if (!isVideoUrl(item.image_url) && isVideoUrl(group.coverItem.image_url)) {
        group.coverItem = item;
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      const aStamp = new Date(a.latestCreatedAt || a.date || 0).getTime();
      const bStamp = new Date(b.latestCreatedAt || b.date || 0).getTime();
      return bStamp - aStamp;
    });
  }, [pastEvents, eventsById]);

  const selectedEventMeta = useMemo(
    () => events.find((item) => String(item.id) === String(selectedEventId)),
    [events, selectedEventId]
  );

  useEffect(() => {
    const loadPastEvents = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { galleryItems, events: nextEvents, guests } = await loadPastEventsData();
      setPastEvents(galleryItems);
      setEvents(nextEvents);

      const nextGuests = {};
      guests.forEach((guest) => {
        if (!nextGuests[guest.event_id]) nextGuests[guest.event_id] = [];
        nextGuests[guest.event_id].push(guest);
      });
      setEventGuests(nextGuests);

      setLoading(false);
    };

    loadPastEvents();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncClerkAdmin = () => {
      setClerkAdminActive(Boolean(window.Clerk?.session));
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        syncClerkAdmin();
      }
    };

    let removeClerkListener = null;
    if (typeof window.Clerk?.addListener === 'function') {
      try {
        const unsubscribe = window.Clerk.addListener(() => {
          syncClerkAdmin();
        });
        if (typeof unsubscribe === 'function') {
          removeClerkListener = unsubscribe;
        }
      } catch {
        // No-op: Clerk listener API availability can vary by runtime.
      }
    }

    syncClerkAdmin();
    window.addEventListener('focus', syncClerkAdmin);
    window.addEventListener('clerk:loaded', syncClerkAdmin);
    window.addEventListener('clerk:session-updated', syncClerkAdmin);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', syncClerkAdmin);
      window.removeEventListener('clerk:loaded', syncClerkAdmin);
      window.removeEventListener('clerk:session-updated', syncClerkAdmin);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof removeClerkListener === 'function') {
        removeClerkListener();
      }
    };
  }, []);

  const selectedGuests = selectedEventId ? (eventGuests[selectedEventId] || []) : [];
  const selectedPastEvent = selectedPastEventItems[0] || null;
  const legacyAdminUsername = getLegacyAdminUsername();
  const legacyAdminPassword = getLegacyAdminPassword();
  const hasStoredAdminCredentials = Boolean(legacyAdminUsername && legacyAdminPassword);
  const hasMediaAdminAccess = clerkAdminActive || hasStoredAdminCredentials;

  const openMediaViewer = ({ title, subtitle, items }) => {
    const nextItems = Array.isArray(items) ? items : [];
    const nextDrafts = {};
    nextItems.forEach((item) => {
      nextDrafts[item.id] = normalizeMediaRotation(item.media_rotation);
    });

    setMediaRotationDrafts(nextDrafts);
    setMediaViewer({
      open: true,
      title: title || 'Past event media',
      subtitle: subtitle || '',
      items: nextItems,
    });
  };

  const closeMediaViewer = () => {
    setMediaViewer((previous) => ({ ...previous, open: false }));
  };

  const getEffectiveMediaRotation = (item) => {
    const draftValue = mediaRotationDrafts[item.id];
    if (typeof draftValue === 'number') {
      return normalizeMediaRotation(draftValue);
    }
    return normalizeMediaRotation(item.media_rotation);
  };

  const buildAdminRequestHeaders = ({ anonKey, includeJson = false } = {}) => {
    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    };

    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }

    if (clerkAdminActive && typeof window !== 'undefined') {
      const sessionId = window.Clerk?.session?.id;
      const userId = window.Clerk?.user?.id || window.Clerk?.session?.user?.id;
      if (sessionId) {
        headers['x-clerk-session-id'] = String(sessionId);
      }
      if (userId) {
        headers['x-clerk-user-id'] = String(userId);
      }
    }

    return headers;
  };

  const resetStoredAdminCredentials = () => {
    clearLegacyAdminSession({ clearUsername: true, clearPassword: true });
    setLegacyAdminSession();
  };

  const handleAddPhotosToEvent = async (event) => {
    if (!supabase || !event || !selectedEventId) {
      return;
    }

    const adminUsername = getLegacyAdminUsername();
    const adminPassword = getLegacyAdminPassword();
    const useLegacyAdminAuth = !clerkAdminActive;

    if (!photoFiles.length) {
      setPhotoStatus('Choose at least one photo or video to upload.');
      return;
    }

    const invalidFile = photoFiles.find((file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
      const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
      return (!isImage && !isVideo) || (isImage && file.size > MAX_IMAGE_BYTES);
    });

    if (invalidFile) {
      const ext = invalidFile.name.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'ogg'].includes(ext)) {
        setPhotoStatus('Only JPG, PNG, WEBP, GIF, MP4, WEBM, or OGG files are allowed.');
      } else {
        setPhotoStatus('File is too large. Maximum size is 10 MB.');
      }
      return;
    }

    for (const file of photoFiles) {
      const ext = file.name.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg'].includes(ext) || file.type.startsWith('video/');
      if (isVideo) {
        const duration = await getFileDuration(file);
        if (duration > MAX_VIDEO_SECONDS) {
          setPhotoStatus(`${file.name} is longer than 4 minutes. Please choose a shorter video.`);
          return;
        }
      }
    }

    setPhotoUploading(true);
    setPhotoStatus('');

    const eventTitle = selectedEventMeta?.title || selectedPastEvent?.title || 'Past Event';
    const eventDate = selectedEventMeta?.date || selectedPastEvent?.event_date || null;
    const eventTime = selectedEventMeta?.time || selectedPastEvent?.event_time || null;
    const eventLocation = selectedEventMeta?.location || selectedPastEvent?.event_location || null;
    const baseDescription = photoDescription.trim() || `Additional media added from ${eventTitle}.`;
    const baseArtist = photoArtist.trim() || 'Apollo Selene';
    const baseMedium = photoMedium.trim() || 'Event Media';
    const baseYear = photoYear.trim() || (eventDate ? String(new Date(eventDate).getFullYear()) : '');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
      }

      if (useLegacyAdminAuth && (!adminUsername || !adminPassword)) {
        throw new Error('Admin login is required to upload media to this past event.');
      }

      for (let index = 0; index < photoFiles.length; index += 1) {
        const file = photoFiles[index];
        const titlePrefix = photoTitlePrefix.trim() || eventTitle;
        const fileExt = file.name.split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'webm', 'ogg'].includes(fileExt) || file.type.startsWith('video/');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventId', String(selectedEventId));
        formData.append('title', photoFiles.length > 1 ? `${titlePrefix} ${isVideo ? 'video' : 'photo'} ${index + 1}` : titlePrefix);
        formData.append('artist', baseArtist);
        formData.append('description', isVideo ? `${baseDescription} Short video.` : baseDescription);
        formData.append('medium', isVideo ? `${baseMedium} / Video` : baseMedium);
        formData.append('year', baseYear);
        formData.append('story', `Added from the past event on ${eventDate || 'an unknown date'}${eventTime ? ` (${eventTime})` : ''}.`);
        if (eventDate) formData.append('eventDate', eventDate);
        if (eventTime) formData.append('eventTime', eventTime);
        if (eventLocation) formData.append('eventLocation', eventLocation);
        if (useLegacyAdminAuth) {
          formData.append('adminUsername', adminUsername);
          formData.append('adminPassword', adminPassword);
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/upload-past-event-media`, {
          method: 'POST',
          headers: buildAdminRequestHeaders({ anonKey }),
          body: formData,
        });

        const responseBody = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (typeof responseBody?.error === 'string' && responseBody.error.includes('Stored admin session is invalid')) {
            resetStoredAdminCredentials();
            throw new Error('Your admin session expired on this site. Sign in again on the Account page, then retry the upload.');
          }
          if (response.status === 401) {
            resetStoredAdminCredentials();
            throw new Error('Upload was rejected (401). Sign in again on the Account page and try again.');
          }
          throw new Error(responseBody?.error || `Failed to upload ${file.name}.`);
        }
      }

      const { galleryItems, events: nextEvents, guests } = await loadPastEventsData();
      setPastEvents(galleryItems);
      setEvents(nextEvents);
      const nextGuests = {};
      guests.forEach((guest) => {
        if (!nextGuests[guest.event_id]) nextGuests[guest.event_id] = [];
        nextGuests[guest.event_id].push(guest);
      });
      setEventGuests(nextGuests);
      setPhotoFiles([]);
      setPhotoTitlePrefix('');
      setPhotoDescription('');
      setPhotoArtist('Apollo Selene');
      setPhotoMedium('Event Media');
      setPhotoYear('');
      setPhotoStatus(`Added ${photoFiles.length} item${photoFiles.length === 1 ? '' : 's'} to this past event.`);
    } catch (error) {
      setPhotoStatus(error instanceof Error ? error.message : 'Failed to add media to this past event.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleLinkEvent = async (galleryItemId, eventId) => {
    if (!supabase) return;
    setSavingLinkId(galleryItemId);
    setLinkStatus((prev) => ({ ...prev, [galleryItemId]: '' }));

    const event = events.find((item) => String(item.id) === String(eventId));
    const payload = {
      galleryItemId,
      eventId: event ? String(event.id) : null,
      eventDate: event?.date || null,
      eventTime: event?.time || null,
      eventLocation: event?.location || null,
    };

    try {
      const adminUsername = getLegacyAdminUsername();
      const adminPassword = getLegacyAdminPassword();
      const useLegacyAdminAuth = !clerkAdminActive;
      if (useLegacyAdminAuth && (!adminUsername || !adminPassword)) {
        throw new Error('Admin login is required to link this past event.');
      }

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) {
        throw new Error('Supabase anon key missing (VITE_SUPABASE_ANON_KEY).');
      }

      const body = useLegacyAdminAuth
        ? { ...payload, adminUsername, adminPassword }
        : payload;

      const { data, error } = await supabase.functions.invoke('link-past-event', {
        body,
        headers: buildAdminRequestHeaders({ anonKey }),
      });
      if (error) {
        if (typeof data?.error === 'string' && data.error.includes('Stored admin session is invalid')) {
          resetStoredAdminCredentials();
          throw new Error('Your admin session expired on this site. Sign in again on the Account page, then retry linking this event.');
        }
        if (error.status === 401) {
          resetStoredAdminCredentials();
          throw new Error('Link request was rejected (401). Sign in again on the Account page and try again.');
        }
        throw new Error(data?.error || error.message || 'Failed to link this past event.');
      }

      const { galleryItems, events: nextEvents, guests } = await loadPastEventsData();
      setPastEvents(galleryItems);
      setEvents(nextEvents);
      const nextGuests = {};
      guests.forEach((guest) => {
        if (!nextGuests[guest.event_id]) nextGuests[guest.event_id] = [];
        nextGuests[guest.event_id].push(guest);
      });
      setEventGuests(nextGuests);
      setLinkStatus((prev) => ({
        ...prev,
        [galleryItemId]: event ? `Linked to ${event.title}.` : 'Past event link removed.',
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link this past event.';
      setLinkStatus((prev) => ({ ...prev, [galleryItemId]: message }));
    }

    setSavingLinkId(null);
  };

  const handleRemovePastEventMedia = async (item) => {
    if (!supabase || !item?.id) {
      return;
    }

    const adminUsername = getLegacyAdminUsername();
    const adminPassword = getLegacyAdminPassword();
    const useLegacyAdminAuth = !clerkAdminActive;
    if (useLegacyAdminAuth && (!adminUsername || !adminPassword)) {
      setPhotoStatus('Admin login is required to remove this media item. Sign in on the Account page first.');
      return;
    }

    const shouldRemove = window.confirm(`Remove "${item.title || 'this media item'}" from this past event gallery? This cannot be undone.`);
    if (!shouldRemove) {
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      setPhotoStatus('Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
      return;
    }

    setPhotoRemovingId(item.id);
    setPhotoStatus('');
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/remove-past-event-media`, {
        method: 'POST',
        headers: buildAdminRequestHeaders({ anonKey, includeJson: true }),
        body: JSON.stringify(
          useLegacyAdminAuth
            ? {
              galleryItemId: item.id,
              adminUsername,
              adminPassword,
            }
            : {
              galleryItemId: item.id,
            }
        ),
      });

      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (typeof responseBody?.error === 'string' && responseBody.error.includes('Stored admin session is invalid')) {
          resetStoredAdminCredentials();
          throw new Error('Your admin session expired on this site. Sign in again on the Account page, then retry removing this media item.');
        }
        if (response.status === 401) {
          resetStoredAdminCredentials();
          throw new Error('Removal request was rejected (401). Sign in again on the Account page and try again.');
        }
        throw new Error(responseBody?.error || 'Failed to remove this media item.');
      }

      const { galleryItems, events: nextEvents, guests } = await loadPastEventsData();
      setPastEvents(galleryItems);
      setEvents(nextEvents);
      const nextGuests = {};
      guests.forEach((guest) => {
        if (!nextGuests[guest.event_id]) nextGuests[guest.event_id] = [];
        nextGuests[guest.event_id].push(guest);
      });
      setEventGuests(nextGuests);
      setMediaViewer((previous) => ({
        ...previous,
        items: previous.items.filter((mediaItem) => mediaItem.id !== item.id),
        open: previous.items.length > 1 ? previous.open : false,
      }));
      setMediaRotationDrafts((previous) => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });
      setPhotoStatus(`Removed ${item.title || 'media item'} from this past event.`);
    } catch (error) {
      setPhotoStatus(error instanceof Error ? error.message : 'Failed to remove this media item.');
    } finally {
      setPhotoRemovingId(null);
    }
  };

  const handleRotateMediaPreview = (itemId, step) => {
    setMediaRotationDrafts((previous) => {
      const current = normalizeMediaRotation(previous[itemId] ?? 0);
      return {
        ...previous,
        [itemId]: rotateMediaByStep(current, step),
      };
    });
  };

  const handleSaveMediaRotation = async (item) => {
    const targetRotation = getEffectiveMediaRotation(item);
    const currentRotation = normalizeMediaRotation(item.media_rotation);
    if (targetRotation === currentRotation) {
      return;
    }

    const adminUsername = getLegacyAdminUsername();
    const adminPassword = getLegacyAdminPassword();
    const useLegacyAdminAuth = !clerkAdminActive;
    if (useLegacyAdminAuth && (!adminUsername || !adminPassword)) {
      setPhotoStatus('Admin login is required to rotate this video. Sign in on the Account page first.');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      setPhotoStatus('Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
      return;
    }

    setSavingMediaRotationId(item.id);
    setPhotoStatus('');
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/update-past-event-media-rotation`, {
        method: 'POST',
        headers: buildAdminRequestHeaders({ anonKey, includeJson: true }),
        body: JSON.stringify(
          useLegacyAdminAuth
            ? {
              galleryItemId: item.id,
              mediaRotation: targetRotation,
              adminUsername,
              adminPassword,
            }
            : {
              galleryItemId: item.id,
              mediaRotation: targetRotation,
            }
        ),
      });

      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (typeof responseBody?.error === 'string' && responseBody.error.includes('Stored admin session is invalid')) {
          resetStoredAdminCredentials();
          throw new Error('Your admin session expired on this site. Sign in again on the Account page, then retry video rotation.');
        }
        if (response.status === 401) {
          resetStoredAdminCredentials();
          throw new Error('Video rotation request was rejected (401). Sign in again on the Account page and try again.');
        }
        throw new Error(responseBody?.error || 'Failed to save video rotation.');
      }

      const applyRotation = (entry) =>
        entry.id === item.id ? { ...entry, media_rotation: targetRotation } : entry;

      setPastEvents((previous) => previous.map(applyRotation));
      setMediaViewer((previous) => ({
        ...previous,
        items: previous.items.map(applyRotation),
      }));
      setPhotoStatus('Video orientation saved.');
    } catch (error) {
      setPhotoStatus(error instanceof Error ? error.message : 'Failed to save video rotation.');
    } finally {
      setSavingMediaRotationId(null);
    }
  };

  return (
    <div className="content-section">
      <div className="card">
        <h1>
          <InlineEditor isAdmin={isAdmin} value={past_events_title} fieldKey="past_events_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
        </h1>
        <p>
          <InlineEditor isAdmin={isAdmin} value={past_events_intro} fieldKey="past_events_intro" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
        </p>
      </div>

      {loading ? (
        <div className="card">
          <p>Loading past events…</p>
        </div>
      ) : selectedEventMeta || selectedPastEvent ? (
        <div className="card">
          <p className="section-kicker">Selected past event</p>
          <h2 style={{ marginTop: 0 }}>{selectedEventMeta?.title || selectedPastEvent?.title}</h2>
          <p style={{ opacity: 0.7, marginTop: 0 }}>{selectedEventMeta?.location || selectedPastEvent?.artist || 'Apollo Selene'}</p>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)' }}>
            <div style={{ borderRadius: '18px', overflow: 'hidden', minHeight: '220px', background: 'color-mix(in srgb, var(--nav-link-bg) 75%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedPastEvent ? (
                isVideoUrl(selectedPastEvent.image_url) ? (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
                    <video
                      src={selectedPastEvent.image_url}
                      controls
                      playsInline
                      preload="metadata"
                      style={{
                        width: '100%',
                        display: 'block',
                        objectFit: 'contain',
                        transform: `rotate(${normalizeMediaRotation(selectedPastEvent.media_rotation)}deg)`,
                        transformOrigin: 'center center',
                      }}
                    />
                  </div>
                ) : (
                  <img src={selectedPastEvent.image_url} alt={selectedPastEvent.title} style={{ width: '100%', display: 'block' }} />
                )
              ) : (
                <p style={{ padding: '1.25rem', margin: 0, textAlign: 'center', color: 'var(--muted-color)' }}>
                  No gallery item is linked yet for this finished event.
                </p>
              )}
            </div>
            <div>
              <p><strong>Event Date:</strong> {selectedEventMeta?.date || selectedPastEvent?.event_date || '—'} {selectedEventMeta?.time || selectedPastEvent?.event_time ? `· ${selectedEventMeta?.time || selectedPastEvent?.event_time}` : ''}</p>
              <p><strong>Location:</strong> {selectedEventMeta?.location || selectedPastEvent?.event_location || '—'}</p>
              <p>{selectedEventMeta?.description || selectedPastEvent?.description || 'This past event is ready to be linked to gallery items and attendee records.'}</p>
              {selectedPastEvent?.story && <p>{selectedPastEvent.story}</p>}
              <h3 style={{ marginTop: '1rem' }}>Photos</h3>
              {isAdmin && hasMediaAdminAccess && selectedEventId && (
                <div style={{ marginTop: '0.85rem', padding: '0.9rem', borderRadius: '16px', border: '1px solid var(--border-color-strong)', background: 'color-mix(in srgb, var(--nav-link-bg) 70%, transparent)' }}>
                  <p className="section-kicker" style={{ marginBottom: '0.45rem' }}>Add more photos or video</p>
                  <p style={{ marginTop: 0, fontSize: '0.88rem', color: 'var(--muted-color)' }}>
                    Upload extra images or a short video from this finished event. Videos must be under 4 minutes.
                  </p>
                  <div style={{ display: 'grid', gap: '0.65rem' }}>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                    />
                    <input
                      type="text"
                      value={photoTitlePrefix}
                      onChange={(e) => setPhotoTitlePrefix(e.target.value)}
                      placeholder={`Title prefix (defaults to ${selectedEventMeta?.title || 'this event'})`}
                      style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                    />
                    <input
                      type="text"
                      value={photoArtist}
                      onChange={(e) => setPhotoArtist(e.target.value)}
                      placeholder="Artist / photographer"
                      style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                    />
                    <input
                      type="text"
                      value={photoMedium}
                      onChange={(e) => setPhotoMedium(e.target.value)}
                      placeholder="Medium (photo or video)"
                      style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                    />
                    <input
                      type="text"
                      value={photoYear}
                      onChange={(e) => setPhotoYear(e.target.value)}
                      placeholder="Year"
                      style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                    />
                    <textarea
                      value={photoDescription}
                      onChange={(e) => setPhotoDescription(e.target.value)}
                      placeholder="Optional description for the photo set"
                      rows={3}
                      style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddPhotosToEvent(selectedEventMeta || selectedPastEvent)}
                      disabled={photoUploading || photoFiles.length === 0 || !hasMediaAdminAccess}
                      style={{ alignSelf: 'flex-start', padding: '0.55rem 0.95rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #d9e4ff, #8aa4ca)', color: '#08111f', cursor: 'pointer' }}
                    >
                      {photoUploading ? 'Adding photos…' : 'Add photos to this event'}
                    </button>
                    {photoStatus && (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: photoStatus.toLowerCase().includes('failed') || photoStatus.toLowerCase().includes('choose') || photoStatus.toLowerCase().includes('open admin') ? '#e55' : '#4caf50' }}>
                        {photoStatus}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedPastEventItems.length > 0 ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, color: 'var(--muted-color)', fontSize: '0.9rem' }}>
                    {selectedPastEventItems.length} media item{selectedPastEventItems.length === 1 ? '' : 's'} available.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      openMediaViewer({
                        title: selectedEventMeta?.title || selectedPastEvent?.title || 'Past event media',
                        subtitle: selectedEventMeta?.location || selectedPastEvent?.event_location || '',
                        items: selectedPastEventItems,
                      })
                    }
                    style={{ padding: '0.55rem 0.95rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--button-bg)', color: 'var(--button-text)', cursor: 'pointer' }}
                  >
                    View media
                  </button>
                </div>
              ) : (
                <p style={{ marginTop: '0.75rem' }}>No gallery items are linked yet.</p>
              )}
              <h3 style={{ marginTop: '1rem' }}>Attendees</h3>
              {selectedGuests.length > 0 ? (
                <ul>
                  {selectedGuests.map((guest) => (
                    <li key={guest.id}>{guest.name}{guest.contact ? ` · ${guest.contact}` : ''}</li>
                  ))}
                </ul>
              ) : (
                <p>No attendees saved for this event yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : pastEvents.length === 0 ? (
        <div className="card">
          <p>No past events have been added to the gallery yet.</p>
        </div>
      ) : (
        <>
          {isAdmin && !hasMediaAdminAccess && (
            <p style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.85rem', color: '#e55' }}>
              Sign in as admin on the Account page to manage past-event media.
            </p>
          )}
          <div className="artwork-gallery">
            {groupedPastEvents.map((group) => (
              <div key={group.key} className="artwork-card">
              <div className="artwork-image">
                {isVideoUrl(group.coverItem.image_url) ? (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
                    <video
                      src={group.coverItem.image_url}
                      controls
                      playsInline
                      preload="metadata"
                      style={{
                        width: '100%',
                        display: 'block',
                        objectFit: 'contain',
                        transform: `rotate(${normalizeMediaRotation(group.coverItem.media_rotation)}deg)`,
                        transformOrigin: 'center center',
                      }}
                    />
                  </div>
                ) : (
                  <img src={group.coverItem.image_url} alt={group.title} />
                )}
              </div>
              <div className="artwork-info">
                {isVideoUrl(group.coverItem.image_url) && (
                  <p className="artwork-medium" style={{ marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Video
                  </p>
                )}
                <h3>{group.title}</h3>
                <p className="artwork-artist">{group.coverItem.artist || 'Apollo Selene'}</p>
                <p className="artwork-medium">{group.items.length} media item{group.items.length === 1 ? '' : 's'}</p>
                <p className="artwork-description">{group.description || group.coverItem.description}</p>
                <p className="artwork-date">
                  {group.date ? `Event Date: ${group.date}` : ''}
                  {group.time ? ` · ${group.time}` : ''}
                </p>
                {group.location && <p className="artwork-date">Location: {group.location}</p>}
                <button
                  type="button"
                  onClick={() =>
                    openMediaViewer({
                      title: group.title,
                      subtitle: group.location || '',
                      items: group.items,
                    })
                  }
                  style={{ marginTop: '0.5rem', marginBottom: '0.6rem', padding: '0.55rem 0.95rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--button-bg)', color: 'var(--button-text)', cursor: 'pointer' }}
                >
                  View media
                </button>
                {isAdmin && hasMediaAdminAccess && (
                  <div style={{ marginTop: '0.9rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', opacity: 0.75 }}>Connect this completed event to a button</label>
                    <select
                      value={group.coverItem.event_id || ''}
                      onChange={(e) => handleLinkEvent(group.coverItem.id, e.target.value)}
                      disabled={savingLinkId === group.coverItem.id}
                      style={{ width: '100%', padding: '0.55rem 0.65rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                    >
                      <option value="">Unlinked</option>
                      {events.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} · {item.date}
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: '0.35rem' }}>
                      Admin only: choose which live event card opens this past event. This links the cover media item.
                    </p>
                    {linkStatus[group.coverItem.id] && (
                      <p style={{ fontSize: '0.78rem', marginTop: '0.35rem', color: linkStatus[group.coverItem.id].toLowerCase().includes('failed') || linkStatus[group.coverItem.id].toLowerCase().includes('required') ? '#e55' : '#4caf50' }}>
                        {linkStatus[group.coverItem.id]}
                      </p>
                    )}
                  </div>
                )}
              </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mediaViewer.open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(6, 9, 16, 0.92)',
            backdropFilter: 'blur(6px)',
            overflowY: 'auto',
            padding: 'clamp(0.9rem, 2.5vw, 1.75rem)',
          }}
        >
          <div style={{ width: 'min(1600px, 100%)', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.9rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p className="section-kicker" style={{ marginBottom: '0.25rem' }}>Past event media</p>
                <h2 style={{ margin: 0 }}>{mediaViewer.title}</h2>
                {mediaViewer.subtitle && <p style={{ margin: '0.35rem 0 0', color: 'var(--muted-color)' }}>{mediaViewer.subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={closeMediaViewer}
                style={{ padding: '0.55rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color-strong)', background: 'var(--button-bg)', color: 'var(--button-text)', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
                gap: 'clamp(0.8rem, 1.8vw, 1.2rem)',
                alignItems: 'start',
              }}
            >
              {mediaViewer.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'color-mix(in srgb, var(--surface-color) 88%, transparent)',
                    border: '1px solid var(--border-color-strong)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-soft)',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    {isVideoUrl(item.image_url) ? (
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px', background: '#000' }}>
                        <video
                          src={item.image_url}
                          controls
                          playsInline
                          preload="metadata"
                          style={{
                            width: '100%',
                            display: 'block',
                            maxHeight: '70vh',
                            objectFit: 'contain',
                            transform: `rotate(${getEffectiveMediaRotation(item)}deg)`,
                            transformOrigin: 'center center',
                          }}
                        />
                      </div>
                    ) : (
                      <img src={item.image_url} alt={item.title} style={{ width: '100%', display: 'block', maxHeight: '48vh', objectFit: 'cover' }} />
                    )}
                    {isAdmin && hasMediaAdminAccess && (
                      <button
                        type="button"
                        onClick={() => handleRemovePastEventMedia(item)}
                        disabled={photoRemovingId === item.id || photoUploading}
                        style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', padding: '0.35rem 0.7rem', borderRadius: '999px', border: '1px solid color-mix(in srgb, #c34646 70%, var(--border-color-strong))', background: 'rgba(20, 12, 12, 0.78)', color: '#ffd5d5', cursor: 'pointer' }}
                      >
                        {photoRemovingId === item.id ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '0.75rem 0.85rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.02rem' }}>{item.title}</h3>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: 'var(--muted-color)' }}>
                      {item.medium || (isVideoUrl(item.image_url) ? 'Event Video' : 'Event Photo')}
                    </p>
                    {isVideoUrl(item.image_url) && isAdmin && hasMediaAdminAccess && (
                      <div style={{ marginTop: '0.55rem', display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRotateMediaPreview(item.id, -90)}
                          style={{ padding: '0.35rem 0.7rem', borderRadius: '10px', border: '1px solid var(--border-color-strong)', background: 'var(--button-bg)', color: 'var(--button-text)', cursor: 'pointer' }}
                        >
                          Rotate -90°
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRotateMediaPreview(item.id, 90)}
                          style={{ padding: '0.35rem 0.7rem', borderRadius: '10px', border: '1px solid var(--border-color-strong)', background: 'var(--button-bg)', color: 'var(--button-text)', cursor: 'pointer' }}
                        >
                          Rotate +90°
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveMediaRotation(item)}
                          disabled={savingMediaRotationId === item.id || getEffectiveMediaRotation(item) === normalizeMediaRotation(item.media_rotation)}
                          style={{ padding: '0.35rem 0.7rem', borderRadius: '10px', border: '1px solid var(--border-color-strong)', background: 'linear-gradient(135deg, #d9e4ff, #8aa4ca)', color: '#08111f', cursor: 'pointer' }}
                        >
                          {savingMediaRotationId === item.id ? 'Saving…' : 'Save orientation'}
                        </button>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted-color)' }}>
                          {getEffectiveMediaRotation(item)}°
                        </p>
                      </div>
                    )}
                    {item.description && (
                      <p style={{ margin: '0.45rem 0 0', fontSize: '0.88rem' }}>{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedEventId && !loading && !selectedEventMeta && selectedPastEventItems.length === 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p>No event was found for this link.</p>
        </div>
      )}
    </div>
  );
};

export default PastEvents;
