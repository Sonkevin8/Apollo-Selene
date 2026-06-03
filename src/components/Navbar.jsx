import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import MobileScrollGuide from './MobileScrollGuide';
import { supabase } from '../lib/supabaseClient';
import '../styles/Navbar.css';

const navigationItems = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events' },
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
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = window.localStorage.getItem('apollo-admin') === 'true';
  const initial = getInitial(session, isAdmin);

  const handleLogout = async () => {
    if (isAdmin) {
      window.localStorage.removeItem('apollo-admin');
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
      {/* Mobile-only top bar */}
      <div className="navbar-mobile-header">
        <div className="navbar-mobile-mode-switcher">
          <button
            type="button"
            className={`navbar-mode-btn${theme === 'apollo' ? ' navbar-mode-btn--active' : ''}`}
            onClick={() => theme !== 'apollo' && onToggleTheme()}
          >
            ☀ Apollo Mode
          </button>
          <button
            type="button"
            className={`navbar-mode-btn${theme === 'selene' ? ' navbar-mode-btn--active' : ''}`}
            onClick={() => theme !== 'selene' && onToggleTheme()}
          >
            ☽ Selene Mode
          </button>
        </div>
        <div className="navbar-mobile-actions">
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
            <button
              type="button"
              className="navbar-login-btn"
              onClick={() => setLoginMenuOpen((v) => !v)}
              aria-label="Login or sign up"
            >
              Login
            </button>
          )}
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
      </div>

      {/* Dropdowns outside backdrop-filter header so position:fixed overlays everything */}
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
      {loginMenuOpen && (
        <>
          <div className="navbar-dropdown-backdrop" onClick={() => setLoginMenuOpen(false)} />
          <div className="navbar-user-dropdown">
            <NavLink
              to="/account"
              className="navbar-user-dropdown-item"
              onClick={() => { setLoginMenuOpen(false); setMenuOpen(false); }}
            >
              Sign In
            </NavLink>
            <NavLink
              to="/account"
              className="navbar-user-dropdown-item"
              onClick={() => { setLoginMenuOpen(false); setMenuOpen(false); }}
            >
              Sign Up
            </NavLink>
          </div>
        </>
      )}
      <div className="navbar-brand-block">
        <p className="navbar-kicker">
          Apollo Selene <span className="name-secret">secrets</span>
        </p>
        <h2 className="navbar-brand">Sun by day. Moon by night.</h2>
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
          className={`navbar-mode-btn${theme === 'selene' ? ' navbar-mode-btn--active' : ''}`}
          onClick={() => theme !== 'selene' && onToggleTheme()}
        >
          ☽ Selene Mode
        </button>
      </div>
    </nav>
  );
};

export default Navbar;