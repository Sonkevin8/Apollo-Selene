import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  createMixtapeInvite,
  createMixtapeExchange,
  fetchMyMixtapeExchanges,
  fetchReceiverProfiles,
  getCurrentSession,
  markInviteStatus,
  onAuthStateChange,
  sendMixtapeInviteEmail,
  signOutUser,
  updateMixtapeStatus,
} from '../lib/mixtapeExchange';
import './MixtapeExchange.css';

const defaultComposeForm = {
  receiver_id: '',
  cassette_title: '',
  set_style: '',
  sender_airport_code: 'JFK',
  sender_airport_name: 'John F. Kennedy International Airport',
  sender_airport_lat: '40.6413',
  sender_airport_lng: '-73.7781',
  receiver_airport_code: 'LHR',
  receiver_airport_name: 'Heathrow Airport',
  receiver_airport_lat: '51.47',
  receiver_airport_lng: '-0.4543',
  sender_address: '',
  sender_address_lat: '40.7128',
  sender_address_lng: '-74.0060',
  receiver_address: '',
  receiver_address_lat: '51.5072',
  receiver_address_lng: '-0.1276',
  note: '',
};

const numberOrNull = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceKm = (startLat, startLng, endLat, endLng) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(endLat - startLat);
  const dLng = toRadians(endLng - startLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(startLat)) * Math.cos(toRadians(endLat)) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateFlightMinutes = (km) => {
  if (!Number.isFinite(km) || km <= 0) {
    return 0;
  }

  const adjustedRouteKm = km * 1.08;
  const cruiseSpeedKmh = 835;
  const taxiAndHandlingMinutes = 32;
  return Math.max(20, Math.round((adjustedRouteKm / cruiseSpeedKmh) * 60 + taxiAndHandlingMinutes));
};

const calculateVehicleMinutes = (km) => {
  if (!Number.isFinite(km) || km <= 0) {
    return 0;
  }

  const cityDrivingSpeedKmh = 46;
  const handoffBufferMinutes = 10;
  return Math.max(8, Math.round((km / cityDrivingSpeedKmh) * 60 + handoffBufferMinutes));
};

const MixtapeExchange = ({ globeComponent }) => {
  const [session, setSession] = useState(null);
  const [composeForm, setComposeForm] = useState(defaultComposeForm);
  const [myProfile, setMyProfile] = useState(null);
  const [receiverQuery, setReceiverQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [receivers, setReceivers] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const userId = session?.user?.id || null;

  const receiverLookup = useMemo(() => {
    const map = new Map();
    receivers.forEach((profile) => {
      map.set(profile.id, profile);
    });
    return map;
  }, [receivers]);

  const filteredReceivers = useMemo(() => {
    const query = receiverQuery.trim().toLowerCase();
    if (!query) {
      return receivers;
    }

    return receivers.filter((profile) => {
      const displayName = (profile.display_name || '').toLowerCase();
      const email = (profile.email || '').toLowerCase();
      const city = (profile.city || '').toLowerCase();
      return (
        displayName.includes(query) ||
        email.includes(query) ||
        city.includes(query)
      );
    });
  }, [receiverQuery, receivers]);

  const routeMetrics = useMemo(() => {
    const senderAirportLat = numberOrNull(composeForm.sender_airport_lat);
    const senderAirportLng = numberOrNull(composeForm.sender_airport_lng);
    const receiverAirportLat = numberOrNull(composeForm.receiver_airport_lat);
    const receiverAirportLng = numberOrNull(composeForm.receiver_airport_lng);

    const senderAddressLat = numberOrNull(composeForm.sender_address_lat);
    const senderAddressLng = numberOrNull(composeForm.sender_address_lng);
    const receiverAddressLat = numberOrNull(composeForm.receiver_address_lat);
    const receiverAddressLng = numberOrNull(composeForm.receiver_address_lng);

    const flightDistance =
      senderAirportLat === null ||
      senderAirportLng === null ||
      receiverAirportLat === null ||
      receiverAirportLng === null
        ? 0
        : distanceKm(senderAirportLat, senderAirportLng, receiverAirportLat, receiverAirportLng);

    const senderGroundDistance =
      senderAddressLat === null ||
      senderAddressLng === null ||
      senderAirportLat === null ||
      senderAirportLng === null
        ? 0
        : distanceKm(senderAddressLat, senderAddressLng, senderAirportLat, senderAirportLng);

    const receiverGroundDistance =
      receiverAddressLat === null ||
      receiverAddressLng === null ||
      receiverAirportLat === null ||
      receiverAirportLng === null
        ? 0
        : distanceKm(receiverAirportLat, receiverAirportLng, receiverAddressLat, receiverAddressLng);

    const flightDurationMinutes = calculateFlightMinutes(flightDistance);
    const senderVehicleMinutes = calculateVehicleMinutes(senderGroundDistance);
    const receiverVehicleMinutes = calculateVehicleMinutes(receiverGroundDistance);
    const totalVehicleMinutes = senderVehicleMinutes + receiverVehicleMinutes;

    return {
      flightDistance,
      senderGroundDistance,
      receiverGroundDistance,
      flightDurationMinutes,
      senderVehicleMinutes,
      receiverVehicleMinutes,
      totalVehicleMinutes,
      totalDeliveryMinutes: flightDurationMinutes + totalVehicleMinutes,
    };
  }, [composeForm]);

  const loadSignedInData = async (currentUserId) => {
    if (!currentUserId) {
      return;
    }

    const [profiles, myExchanges, profile] = await Promise.all([
      fetchReceiverProfiles({ currentUserId }),
      fetchMyMixtapeExchanges({ userId: currentUserId }),
      (async () => {
        try {
          const { fetchMyProfile } = await import('../lib/mixtapeExchange');
          return await fetchMyProfile({ userId: currentUserId });
        } catch {
          return null;
        }
      })(),
    ]);

    setReceivers(profiles);
    setExchanges(myExchanges);
    setMyProfile(profile);

    // Auto-fill sender address/coords if available
    if (profile && (profile.address_lat || profile.address_lng)) {
      setComposeForm((prev) => ({
        ...prev,
        sender_address: profile.address || '',
        sender_address_lat: profile.address_lat ? String(profile.address_lat) : '',
        sender_address_lng: profile.address_lng ? String(profile.address_lng) : '',
      }));
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const existingSession = await getCurrentSession();
        if (!isMounted) {
          return;
        }

        setSession(existingSession);
        if (existingSession?.user?.id) {
          await loadSignedInData(existingSession.user.id);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error.message || 'Unable to initialize auth session.');
        }
      }
    };

    init();

    const { data: authSubscription } = onAuthStateChange(async (_, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      if (nextSession?.user?.id) {
        try {
          await loadSignedInData(nextSession.user.id);
        } catch (error) {
          setMessage(error.message || 'Unable to load exchange data.');
        }
      } else {
        setReceivers([]);
        setExchanges([]);
      }
    });

    return () => {
      isMounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const handleCreateExchange = async (event) => {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const senderAirportLat = numberOrNull(composeForm.sender_airport_lat);
      const senderAirportLng = numberOrNull(composeForm.sender_airport_lng);
      const receiverAirportLat = numberOrNull(composeForm.receiver_airport_lat);
      const receiverAirportLng = numberOrNull(composeForm.receiver_airport_lng);
      const senderAddressLat = numberOrNull(composeForm.sender_address_lat);
      const senderAddressLng = numberOrNull(composeForm.sender_address_lng);
      const receiverAddressLat = numberOrNull(composeForm.receiver_address_lat);
      const receiverAddressLng = numberOrNull(composeForm.receiver_address_lng);

      if (
        [senderAirportLat, senderAirportLng, receiverAirportLat, receiverAirportLng].some(
          (value) => value === null
        )
      ) {
        throw new Error('Airport coordinates are required for both artists.');
      }

      const payload = {
        sender_id: userId,
        receiver_id: composeForm.receiver_id,
        cassette_title: composeForm.cassette_title,
        set_style: composeForm.set_style || null,
        sender_hub:
          composeForm.sender_airport_name || composeForm.sender_airport_code || 'Sender Airport',
        receiver_hub:
          composeForm.receiver_airport_name || composeForm.receiver_airport_code || 'Receiver Airport',
        sender_lat: senderAirportLat,
        sender_lng: senderAirportLng,
        receiver_lat: receiverAirportLat,
        receiver_lng: receiverAirportLng,
        sender_airport_code: composeForm.sender_airport_code || null,
        sender_airport_name: composeForm.sender_airport_name || null,
        sender_airport_lat: senderAirportLat,
        sender_airport_lng: senderAirportLng,
        receiver_airport_code: composeForm.receiver_airport_code || null,
        receiver_airport_name: composeForm.receiver_airport_name || null,
        receiver_airport_lat: receiverAirportLat,
        receiver_airport_lng: receiverAirportLng,
        sender_address: composeForm.sender_address || null,
        sender_address_lat: senderAddressLat,
        sender_address_lng: senderAddressLng,
        receiver_address: composeForm.receiver_address || null,
        receiver_address_lat: receiverAddressLat,
        receiver_address_lng: receiverAddressLng,
        flight_distance_km: Number(routeMetrics.flightDistance.toFixed(1)),
        flight_duration_minutes: routeMetrics.flightDurationMinutes,
        sender_vehicle_minutes: routeMetrics.senderVehicleMinutes,
        receiver_vehicle_minutes: routeMetrics.receiverVehicleMinutes,
        total_vehicle_minutes: routeMetrics.totalVehicleMinutes,
        total_delivery_minutes: routeMetrics.totalDeliveryMinutes,
        duration_seconds: Math.max(60, routeMetrics.flightDurationMinutes * 60),
        note: composeForm.note || null,
        status: 'pending',
      };

      await createMixtapeExchange(payload);
      await loadSignedInData(userId);
      setComposeForm(defaultComposeForm);
      setMessage('Mixtape exchange created and added to the delivery globe.');
    } catch (error) {
      setMessage(error.message || 'Could not create mixtape exchange.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (exchangeId, status) => {
    setLoading(true);
    setMessage('');

    try {
      await updateMixtapeStatus({ exchangeId, status });
      if (userId) {
        await loadSignedInData(userId);
      }
      setMessage(`Exchange status updated to ${status}.`);
    } catch (error) {
      setMessage(error.message || 'Could not update exchange status.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setMessage('');

    try {
      await signOutUser();
      setMessage('Signed out.');
    } catch (error) {
      setMessage(error.message || 'Could not sign out.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !userId) {
      setMessage('Add an invite email first.');
      return;
    }

    setLoading(true);
    setMessage('');

    let createdInvite = null;

    try {
      createdInvite = await createMixtapeInvite({
        senderId: userId,
        inviteEmail: inviteEmail.trim().toLowerCase(),
      });

      try {
        await sendMixtapeInviteEmail({
          inviteEmail: inviteEmail.trim().toLowerCase(),
          senderEmail: session?.user?.email || '',
        });
        await markInviteStatus({ inviteId: createdInvite.id, status: 'sent' });
        setMessage('Invite email sent successfully.');
      } catch (edgeFunctionError) {
        await markInviteStatus({ inviteId: createdInvite.id, status: 'pending' });
        setMessage(
          'Invite saved. Email function is not active yet, so no email was sent automatically.'
        );
      }

      setInviteEmail('');
    } catch (error) {
      setMessage(error.message || 'Could not create invite.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="content-section mixtape-shell">
        <section className="mixtape-auth">
          <h2>Mixtape Exchange Needs Supabase</h2>
          <p>
            Add your Supabase URL and anon key in local environment variables before using sign-in
            and mixtape trading.
          </p>
        </section>
      </div>
    );
  }

  const handleMixtapeUpload = async () => {
    if (!uploadFile || !session || !supabase) return;
    setUploading(true);
    setUploadStatus('');
    const ext = uploadFile.name.split('.').pop().toLowerCase();
    if (ext !== 'mp3') {
      setUploadStatus('Only MP3 files are allowed.');
      setUploading(false);
      return;
    }
    const maxBytes = 50 * 1024 * 1024; // 50 MB
    if (uploadFile.size > maxBytes) {
      setUploadStatus('File is too large. Maximum size is 50 MB.');
      setUploading(false);
      return;
    }
    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${session.user.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('mixtapes').upload(path, uploadFile, { contentType: 'audio/mpeg', upsert: false });
    setUploading(false);
    if (error) {
      setUploadStatus(`Upload failed: ${error.message}`);
    } else {
      // Save record to mixtape_uploads table
      const { data: { publicUrl } } = supabase.storage.from('mixtapes').getPublicUrl(path);
      await supabase.from('mixtape_uploads').insert({
        user_id: session.user.id,
        title: uploadTitle.trim() || uploadFile.name,
        file_url: publicUrl,
        price: uploadPrice ? parseFloat(uploadPrice) : null,
      });
      setUploadStatus('Uploaded successfully!');
      setUploadFile(null);
      setUploadTitle('');
      setUploadPrice('');
    }
  };

  return (
    <div className="content-section mixtape-shell">
      {globeComponent ? (
        <section className="mixtape-globe-section">
          <h2>Global Mixtape Delivery Globe</h2>
          <div className="mixtape-globe-embed">{globeComponent}</div>
        </section>
      ) : null}

      {false ? (
        <>
          <section className="mixtape-compose">
            <h2>Create Mixtape Delivery</h2>
            <form onSubmit={handleCreateExchange} className="mixtape-form-grid">
              <div className="mixtape-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="receiver-search">Find Receiver (name, email, city)</label>
                <input
                  id="receiver-search"
                  type="text"
                  value={receiverQuery}
                  onChange={(event) => setReceiverQuery(event.target.value)}
                  placeholder="Search DJs and musicians"
                />
                <p className="mixtape-helper-text">
                  Showing {filteredReceivers.length} of {receivers.length} available members.
                </p>
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-id">Receiver</label>
                <select
                  id="receiver-id"
                  value={composeForm.receiver_id}
                  onChange={(event) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      receiver_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select a receiver</option>
                  {filteredReceivers.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.display_name || profile.email} {profile.city ? `(${profile.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {filteredReceivers.length === 0 ? (
                <div className="mixtape-field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="invite-email">Invite Someone New (email)</label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="djfriend@example.com"
                  />
                  <p className="mixtape-helper-text">
                    No receiver matches your search yet. Ask them to sign up with this email, then
                    refresh this page to send a tape.
                  </p>
                  <div className="mixtape-actions">
                    <button
                      type="button"
                      className="button-link secondary-link"
                      onClick={handleSendInvite}
                      disabled={loading || !inviteEmail.trim()}
                    >
                      Send Invite
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mixtape-field">
                <label htmlFor="cassette-title">Cassette Title</label>
                <input
                  id="cassette-title"
                  value={composeForm.cassette_title}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, cassette_title: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="set-style">Set Style</label>
                <input
                  id="set-style"
                  value={composeForm.set_style}
                  onChange={(event) => setComposeForm((prev) => ({ ...prev, set_style: event.target.value }))}
                  placeholder="Deep house, jungle, ambient, etc."
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-airport-code">Sender Airport Code</label>
                <input
                  id="sender-airport-code"
                  value={composeForm.sender_airport_code}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, sender_airport_code: event.target.value.toUpperCase() }))
                  }
                  placeholder="JFK"
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-airport-name">Sender Airport Name</label>
                <input
                  id="sender-airport-name"
                  value={composeForm.sender_airport_name}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, sender_airport_name: event.target.value }))
                  }
                  placeholder="John F. Kennedy International Airport"
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-airport-lat">Sender Airport Latitude</label>
                <input
                  id="sender-airport-lat"
                  type="number"
                  step="any"
                  value={composeForm.sender_airport_lat}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, sender_airport_lat: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-airport-lng">Sender Airport Longitude</label>
                <input
                  id="sender-airport-lng"
                  type="number"
                  step="any"
                  value={composeForm.sender_airport_lng}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, sender_airport_lng: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-airport-code">Receiver Airport Code</label>
                <input
                  id="receiver-airport-code"
                  value={composeForm.receiver_airport_code}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_airport_code: event.target.value.toUpperCase() }))
                  }
                  placeholder="LHR"
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-airport-name">Receiver Airport Name</label>
                <input
                  id="receiver-airport-name"
                  value={composeForm.receiver_airport_name}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_airport_name: event.target.value }))
                  }
                  placeholder="Heathrow Airport"
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-airport-lat">Receiver Airport Latitude</label>
                <input
                  id="receiver-airport-lat"
                  type="number"
                  step="any"
                  value={composeForm.receiver_airport_lat}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_airport_lat: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-airport-lng">Receiver Airport Longitude</label>
                <input
                  id="receiver-airport-lng"
                  type="number"
                  step="any"
                  value={composeForm.receiver_airport_lng}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_airport_lng: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-address">Sender Address / Studio</label>
                <input
                  id="sender-address"
                  value={composeForm.sender_address}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, sender_address: event.target.value }))
                  }
                  placeholder="Brooklyn, New York"
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-address-lat">Sender Address Latitude</label>
                <input
                  id="sender-address-lat"
                  type="number"
                  step="any"
                  value={composeForm.sender_address_lat}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, sender_address_lat: event.target.value }))
                  }
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-address-lng">Sender Address Longitude</label>
                <input
                  id="sender-address-lng"
                  type="number"
                  step="any"
                  value={composeForm.sender_address_lng}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, sender_address_lng: event.target.value }))
                  }
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-address">Receiver Address / Venue</label>
                <input
                  id="receiver-address"
                  value={composeForm.receiver_address}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_address: event.target.value }))
                  }
                  placeholder="Hackney, London"
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-address-lat">Receiver Address Latitude</label>
                <input
                  id="receiver-address-lat"
                  type="number"
                  step="any"
                  value={composeForm.receiver_address_lat}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_address_lat: event.target.value }))
                  }
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-address-lng">Receiver Address Longitude</label>
                <input
                  id="receiver-address-lng"
                  type="number"
                  step="any"
                  value={composeForm.receiver_address_lng}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_address_lng: event.target.value }))
                  }
                />
              </div>

              <div className="mixtape-field" style={{ gridColumn: '1 / -1' }}>
                <label>Calculated Route Timing</label>
                <p className="mixtape-helper-text">
                  Flight route (airport to airport): {Math.round(routeMetrics.flightDistance)} km •{' '}
                  {routeMetrics.flightDurationMinutes} min
                </p>
                <p className="mixtape-helper-text">
                  Vehicle time (address to airport + airport to address): {routeMetrics.totalVehicleMinutes}{' '}
                  min ({routeMetrics.senderVehicleMinutes} + {routeMetrics.receiverVehicleMinutes})
                </p>
                <p className="mixtape-helper-text">
                  Total estimated delivery time: {routeMetrics.totalDeliveryMinutes} min
                </p>
              </div>

              <div className="mixtape-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="exchange-note">Note</label>
                <textarea
                  id="exchange-note"
                  value={composeForm.note}
                  onChange={(event) => setComposeForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Message to the receiver..."
                />
              </div>

              <div className="mixtape-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="button-link primary-link" disabled={loading}>
                  Create Delivery
                </button>
              </div>
            </form>
          </section>

          <section className="mixtape-list">
            <h2>My Exchanges</h2>
            <div className="mixtape-list-grid">
              {exchanges.map((exchange) => {
                const receiverProfile = receiverLookup.get(exchange.receiver_id);
                const receiverName = receiverProfile?.display_name || receiverProfile?.email || exchange.receiver_id;
                const isSender = exchange.sender_id === userId;
                const isReceiver = exchange.receiver_id === userId;

                return (
                  <article key={exchange.id} className="mixtape-item">
                    <h3>{exchange.cassette_title}</h3>
                    <div className="mixtape-meta">
                      <span className="mixtape-tag">{exchange.status}</span>
                      <span>{exchange.set_style || 'Unlabeled Style'}</span>
                      <span>{isSender ? `To: ${receiverName}` : 'Incoming for you'}</span>
                    </div>
                    {exchange.note ? <p>{exchange.note}</p> : null}
                    <div className="mixtape-actions">
                      {isSender && exchange.status === 'pending' ? (
                        <button
                          type="button"
                          className="button-link secondary-link"
                          onClick={() => handleStatusUpdate(exchange.id, 'in_flight')}
                        >
                          Mark In Flight
                        </button>
                      ) : null}
                      {isReceiver && exchange.status === 'in_flight' ? (
                        <button
                          type="button"
                          className="button-link secondary-link"
                          onClick={() => handleStatusUpdate(exchange.id, 'delivered')}
                        >
                          Mark Delivered
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      <section className="mixtape-upload">
        <h2>Upload My Mixtape</h2>
        {!session ? (
          <p className="mixtape-helper-text">
            <Link to="/account" className="button-link primary-link">Sign in</Link> to upload your mixtapes.
          </p>
        ) : (
          <div className="mixtape-upload-form">
            <label htmlFor="mixtape-file" className="mixtape-upload-label">
              {uploadFile ? uploadFile.name : 'Choose an MP3 file'}
              <input
                id="mixtape-file"
                type="file"
                accept=".mp3,audio/mpeg"
                className="mixtape-upload-input"
                onChange={(e) => { setUploadFile(e.target.files[0] || null); setUploadStatus(''); }}
              />
            </label>
            <input
              type="text"
              placeholder="Mixtape title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Price (NZD) — leave blank if free"
              value={uploadPrice}
              onChange={(e) => setUploadPrice(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
            <button
              type="button"
              className="button-link primary-link"
              onClick={handleMixtapeUpload}
              disabled={uploading || !uploadFile}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            {uploadStatus ? <p className="mixtape-upload-status">{uploadStatus}</p> : null}
          </div>
        )}
      </section>
    </div>
  );
};

export default MixtapeExchange;
