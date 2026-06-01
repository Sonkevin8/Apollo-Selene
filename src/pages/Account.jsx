import React, { useEffect, useState } from 'react';
import LocationCapture from '../components/LocationCapture';
import { isSupabaseConfigured, SUPABASE_AUTH_STORAGE_KEY } from '../lib/supabaseClient';
import {
  fetchMyProfile,
  getCurrentSession,
  onAuthStateChange,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
  updateMyProfile,
} from '../lib/mixtapeExchange';
import './Account.css';

const defaultAuthForm = {
  email: '',
  password: '',
  displayName: '',
};

const defaultProfileForm = {
  display_name: '',
  username: '',
  city: '',
  bio: '',
  plan_tier: 'free',
  subscription_status: '',
  address: '',
  address_lat: '',
  address_lng: '',
};

const readAuthDebugSnapshot = ({ session, eventLabel }) => {
  const snapshot = {
    eventLabel,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
    hasWindow: typeof window !== 'undefined',
    storageAvailable: false,
    hasStoredSession: false,
    storedBytes: 0,
    sessionUserId: session?.user?.id || null,
    sessionEmail: session?.user?.email || null,
  };

  if (!snapshot.hasWindow) {
    return snapshot;
  }

  try {
    const rawStored = window.localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    snapshot.storageAvailable = true;
    snapshot.hasStoredSession = typeof rawStored === 'string' && rawStored.length > 0;
    snapshot.storedBytes = rawStored?.length || 0;
  } catch {
    snapshot.storageAvailable = false;
  }

  return snapshot;
};

const Account = () => {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authDebug, setAuthDebug] = useState(() =>
    readAuthDebugSnapshot({ session: null, eventLabel: 'init' })
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let isMounted = true;

    const syncProfile = async (userId) => {
      const profile = await fetchMyProfile({ userId });
      if (!isMounted) {
        return;
      }

      setProfileForm({
        display_name: profile?.display_name || '',
        username: profile?.username || '',
        city: profile?.city || '',
        bio: profile?.bio || '',
        plan_tier: profile?.plan_tier || 'free',
        subscription_status: profile?.subscription_status || '',
        address: profile?.address || '',
        address_lat: profile?.address_lat || '',
        address_lng: profile?.address_lng || '',
      });
    };

    const init = async () => {
      try {
        const existingSession = await getCurrentSession();
        if (!isMounted) {
          return;
        }

        setSession(existingSession);
        setAuthDebug(readAuthDebugSnapshot({ session: existingSession, eventLabel: 'init:getSession' }));
        if (existingSession?.user?.id) {
          await syncProfile(existingSession.user.id);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error.message || 'Unable to initialize account session.');
        }
      }
    };

    init();

    const { data: authSubscription } = onAuthStateChange(async (_, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setAuthDebug(readAuthDebugSnapshot({ session: nextSession, eventLabel: 'auth_state_change' }));
      if (nextSession?.user?.id) {
        try {
          await syncProfile(nextSession.user.id);
        } catch (error) {
          setMessage(error.message || 'Unable to load account profile.');
        }
      } else {
        setProfileForm(defaultProfileForm);
      }
    });

    return () => {
      isMounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (authMode === 'signup') {
        await signUpWithEmail({
          email: authForm.email,
          password: authForm.password,
          displayName: authForm.displayName,
        });
        setMessage('Account created. Confirm your email, then sign in.');
      } else {
        await signInWithEmail({
          email: authForm.email,
          password: authForm.password,
        });
        setMessage('Signed in.');
      }
    } catch (error) {
      setMessage(error.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!session?.user?.id) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await updateMyProfile({
        userId: session.user.id,
        profile: profileForm,
      });
      setMessage('Profile updated. Your account is ready for mixtape exchange.');
    } catch (error) {
      setMessage(error.message || 'Could not update profile.');
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

  if (!isSupabaseConfigured) {
    return (
      <div className="content-section account-shell">
        <section className="account-card">
          <h2>Account Setup Needs Supabase</h2>
          <p>Add your Supabase URL and anon key in local environment variables first.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="content-section account-shell">
      <section className="account-card account-auth-debug" aria-label="Session persistence debug">
        <h3>Auth Session Debug</h3>
        <p>Use this to verify login persistence after refresh. No token contents are shown.</p>
        <div className="account-auth-debug-grid">
          <span>Last Auth Event</span>
          <strong>{authDebug.eventLabel}</strong>
          <span>Storage Key</span>
          <strong>{authDebug.storageKey}</strong>
          <span>Storage Available</span>
          <strong>{authDebug.storageAvailable ? 'yes' : 'no'}</strong>
          <span>Stored Session Found</span>
          <strong>{authDebug.hasStoredSession ? 'yes' : 'no'}</strong>
          <span>Stored Payload Size</span>
          <strong>{authDebug.storedBytes} bytes</strong>
          <span>Current Session User</span>
          <strong>{authDebug.sessionEmail || authDebug.sessionUserId || 'none'}</strong>
        </div>
      </section>

      {!session ? (
        <section className="account-card">
          <h2>Account Access</h2>
          <div className="account-actions">
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

          <form onSubmit={handleAuthSubmit} className="account-form-grid">
            <div className="account-field">
              <label htmlFor="account-email">Email</label>
              <input
                id="account-email"
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div className="account-field">
              <label htmlFor="account-password">Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="account-password"
                  type={showPassword ? 'text' : 'password'}
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  required
                  minLength={8}
                  style={{ flex: 1, paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '0.25rem',
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {authMode === 'signup' ? (
              <div className="account-field">
                <label htmlFor="account-display-name">Display Name</label>
                <input
                  id="account-display-name"
                  type="text"
                  value={authForm.displayName}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      displayName: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            ) : null}
            <div className="account-actions" style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="button-link primary-link" disabled={loading}>
                {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          </form>

          {message ? <p className="account-message">{message}</p> : null}
        </section>
      ) : (
        <section className="account-card">
          <h2>My Account</h2>
          <p>Signed in as {session.user.email}</p>
          <div className="account-plan-row">
            <span className="account-plan-badge">{(profileForm.plan_tier || 'free').toUpperCase()} Plan</span>
            <span className="account-plan-note">You are not being charged right now.</span>
          </div>
          {profileForm.subscription_status ? (
            <p className="account-subscription-status">
              Subscription Status: {profileForm.subscription_status}
            </p>
          ) : null}
          <form onSubmit={handleProfileSave} className="account-form-grid">
                        <div className="account-field" style={{ gridColumn: '1 / -1' }}>
                          <label>Set Your Location (Required)</label>
                          <LocationCapture
                            onLocationCaptured={({ lat, lng, address }) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                address: address || prev.address,
                                address_lat: lat,
                                address_lng: lng,
                              }))
                            }
                          />
                          {profileForm.address_lat && profileForm.address_lng ? (
                            <p className="account-helper-text">
                              Location set: {profileForm.address_lat}, {profileForm.address_lng}
                            </p>
                          ) : (
                            <p className="account-helper-text">Location not set yet.</p>
                          )}
                        </div>
            <div className="account-field">
              <label htmlFor="profile-display-name">Display Name</label>
              <input
                id="profile-display-name"
                type="text"
                value={profileForm.display_name}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, display_name: event.target.value }))
                }
              />
            </div>

            <div className="account-field">
              <label htmlFor="profile-username">Username</label>
              <input
                id="profile-username"
                type="text"
                value={profileForm.username}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, username: event.target.value }))
                }
                placeholder="dj-solar"
              />
            </div>

            <div className="account-field">
              <label htmlFor="profile-city">City</label>
              <input
                id="profile-city"
                type="text"
                value={profileForm.city}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </div>

            <div className="account-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="profile-bio">Bio</label>
              <textarea
                id="profile-bio"
                value={profileForm.bio}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                placeholder="Your style, influences, or what you are trading..."
              />
            </div>

            <div className="account-actions" style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="button-link primary-link" disabled={loading}>
                Save Account
              </button>
              <button
                type="button"
                className="button-link account-upgrade-disabled"
                disabled
                aria-disabled="true"
                title="Billing is not enabled yet"
              >
                Upgrade (Coming Soon)
              </button>
              <button type="button" className="button-link secondary-link" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
            <p className="account-upgrade-note">Billing is currently disabled. Everyone remains on Free plan.</p>
          </form>

          {message ? <p className="account-message">{message}</p> : null}
        </section>
      )}
    </div>
  );
};

export default Account;
