import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import InlineEditor from '../components/InlineEditor';
import { isAdminUiEnabled } from '../lib/adminAccess';

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

      const [galleryRes, eventsRes, guestsRes] = await Promise.all([
        supabase
          .from('gallery_items')
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

      if (galleryRes.error) {
        console.error('Failed to load past events', galleryRes.error);
      } else {
        setPastEvents(galleryRes.data || []);
      }

      if (eventsRes.data) {
        setEvents(eventsRes.data || []);
      }

      if (guestsRes.data) {
        const nextGuests = {};
        (guestsRes.data || []).forEach((guest) => {
          if (!nextGuests[guest.event_id]) nextGuests[guest.event_id] = [];
          nextGuests[guest.event_id].push(guest);
        });
        setEventGuests(nextGuests);
      }

      setLoading(false);
    };

    loadPastEvents();
  }, []);

  const selectedGuests = selectedEventId ? (eventGuests[selectedEventId] || []) : [];
  const selectedPastEvent = selectedPastEventItems[0] || null;

  const handleLinkEvent = async (galleryItemId, eventId) => {
    if (!supabase) return;
    setSavingLinkId(galleryItemId);

    const event = events.find((item) => String(item.id) === String(eventId));
    const update = {
      event_id: event ? String(event.id) : null,
      event_date: event?.date || null,
      event_time: event?.time || null,
      event_location: event?.location || null,
    };

    const { error } = await supabase.from('gallery_items').update(update).eq('id', galleryItemId);
    if (error) {
      console.error('Failed to link past event', error);
    } else {
      const { data } = await supabase
        .from('gallery_items')
        .select('id, title, artist, description, medium, year, story, image_url, event_id, event_date, event_time, event_location')
        .order('created_at', { ascending: false });
      setPastEvents(data || []);
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
                <img src={selectedPastEvent.image_url} alt={selectedPastEvent.title} style={{ width: '100%', display: 'block' }} />
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
              {selectedPastEventItems.length > 0 ? (
                <div className="artwork-gallery" style={{ marginTop: '0.75rem' }}>
                  {selectedPastEventItems.map((item) => (
                    <div key={item.id} className="artwork-card">
                      <div className="artwork-image">
                        <img src={item.image_url} alt={item.title} />
                      </div>
                      <div className="artwork-info">
                        <h3>{item.title}</h3>
                        <p className="artwork-artist">{item.artist || 'Apollo Selene'}</p>
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
                <img src={event.image_url} alt={event.title} />
              </div>
              <div className="artwork-info">
                <h3>{event.title}</h3>
                <p className="artwork-artist">{event.artist || 'Apollo Selene'}</p>
                <p className="artwork-medium">{event.medium || 'Event Poster'}</p>
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
