import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from '../lib/mixtapeExchange';

const EVENTS_TABLE = 'events';
const EVENT_GUESTS_TABLE = 'event_guests';
const EVENT_ATTENDANCE_TABLE = 'event_attendance';

// Poll Supabase for the purchase record until payment_status = 'paid'
const pollPurchase = async (sessionId, { retries = 12, delayMs = 1500 } = {}) => {
  for (let i = 0; i < retries; i++) {
    const { data, error } = await supabase
      .from('event_ticket_purchases')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();
    if (!error && data?.payment_status === 'paid') return data;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
};

// Fire Google Ads conversion — replace AW-XXXXXXXXX/YYYYYYY with your real IDs
const fireGoogleAdsConversion = () => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: 'AW-XXXXXXXXX/YYYYYYY', // ← replace with your Google Ads conversion ID
    });
  }
};

export default function ThankYou() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | confirmed | failed
  const [purchase, setPurchase] = useState(null);
  const conversionFired = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId || !supabase) {
      setStatus('failed');
      return;
    }

    (async () => {
      const currentUserId = getCurrentUserId();
      const data = await pollPurchase(sessionId);

      if (!data) {
        setStatus('failed');
        return;
      }

      setPurchase(data);
      setStatus('confirmed');

      // Fire Google Ads conversion once
      if (!conversionFired.current) {
        conversionFired.current = true;
        fireGoogleAdsConversion();
      }

      // Add user to guest list if not already present
      if (data.event_id && currentUserId) {
        const { data: existing } = await supabase
          .from(EVENT_ATTENDANCE_TABLE)
          .select('id')
          .eq('event_id', data.event_id)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (!existing) {
          const email = data.purchaser_email || currentUserId;

          // Find or create a guest row
          let guestId;
          const { data: guests } = await supabase
            .from(EVENT_GUESTS_TABLE)
            .select('id')
            .eq('event_id', data.event_id)
            .eq('contact', email)
            .maybeSingle();

          if (guests?.id) {
            guestId = guests.id;
          } else {
            const { data: newGuest } = await supabase
              .from(EVENT_GUESTS_TABLE)
              .insert([{ event_id: data.event_id, name: email, contact: email, added_by: currentUserId }])
              .select('id')
              .maybeSingle();
            guestId = newGuest?.id;
          }

          await supabase.from(EVENT_ATTENDANCE_TABLE).upsert({
            event_id: data.event_id,
            user_id: currentUserId,
            guest_id: guestId,
            name: email,
            contact: email,
          });

          // Increment event attendee count
          const { data: evData } = await supabase
            .from(EVENTS_TABLE)
            .select('attendees')
            .eq('id', data.event_id)
            .maybeSingle();
          if (evData) {
            await supabase
              .from(EVENTS_TABLE)
              .update({ attendees: (evData.attendees || 0) + 1 })
              .eq('id', data.event_id);
          }
        }
      }

      // Clean up URL params
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.pathname);
    })();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-NZ', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: 'var(--surface-color-strong)',
        border: '1px solid var(--border-color-strong)',
        borderRadius: 18,
        padding: '2.5rem 2rem',
        textAlign: 'center',
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
      }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ color: 'var(--heading-color)', marginBottom: '0.5rem' }}>Confirming your ticket…</h2>
            <p style={{ color: 'var(--muted-color)', fontSize: '0.95rem' }}>
              Checking your payment with Stripe. This usually takes just a moment.
            </p>
          </>
        )}

        {status === 'confirmed' && purchase && (
          <>
            <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>🎉</div>
            <h2 style={{ color: 'var(--heading-color)', margin: '0 0 0.5rem' }}>You're on the list!</h2>
            <p style={{ color: 'var(--muted-color)', fontSize: '0.95rem', margin: '0 0 1.75rem' }}>
              Your ticket has been confirmed. See you there.
            </p>

            {/* Event details card */}
            <div style={{
              background: 'var(--bg-secondary, var(--bg-base))',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: '1.1rem 1.25rem',
              marginBottom: '1.75rem',
              textAlign: 'left',
            }}>
              {purchase.event_title && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-color)', textTransform: 'uppercase', letterSpacing: 1 }}>Event</span>
                  <div style={{ fontWeight: 700, color: 'var(--heading-color)', fontSize: '1.1rem', marginTop: 2 }}>
                    {purchase.event_title}
                  </div>
                </div>
              )}
              {purchase.event_date && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-color)', textTransform: 'uppercase', letterSpacing: 1 }}>Date</span>
                  <div style={{ color: 'var(--text-color)', fontSize: '0.95rem', marginTop: 2 }}>
                    {formatDate(purchase.event_date)}
                  </div>
                </div>
              )}
              {purchase.event_location && (
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-color)', textTransform: 'uppercase', letterSpacing: 1 }}>Location</span>
                  <div style={{ color: 'var(--text-color)', fontSize: '0.95rem', marginTop: 2 }}>
                    📍 {purchase.event_location}
                  </div>
                </div>
              )}
              {purchase.purchaser_email && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-color)', textTransform: 'uppercase', letterSpacing: 1 }}>Confirmation sent to</span>
                  <div style={{ color: 'var(--text-color)', fontSize: '0.95rem', marginTop: 2 }}>
                    {purchase.purchaser_email}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/events')}
              style={{
                background: 'var(--button-bg)',
                color: 'var(--button-text)',
                border: 'none',
                borderRadius: 10,
                padding: '0.75rem 2rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Back to Events
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h2 style={{ color: 'var(--heading-color)', margin: '0 0 0.5rem' }}>Could not confirm your ticket</h2>
            <p style={{ color: 'var(--muted-color)', fontSize: '0.95rem', margin: '0 0 1.75rem' }}>
              Your payment may still have gone through. Please check your email for a Stripe receipt,
              or contact us and we'll sort it out.
            </p>
            <button
              onClick={() => navigate('/events')}
              style={{
                background: 'var(--button-bg)',
                color: 'var(--button-text)',
                border: 'none',
                borderRadius: 10,
                padding: '0.75rem 2rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Back to Events
            </button>
          </>
        )}
      </div>
    </div>
  );
}
