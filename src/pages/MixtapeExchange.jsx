import React, { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  createMixtapeInvite,
  createMixtapeExchange,
  fetchMyMixtapeExchanges,
  fetchReceiverProfiles,
  getCurrentSession,
  markInviteStatus,
  onAuthStateChange,
  sendMixtapeInviteEmail,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
  updateMixtapeStatus,
} from '../lib/mixtapeExchange';
import './MixtapeExchange.css';

const defaultComposeForm = {
  receiver_id: '',
  cassette_title: '',
  set_style: '',
  sender_hub: '',
  receiver_hub: '',
  sender_lat: '40.7128',
  sender_lng: '-74.0060',
  receiver_lat: '51.5072',
  receiver_lng: '-0.1276',
  note: '',
};

const defaultAuthForm = {
  email: '',
  password: '',
  displayName: '',
};

const MixtapeExchange = () => {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [composeForm, setComposeForm] = useState(defaultComposeForm);
  const [receiverQuery, setReceiverQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [receivers, setReceivers] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  const loadSignedInData = async (currentUserId) => {
    if (!currentUserId) {
      return;
    }

    const [profiles, myExchanges] = await Promise.all([
      fetchReceiverProfiles({ currentUserId }),
      fetchMyMixtapeExchanges({ userId: currentUserId }),
    ]);

    setReceivers(profiles);
    setExchanges(myExchanges);
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

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (authMode === 'signup') {
        await signUpWithEmail({
          email: authForm.email,
          password: authForm.password,
          displayName: authForm.displayName,
        });
        setMessage('Account created. Check your email to confirm, then sign in.');
      } else {
        await signInWithEmail({
          email: authForm.email,
          password: authForm.password,
        });
        setMessage('Signed in. You can now exchange mixtapes.');
      }
    } catch (error) {
      setMessage(error.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExchange = async (event) => {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const payload = {
        sender_id: userId,
        receiver_id: composeForm.receiver_id,
        cassette_title: composeForm.cassette_title,
        set_style: composeForm.set_style || null,
        sender_hub: composeForm.sender_hub || null,
        receiver_hub: composeForm.receiver_hub || null,
        sender_lat: Number.parseFloat(composeForm.sender_lat),
        sender_lng: Number.parseFloat(composeForm.sender_lng),
        receiver_lat: Number.parseFloat(composeForm.receiver_lat),
        receiver_lng: Number.parseFloat(composeForm.receiver_lng),
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

  return (
    <div className="content-section mixtape-shell">
      <section className="mixtape-auth">
        <h2>Mixtape Exchange Access</h2>
        {session ? (
          <>
            <p>Signed in as {session.user.email}</p>
            <div className="mixtape-actions">
              <button type="button" className="button-link secondary-link" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Sign in or create an account to exchange tapes with other musicians and DJs.</p>
            <div className="mixtape-actions">
              <button
                type="button"
                className={`button-link secondary-link ${authMode === 'signin' ? 'is-active' : ''}`}
                onClick={() => setAuthMode('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`button-link secondary-link ${authMode === 'signup' ? 'is-active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="mixtape-form-grid">
              <div className="mixtape-field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </div>
              <div className="mixtape-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              {authMode === 'signup' ? (
                <div className="mixtape-field">
                  <label htmlFor="auth-display-name">Display Name</label>
                  <input
                    id="auth-display-name"
                    type="text"
                    value={authForm.displayName}
                    onChange={(event) =>
                      setAuthForm((prev) => ({ ...prev, displayName: event.target.value }))
                    }
                    required
                  />
                </div>
              ) : null}
              <div className="mixtape-actions">
                <button type="submit" className="button-link primary-link" disabled={loading}>
                  {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              </div>
            </form>
          </>
        )}
        {message ? <p className="mixtape-message">{message}</p> : null}
      </section>

      {session ? (
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
                <label htmlFor="sender-hub">Sender Hub Name</label>
                <input
                  id="sender-hub"
                  value={composeForm.sender_hub}
                  onChange={(event) => setComposeForm((prev) => ({ ...prev, sender_hub: event.target.value }))}
                  placeholder="Moonwax Pressing"
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-hub">Receiver Hub Name</label>
                <input
                  id="receiver-hub"
                  value={composeForm.receiver_hub}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_hub: event.target.value }))
                  }
                  placeholder="Berlin Loft Deck"
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-lat">Sender Latitude</label>
                <input
                  id="sender-lat"
                  type="number"
                  step="any"
                  value={composeForm.sender_lat}
                  onChange={(event) => setComposeForm((prev) => ({ ...prev, sender_lat: event.target.value }))}
                  required
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="sender-lng">Sender Longitude</label>
                <input
                  id="sender-lng"
                  type="number"
                  step="any"
                  value={composeForm.sender_lng}
                  onChange={(event) => setComposeForm((prev) => ({ ...prev, sender_lng: event.target.value }))}
                  required
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-lat">Receiver Latitude</label>
                <input
                  id="receiver-lat"
                  type="number"
                  step="any"
                  value={composeForm.receiver_lat}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_lat: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="mixtape-field">
                <label htmlFor="receiver-lng">Receiver Longitude</label>
                <input
                  id="receiver-lng"
                  type="number"
                  step="any"
                  value={composeForm.receiver_lng}
                  onChange={(event) =>
                    setComposeForm((prev) => ({ ...prev, receiver_lng: event.target.value }))
                  }
                  required
                />
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
    </div>
  );
};

export default MixtapeExchange;
