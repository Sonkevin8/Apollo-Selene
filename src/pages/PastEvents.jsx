import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './Artwork.css';

const PastEvents = () => {
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPastEvents = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('gallery_items')
        .select('id, title, artist, description, medium, year, story, image_url, event_id, event_date, event_time, event_location')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load past events', error);
      } else {
        setPastEvents(data || []);
      }
      setLoading(false);
    };

    loadPastEvents();
  }, []);

  return (
    <div className="content-section">
      <div className="card">
        <h1>Past Events</h1>
        <p>
          These are completed events that have been moved into the gallery after they finished. Each entry is treated as a piece of artwork from the community.
        </p>
      </div>

      {loading ? (
        <div className="card">
          <p>Loading past events…</p>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PastEvents;
