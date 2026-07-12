import React, { useEffect, useState } from 'react';
import LocationCapture from '../components/LocationCapture';
import { supabase, isSupabaseConfigured, SUPABASE_AUTH_STORAGE_KEY } from '../lib/supabaseClient';
import AdminHeroContent from './AdminHeroContent';
import { saveSiteContent } from '../lib/siteContent';
import {
  fetchMyProfile,
  getCurrentSession,
  onAuthStateChange,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
  updateMyProfile,
} from '../lib/mixtapeExchange';
import {
  clearLegacyAdminSession,
  isAdminUiEnabled,
  setLegacyAdminSession,
} from '../lib/adminAccess';
import './Account.css';

const defaultAuthForm = {
  email: '',
  password: '',
  username: '',
};

const defaultAdminForm = {
  username: '',
  password: '',
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

const ORB_MIN = 1;
const ORB_MAX = 6;
const DEFAULT_ORB_COLORS = ['#c200ff', '#8f00ff'];
const BLUR_ORB_MIN = 1;
const BLUR_ORB_MAX = 6;
const DEFAULT_BLUR_ORB_COLORS = ['#c200ff', '#b400ff', '#db3fff', '#8f00ff'];
const CLOUD_MIN = 1;
const CLOUD_MAX = 6;
const DEFAULT_CLOUD_COLORS = ['#ffffff', '#fff7ea', '#ffeccf'];

const clampOrbCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(ORB_MIN, Math.min(ORB_MAX, parsed));
};

const clampBlurOrbCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 4;
  return Math.max(BLUR_ORB_MIN, Math.min(BLUR_ORB_MAX, parsed));
};

const clampCloudCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(CLOUD_MIN, Math.min(CLOUD_MAX, parsed));
};

const getOrbColorFromContent = (content, index) => {
  const key = `selene_orb_${index + 1}_color`;
  const fallback = DEFAULT_ORB_COLORS[index % DEFAULT_ORB_COLORS.length];
  const value = content?.[key] || fallback;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
};

const getBlurOrbColorFromContent = (content, index) => {
  const key = `selene_blur_orb_${index + 1}_color`;
  const fallback = DEFAULT_BLUR_ORB_COLORS[index % DEFAULT_BLUR_ORB_COLORS.length];
  const value = content?.[key] || fallback;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
};

const getCloudColorFromContent = (content, index) => {
  const key = `apollo_cloud_${index + 1}_color`;
  const fallback = DEFAULT_CLOUD_COLORS[index % DEFAULT_CLOUD_COLORS.length];
  const value = content?.[key] || fallback;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
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

const Account = ({ siteContent, onSiteContentUpdated, isAdmin: initialAdmin = false, onAdminStateChanged }) => {
  const [session, setSession] = useState(null);
  const [clerkUser, setClerkUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(() => initialAdmin || isAdminUiEnabled());
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [authDebug, setAuthDebug] = useState(() =>
    readAuthDebugSnapshot({ session: null, eventLabel: 'init' })
  );

  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = Boolean(clerkPublishableKey);
  const clerkSignedIn = clerkEnabled && Boolean(clerkUser);
  const effectiveSession = session || (clerkSignedIn ? {
    user: {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || null,
    },
  } : null);

  // ── Voucher admin state ───────────────────────────────────
  const [vouchers, setVouchers] = useState([]);
  const [voucherNote, setVoucherNote] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [orbSettings, setOrbSettings] = useState({
    count: 2,
    colors: Array.from({ length: ORB_MAX }, (_, index) => DEFAULT_ORB_COLORS[index % DEFAULT_ORB_COLORS.length]),
    blurCount: 4,
    blurColors: Array.from({ length: BLUR_ORB_MAX }, (_, index) => DEFAULT_BLUR_ORB_COLORS[index % DEFAULT_BLUR_ORB_COLORS.length]),
    cloudCount: 3,
    cloudColors: Array.from({ length: CLOUD_MAX }, (_, index) => DEFAULT_CLOUD_COLORS[index % DEFAULT_CLOUD_COLORS.length]),
  });
  const [orbSaving, setOrbSaving] = useState(false);
  const [orbMessage, setOrbMessage] = useState('');

  useEffect(() => {
    const count = clampOrbCount(siteContent?.selene_orb_count);
    const colors = Array.from({ length: ORB_MAX }, (_, index) => getOrbColorFromContent(siteContent, index));
    const blurCount = clampBlurOrbCount(siteContent?.selene_blur_orb_count);
    const blurColors = Array.from({ length: BLUR_ORB_MAX }, (_, index) => getBlurOrbColorFromContent(siteContent, index));
    const cloudCount = clampCloudCount(siteContent?.apollo_cloud_count);
    const cloudColors = Array.from({ length: CLOUD_MAX }, (_, index) => getCloudColorFromContent(siteContent, index));
    setOrbSettings({ count, colors, blurCount, blurColors, cloudCount, cloudColors });
  }, [siteContent]);

  useEffect(() => {
    if (!clerkEnabled) {
      setClerkUser(null);
      return;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncClerk = () => {
      setClerkUser(window.Clerk?.user || null);
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        syncClerk();
      }
    };

    let removeClerkListener = null;
    if (typeof window.Clerk?.addListener === 'function') {
      try {
        const unsubscribe = window.Clerk.addListener(() => {
          syncClerk();
        });
        if (typeof unsubscribe === 'function') {
          removeClerkListener = unsubscribe;
        }
      } catch {
        // No-op: listener API availability can vary by Clerk runtime.
      }
    }

    syncClerk();
    window.addEventListener('focus', syncClerk);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', syncClerk);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof removeClerkListener === 'function') {
        removeClerkListener();
      }
    };
  }, [clerkEnabled]);

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
          displayName: authForm.username,
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

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin', {
        body: { username: adminForm.username, password: adminForm.password },
      });
      if (error || !data?.success) {
        setMessage('Invalid admin credentials.');
      } else {
        setLegacyAdminSession({ password: adminForm.password });
        setIsAdmin(true);
        if (typeof onAdminStateChanged === 'function') {
          onAdminStateChanged(true);
        }
        setMessage('Admin access granted.');
        setAdminForm(defaultAdminForm);
      }
    } catch {
      setMessage('Could not reach admin verification service.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    clearLegacyAdminSession();
    if (typeof onAdminStateChanged === 'function') {
      onAdminStateChanged(false);
    }
    setMessage('');
  };

  // ── Voucher helpers ───────────────────────────────────────
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const loadVouchers = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setVoucherLoading(true);
    const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
    setVouchers(data || []);
    setVoucherLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) loadVouchers(); }, [isAdmin, loadVouchers]);

  const handleGenerateVoucher = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;
    const code = generateCode();
    const { error } = await supabase.from('vouchers').insert({ code, note: voucherNote.trim() || null });
    if (error) {
      setVoucherMsg('Error generating voucher.');
    } else {
      setVoucherNote('');
      setVoucherMsg('');
      await loadVouchers();
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!supabase) return;
    await supabase.from('vouchers').delete().eq('id', id);
    setVouchers((prev) => prev.filter((v) => v.id !== id));
  };

  const copyCode = (voucher) => {
    navigator.clipboard.writeText(voucher.code).catch(() => {});
    setCopiedId(voucher.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOrbCountChange = (event) => {
    const count = clampOrbCount(event.target.value);
    setOrbSettings((prev) => ({ ...prev, count }));
  };

  const handleOrbColorChange = (index, value) => {
    setOrbSettings((prev) => ({
      ...prev,
      colors: prev.colors.map((color, i) => (i === index ? value : color)),
    }));
  };

  const handleBlurOrbCountChange = (event) => {
    const blurCount = clampBlurOrbCount(event.target.value);
    setOrbSettings((prev) => ({ ...prev, blurCount }));
  };

  const handleBlurOrbColorChange = (index, value) => {
    setOrbSettings((prev) => ({
      ...prev,
      blurColors: prev.blurColors.map((color, i) => (i === index ? value : color)),
    }));
  };

  const handleCloudCountChange = (event) => {
    const cloudCount = clampCloudCount(event.target.value);
    setOrbSettings((prev) => ({ ...prev, cloudCount }));
  };

  const handleCloudColorChange = (index, value) => {
    setOrbSettings((prev) => ({
      ...prev,
      cloudColors: prev.cloudColors.map((color, i) => (i === index ? value : color)),
    }));
  };

  const handleSaveOrbSettings = async (event) => {
    event.preventDefault();
    setOrbSaving(true);
    setOrbMessage('');

    const count = clampOrbCount(orbSettings.count);
    const payload = {
      ...(siteContent || {}),
      selene_orb_count: count,
      selene_blur_orb_count: clampBlurOrbCount(orbSettings.blurCount),
      apollo_cloud_count: clampCloudCount(orbSettings.cloudCount),
    };

    for (let i = 0; i < ORB_MAX; i += 1) {
      payload[`selene_orb_${i + 1}_color`] = orbSettings.colors[i] || DEFAULT_ORB_COLORS[i % DEFAULT_ORB_COLORS.length];
    }

    for (let i = 0; i < BLUR_ORB_MAX; i += 1) {
      payload[`selene_blur_orb_${i + 1}_color`] = orbSettings.blurColors[i] || DEFAULT_BLUR_ORB_COLORS[i % DEFAULT_BLUR_ORB_COLORS.length];
    }

    for (let i = 0; i < CLOUD_MAX; i += 1) {
      payload[`apollo_cloud_${i + 1}_color`] = orbSettings.cloudColors[i] || DEFAULT_CLOUD_COLORS[i % DEFAULT_CLOUD_COLORS.length];
    }

    const { error } = await saveSiteContent(payload);
    if (error) {
      setOrbMessage('Could not save Selene orb settings.');
    } else {
      setOrbMessage('Selene orb settings saved.');
      if (typeof onSiteContentUpdated === 'function') {
        onSiteContentUpdated(payload);
      }
    }

    setOrbSaving(false);
  };

  const validateUsername = (value) => {
    if (!value) return '';
    if (value.length < 3 || value.length > 24) return 'Username must be 3–24 characters.';
    if (!/^[a-z0-9_]+$/.test(value)) return 'Only lowercase letters, numbers, and underscores allowed.';
    if (value.startsWith('_') || value.endsWith('_')) return 'Username cannot start or end with an underscore.';
    if (value.includes('__')) return 'Username cannot contain consecutive underscores.';
    return '';
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!effectiveSession?.user?.id) {
      return;
    }

    const uErr = validateUsername(profileForm.username);
    if (uErr) {
      setUsernameError(uErr);
      return;
    }
    setUsernameError('');
    setLoading(true);
    setMessage('');

    try {
      await updateMyProfile({
        userId: effectiveSession.user.id,
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
      if (typeof window !== 'undefined' && typeof window.Clerk?.signOut === 'function') {
        await window.Clerk.signOut();
      }
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
      {!effectiveSession ? (
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
            <button
              type="button"
              className={`button-link secondary-link ${authMode === 'admin' ? 'is-active' : ''}`}
              onClick={() => setAuthMode('admin')}
            >
              Admin
            </button>
          </div>

          {authMode === 'admin' ? (
            isAdmin ? (
              <div className="account-form-grid">
                <p style={{ gridColumn: '1 / -1' }}>Admin access is active.</p>
                <div className="account-actions" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="button-link secondary-link" onClick={handleAdminLogout}>
                    Revoke Admin Access
                  </button>
                </div>

                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.6rem' }}>Selene Orb Settings</h3>
                  <p style={{ opacity: 0.7, fontSize: '0.84rem', marginBottom: '0.9rem' }}>
                    Control how many animated Selene orbs appear and set each orb color.
                  </p>

                  <form onSubmit={handleSaveOrbSettings} className="account-form-grid">
                    <div className="account-field">
                      <label htmlFor="selene-orb-count">Number of Orbs</label>
                      <input
                        id="selene-orb-count"
                        type="number"
                        min={ORB_MIN}
                        max={ORB_MAX}
                        value={orbSettings.count}
                        onChange={handleOrbCountChange}
                      />
                    </div>

                    <div className="account-field" style={{ gridColumn: '1 / -1' }}>
                      <label style={{ marginBottom: '0.5rem', display: 'block' }}>Orb Colors</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {Array.from({ length: orbSettings.count }, (_, index) => (
                          <label key={`orb-color-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ minWidth: '66px', fontSize: '0.82rem', opacity: 0.85 }}>Orb {index + 1}</span>
                            <input
                              type="color"
                              value={orbSettings.colors[index]}
                              onChange={(event) => handleOrbColorChange(index, event.target.value)}
                              style={{ width: '46px', height: '34px', padding: 0, border: '1px solid var(--border-color-strong)', borderRadius: '8px', margin: 0, cursor: 'pointer' }}
                            />
                            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', opacity: 0.8 }}>{orbSettings.colors[index]}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="account-field">
                      <label htmlFor="selene-blur-orb-count">Moving Blurred Orbs</label>
                      <input
                        id="selene-blur-orb-count"
                        type="number"
                        min={BLUR_ORB_MIN}
                        max={BLUR_ORB_MAX}
                        value={orbSettings.blurCount}
                        onChange={handleBlurOrbCountChange}
                      />
                    </div>

                    <div className="account-field" style={{ gridColumn: '1 / -1' }}>
                      <label style={{ marginBottom: '0.5rem', display: 'block' }}>Moving Blurred Orb Colors</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {Array.from({ length: orbSettings.blurCount }, (_, index) => (
                          <label key={`blur-orb-color-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ minWidth: '66px', fontSize: '0.82rem', opacity: 0.85 }}>Blur {index + 1}</span>
                            <input
                              type="color"
                              value={orbSettings.blurColors[index]}
                              onChange={(event) => handleBlurOrbColorChange(index, event.target.value)}
                              style={{ width: '46px', height: '34px', padding: 0, border: '1px solid var(--border-color-strong)', borderRadius: '8px', margin: 0, cursor: 'pointer' }}
                            />
                            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', opacity: 0.8 }}>{orbSettings.blurColors[index]}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="account-field">
                      <label htmlFor="apollo-cloud-count">Apollo Clouds</label>
                      <input
                        id="apollo-cloud-count"
                        type="number"
                        min={CLOUD_MIN}
                        max={CLOUD_MAX}
                        value={orbSettings.cloudCount}
                        onChange={handleCloudCountChange}
                      />
                    </div>

                    <div className="account-field" style={{ gridColumn: '1 / -1' }}>
                      <label style={{ marginBottom: '0.5rem', display: 'block' }}>Apollo Cloud Colors</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {Array.from({ length: orbSettings.cloudCount }, (_, index) => (
                          <label key={`cloud-color-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ minWidth: '66px', fontSize: '0.82rem', opacity: 0.85 }}>Cloud {index + 1}</span>
                            <input
                              type="color"
                              value={orbSettings.cloudColors[index]}
                              onChange={(event) => handleCloudColorChange(index, event.target.value)}
                              style={{ width: '46px', height: '34px', padding: 0, border: '1px solid var(--border-color-strong)', borderRadius: '8px', margin: 0, cursor: 'pointer' }}
                            />
                            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', opacity: 0.8 }}>{orbSettings.cloudColors[index]}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="account-actions" style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" className="button-link primary-link" disabled={orbSaving}>
                        {orbSaving ? 'Saving…' : 'Save Background Effects'}
                      </button>
                    </div>
                    {orbMessage ? <p className="account-message" style={{ gridColumn: '1 / -1' }}>{orbMessage}</p> : null}
                  </form>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="account-form-grid">
                <div className="account-field">
                  <label htmlFor="admin-username">Username</label>
                  <input
                    id="admin-username"
                    type="text"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm((prev) => ({ ...prev, username: e.target.value }))}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="account-field">
                  <label htmlFor="admin-password">Password</label>
                  <div className="password-row">
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={adminForm.password}
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <button type="button" className="sketch-eye-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? (
                        <svg key="closed" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path className="sketch-path" d="M2,12 C5,7 9,5 12,5 C15,5 19,7 22,12" />
                          <path className="sketch-path" style={{animationDelay:'0.1s'}} d="M5,14 Q9,17.5 12,17.5 Q15,17.5 19,14" />
                          <line className="sketch-path" style={{animationDelay:'0.18s'}} x1="8" y1="15.5" x2="7" y2="19" />
                          <line className="sketch-path" style={{animationDelay:'0.22s'}} x1="12" y1="17.5" x2="12" y2="21" />
                        </svg>
                      ) : (
                        <svg key="open" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path className="sketch-path" d="M2,12 C5,6 9,4 12,4 C15,4 19,6 22,12 C19,18 15,20 12,20 C9,20 5,18 2,12 Z" />
                          <circle className="sketch-path" style={{animationDelay:'0.2s'}} cx="12" cy="12" r="3.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="account-actions" style={{ gridColumn: '1 / -1' }}>
                  <button type="submit" className="button-link primary-link" disabled={loading}>
                    {loading ? 'Verifying…' : 'Login as Admin'}
                  </button>
                </div>
              </form>
            )
          ) : (
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
              <div className="password-row">
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
                />
                <button type="button" className="sketch-eye-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? (
                    <svg key="closed" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path className="sketch-path" d="M2,12 C5,7 9,5 12,5 C15,5 19,7 22,12" />
                      <path className="sketch-path" style={{animationDelay:'0.1s'}} d="M5,14 Q9,17.5 12,17.5 Q15,17.5 19,14" />
                      <line className="sketch-path" style={{animationDelay:'0.18s'}} x1="8" y1="15.5" x2="7" y2="19" />
                      <line className="sketch-path" style={{animationDelay:'0.22s'}} x1="12" y1="17.5" x2="12" y2="21" />
                    </svg>
                  ) : (
                    <svg key="open" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path className="sketch-path" d="M2,12 C5,6 9,4 12,4 C15,4 19,6 22,12 C19,18 15,20 12,20 C9,20 5,18 2,12 Z" />
                      <circle className="sketch-path" style={{animationDelay:'0.2s'}} cx="12" cy="12" r="3.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {authMode === 'signup' ? (
              <div className="account-field">
                <label htmlFor="account-username">Username</label>
                <input
                  id="account-username"
                  type="text"
                  value={authForm.username}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                    }))
                  }
                  required
                  maxLength={24}
                  autoComplete="username"
                />
              </div>
            ) : null}
            <div className="account-actions" style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="button-link primary-link" disabled={loading}>
                {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          </form>
          )}

          {message ? <p className="account-message">{message}</p> : null}
        </section>
      ) : (
        <section className="account-card">
          <p>Signed in as {effectiveSession?.user?.email || 'your account'}</p>
          <form onSubmit={handleProfileSave} className="account-form-grid">
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
                onChange={(event) => {
                  const val = event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setProfileForm((prev) => ({ ...prev, username: val }));
                  setUsernameError(validateUsername(val));
                }}
                placeholder="dj_solar"
                maxLength={24}
              />
              {usernameError && <p className="form-error" style={{ marginTop: '0.25rem' }}>{usernameError}</p>}
            </div>

            <div className="account-field">
              <label htmlFor="profile-city">Address</label>
              <input
                id="profile-city"
                type="text"
                value={profileForm.city}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))}
              />
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

      {isAdmin && <AdminHeroContent isAdmin={isAdmin} onContentSaved={onSiteContentUpdated} />}

      {/* ── Admin: Voucher Manager ──────────────────────────────────── */}
      {isAdmin && (
        <section className="account-card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Vouchers</h2>
          <p style={{ opacity: 0.65, fontSize: '0.85rem', marginBottom: '1rem' }}>
            Generate single-use codes that let anyone claim a free ticket at checkout.
          </p>

          {/* Generate form */}
          <form onSubmit={handleGenerateVoucher} className="account-form-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="account-field">
              <label htmlFor="voucher-note">Note (optional)</label>
              <input
                id="voucher-note"
                type="text"
                placeholder="e.g. For Sarah — opening night"
                value={voucherNote}
                onChange={(e) => setVoucherNote(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="account-actions" style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="button-link primary-link">
                Generate Voucher
              </button>
            </div>
          </form>
          {voucherMsg && <p className="account-message">{voucherMsg}</p>}

          {/* Voucher list */}
          {voucherLoading ? (
            <p style={{ opacity: 0.5 }}>Loading…</p>
          ) : vouchers.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>No vouchers yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ opacity: 0.5, textAlign: 'left' }}>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Code</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Note</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Used by</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--border-color)', opacity: v.used ? 0.5 : 1 }}>
                    <td style={{ padding: '0.45rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em' }}>
                      {v.code}
                      {!v.used && (
                        <button
                          type="button"
                          onClick={() => copyCode(v)}
                          style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent-strong)', padding: 0 }}
                        >
                          {copiedId === v.id ? '✓ Copied' : 'Copy'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', opacity: 0.7 }}>{v.note || '—'}</td>
                    <td style={{ padding: '0.45rem 0.5rem' }}>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', background: v.used ? 'rgba(150,150,150,0.15)' : 'rgba(80,200,100,0.15)', color: v.used ? '#aaa' : '#5cb85c' }}>
                        {v.used ? 'Used' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', opacity: 0.65 }}>
                      {v.used_by || '—'}
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteVoucher(v.id)}
                        style={{ background: 'none', border: '1px solid rgba(255,80,80,0.35)', borderRadius: '20px', color: '#ff6060', cursor: 'pointer', fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
};

export default Account;
