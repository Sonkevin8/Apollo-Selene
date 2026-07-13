import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import MobileScrollGuide from './MobileScrollGuide';
import { supabase } from '../lib/supabaseClient';
import { clearLegacyAdminSession, isLegacyAdminEnabled } from '../lib/adminAccess';
import '../styles/Navbar.css';

const navigationItems = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events' },
  { to: '/past-events', label: 'Past events' },
  { to: '/experiences', label: 'Reflections' },
  { to: '/account', label: 'Account' },
  { to: '/mixtape-exchange', label: 'Mixtape Exchange' },
  { to: '/merchandise', label: 'Coming Soon', disabled: true },
  { to: '/artwork', label: 'Gallery' },
  { to: '/ember-room', label: 'Ember Room' },
];

const getInitial = (session, isAdmin) => {
  if (isAdmin) return 'Ad';
  if (session?.user?.email) return session.user.email[0].toUpperCase();
  return null;
};

const Navbar = ({ theme, onToggleTheme, session }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigate = useNavigate();
  const isAdmin = isLegacyAdminEnabled();
  const initial = getInitial(session, isAdmin);

  const handleLogout = async () => {
    if (isAdmin) {
      clearLegacyAdminSession();
      setMenuOpen(false);
      window.location.reload();
      return;
    }
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className={`navbar${menuOpen ? ' navbar-open' : ''}`}>
      {/* Mobile header — title centred, avatar left, hamburger right */}
      <div className="navbar-mobile-header">
        {initial ? (
          <button
            type="button"
            className={`navbar-avatar navbar-avatar-btn${isAdmin ? ' navbar-avatar--admin' : ''}`}
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-label="User menu"
          >
            {initial}
          </button>
        ) : (
          <span className="navbar-mobile-header-spacer" aria-hidden="true" />
        )}
        <span className={`navbar-mobile-greek navbar-greek-title--${theme}`} aria-hidden="true">
          Apollo Selene
        </span>
        <button
          type="button"
          className="hamburger-btn"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      {/* Mode switcher + login — visible at top of open menu */}
      <div className="navbar-menu-topbar">
        <button
          type="button"
          className={`navbar-mode-btn${theme === 'apollo' ? ' navbar-mode-btn--active' : ''}`}
          onClick={() => theme !== 'apollo' && onToggleTheme()}
        >
          ☀ Apollo Mode
        </button>
        <button
          type="button"
          className={`navbar-mode-btn navbar-mode-btn--selene${theme === 'selene' ? ' navbar-mode-btn--active' : ''}`}
          onClick={() => theme !== 'selene' && onToggleTheme()}
        >
          ☽ Selene Mode
        </button>
      </div>

      {/* Avatar dropdown for logged-in users */}
      {userMenuOpen && (
        <>
          <div className="navbar-dropdown-backdrop" onClick={() => setUserMenuOpen(false)} />
          <div className="navbar-user-dropdown">
            <NavLink
              to="/account"
              className="navbar-user-dropdown-item"
              onClick={() => { setUserMenuOpen(false); setMenuOpen(false); }}
            >
              Account
            </NavLink>
            <button
              type="button"
              className="navbar-user-dropdown-item navbar-user-dropdown-logout"
              onClick={() => { setUserMenuOpen(false); handleLogout(); }}
            >
              Logout
            </button>
          </div>
        </>
      )}
      <div className="navbar-brand-block">
        <div className={`navbar-greek-title navbar-greek-title--${theme}`}>
          <div className="navbar-greek-ornament" aria-hidden="true">
            <span className="navbar-greek-rule" />
            <span className="navbar-greek-diamond">✦</span>
            <span className="navbar-greek-rule" />
          </div>
          <h2 className="navbar-greek-text">Apollo Selene</h2>
          <div className="navbar-greek-ornament" aria-hidden="true">
            <span className="navbar-greek-rule" />
            <span className="navbar-greek-diamond">✦</span>
            <span className="navbar-greek-rule" />
          </div>
        </div>
        <p className="navbar-brand">Sun by day. Moon by night.</p>
        <p className="navbar-copy">
          A welcoming place to pause, check the next event, and ease into community.
        </p>
        {initial && (
          <>
            <NavLink to="/account" className="navbar-avatar-row">
              <span className={`navbar-avatar${isAdmin ? ' navbar-avatar--admin' : ''}`}>{initial}</span>
              <span className="navbar-avatar-label">{isAdmin ? 'Admin' : session?.user?.email}</span>
            </NavLink>
            <button type="button" className="navbar-logout-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'apollo' ? 'Switch to Selene Mode' : 'Switch to Apollo Mode'}
        </button>
      </div>
      <ul className="navbar-menu">
        {navigationItems.map(({ to, label, disabled }) => (
          <li key={to}>
            {disabled ? (
              <span className="navbar-link-disabled" aria-disabled="true">
                <span className="navbar-link-inner">
                  <span className="navbar-link-label">{label}</span>
                </span>
              </span>
            ) : (
              <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : '')} onClick={() => setMenuOpen(false)}>
                {({ isActive }) => (
                  <span className="navbar-link-inner">
                    {isActive ? (
                      <span
                        className={`navbar-link-guide navbar-link-guide--${theme}`}
                        aria-hidden="true"
                      >
                        <MobileScrollGuide theme={theme} compact />
                      </span>
                    ) : null}
                    <span className="navbar-link-label">
                      {to === '/account' ? (session ? 'Account' : 'Login / Sign Up') : label}
                    </span>
                  </span>
                )}
              </NavLink>
            )}
          </li>
        ))}
      </ul>

      <div className="navbar-mode-switcher">
        <button
          type="button"
          className={`navbar-mode-btn${theme === 'apollo' ? ' navbar-mode-btn--active' : ''}`}
          onClick={() => theme !== 'apollo' && onToggleTheme()}
        >
          ☀ Apollo Mode
        </button>
        <button
          type="button"
          className={`navbar-mode-btn navbar-mode-btn--selene${theme === 'selene' ? ' navbar-mode-btn--active' : ''}`}
          onClick={() => theme !== 'selene' && onToggleTheme()}
        >
          ☽ Selene Mode
        </button>
      </div>
    </nav>
  );
};

export default Navbar;