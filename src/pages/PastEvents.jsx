import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import InlineEditor from '../components/InlineEditor';
import { clearLegacyAdminSession, getLegacyAdminPassword, isAdminUiEnabled } from '../lib/adminAccess';

const GALLERY_TABLE = 'gallery_items';
const GALLERY_BUCKET = 'gallery';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 4 * 60;

const isVideoUrl = (value = '') => /\.(mp4|webm|ogg)(\?.*)?$/i.test(value);

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

const getClerkTokenSafe = async () => {
  if (typeof window === 'undefined') return null;

  try {
    const token = await window.Clerk?.session?.getToken?.();
    return token || null;
  } catch {
    return null;
  }
};

const getClerkTokenWithRetry = async ({ attempts = 3, delayMs = 250 } = {}) => {
  for (let index = 0; index < attempts; index += 1) {
    const token = await getClerkTokenSafe();
    if (token) {
      return token;
    }

    if (index < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }

  return null;
};

const loadPastEventsData = async () => {
  if (!supabase) {
    return { galleryItems: [], events: [], guests: [] };
  }

  const [galleryRes, eventsRes, guestsRes] = await Promise.all([
    supabase
      .from(GALLERY_TABLE)
      .select('id, title, artist, description, medium, year, story, image_url, event_id, event_date, event_time, event_location')
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

  const selectedEventId = searchParams.get('event');

  const selectedPastEventItems = useMemo(
    () => pastEvents.filter((item) => String(item.event_id) === String(selectedEventId)),
    [pastEvents, selectedEventId]
  );

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

  const selectedGuests = selectedEventId ? (eventGuests[selectedEventId] || []) : [];
  const selectedPastEvent = selectedPastEventItems[0] || null;

  const handleAddPhotosToEvent = async (event) => {
    if (!supabase || !event || !selectedEventId) {
      return;
    }

    const adminPassword = getLegacyAdminPassword();

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

      const clerkToken = adminPassword ? null : await getClerkTokenWithRetry();
      if (!adminPassword && !clerkToken) {
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
        if (adminPassword) formData.append('adminPassword', adminPassword);

        const response = await fetch(`${supabaseUrl}/functions/v1/upload-past-event-media`, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            ...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
          },
          body: formData,
        });

        const responseBody = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (typeof responseBody?.error === 'string' && responseBody.error.includes('Stored admin session is invalid')) {
            clearLegacyAdminSession();
            throw new Error('Your admin session expired on this site. Open Admin Login and sign in again, then retry the upload.');
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
      const adminPassword = getLegacyAdminPassword();
      let invokeOptions = { body: payload };

      if (adminPassword) {
        invokeOptions = { body: { ...payload, adminPassword } };
      } else {
        const clerkToken = await getClerkTokenWithRetry();
        if (!clerkToken) {
          throw new Error('Admin login is required to link this past event.');
        }
        invokeOptions = {
          body: payload,
          headers: {
            Authorization: `Bearer ${clerkToken}`,
          },
        };
      }

      const { data, error } = await supabase.functions.invoke('link-past-event', invokeOptions);
      if (error) {
        if (typeof data?.error === 'string' && data.error.includes('Stored admin session is invalid')) {
          clearLegacyAdminSession();
          throw new Error('Your admin session expired on this site. Open Admin Login and sign in again, then retry linking this event.');
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
                  <video src={selectedPastEvent.image_url} controls playsInline preload="metadata" style={{ width: '100%', display: 'block' }} />
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
              {isAdmin && selectedEventId && (
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
                      disabled={photoUploading || photoFiles.length === 0}
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
                <div className="artwork-gallery" style={{ marginTop: '0.75rem' }}>
                  {selectedPastEventItems.map((item) => (
                    <div key={item.id} className="artwork-card">
                      <div className="artwork-image">
                        {isVideoUrl(item.image_url) ? (
                          <video src={item.image_url} controls playsInline preload="metadata" style={{ width: '100%', display: 'block' }} />
                        ) : (
                          <img src={item.image_url} alt={item.title} />
                        )}
                      </div>
                      <div className="artwork-info">
                        {isVideoUrl(item.image_url) && (
                          <p className="artwork-medium" style={{ marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Video
                          </p>
                        )}
                        <h3>{item.title}</h3>
                        <p className="artwork-artist">{item.artist || 'Apollo Selene'}</p>
                        <p className="artwork-medium">{item.medium || (isVideoUrl(item.image_url) ? 'Event Video' : 'Event Photo')}</p>
                        <p className="artwork-description">{item.description}</p>
                      </div>
                    </div>
                  ))}
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
        <div className="artwork-gallery">
          {pastEvents.map((event) => (
            <div key={event.id} className="artwork-card">
              <div className="artwork-image">
                {isVideoUrl(event.image_url) ? (
                  <video src={event.image_url} controls playsInline preload="metadata" style={{ width: '100%', display: 'block' }} />
                ) : (
                  <img src={event.image_url} alt={event.title} />
                )}
              </div>
              <div className="artwork-info">
                {isVideoUrl(event.image_url) && (
                  <p className="artwork-medium" style={{ marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Video
                  </p>
                )}
                <h3>{event.title}</h3>
                <p className="artwork-artist">{event.artist || 'Apollo Selene'}</p>
                <p className="artwork-medium">{event.medium || (isVideoUrl(event.image_url) ? 'Event Video' : 'Event Poster')}</p>
                <p className="artwork-description">{event.description}</p>
                <p className="artwork-date">
                  {event.event_date ? `Event Date: ${event.event_date}` : ''}
                  {event.event_time ? ` · ${event.event_time}` : ''}
                </p>
                {event.event_location && <p className="artwork-date">Location: {event.event_location}</p>}
                {isAdmin && (
                  <div style={{ marginTop: '0.9rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', opacity: 0.75 }}>Connect this completed event to a button</label>
                    <select
                      value={event.event_id || ''}
                      onChange={(e) => handleLinkEvent(event.id, e.target.value)}
                      disabled={savingLinkId === event.id}
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
                      Admin only: choose which live event card opens this past event.
                    </p>
                    {linkStatus[event.id] && (
                      <p style={{ fontSize: '0.78rem', marginTop: '0.35rem', color: linkStatus[event.id].toLowerCase().includes('failed') || linkStatus[event.id].toLowerCase().includes('required') ? '#e55' : '#4caf50' }}>
                        {linkStatus[event.id]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
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
