import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import MobileScrollGuide from './MobileScrollGuide';
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

const Navbar = ({ theme, onToggleTheme, session }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={`navbar${menuOpen ? ' navbar-open' : ''}`}>
      {/* Mobile-only top bar */}
      <div className="navbar-mobile-header">
        <span className="navbar-mobile-brand">Apollo Selene</span>
        <div className="navbar-mobile-actions">
          <NavLink to="/account" className="navbar-mobile-login" onClick={() => setMenuOpen(false)}>
            {session ? 'Account' : 'Login / Sign Up'}
          </NavLink>
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
      <div className="navbar-brand-block">
        <p className="navbar-kicker">
          Apollo Selene <span className="name-secret">secrets</span>
        </p>
        <h2 className="navbar-brand">Sun by day. Moon by night.</h2>
        <p className="navbar-copy">
          A welcoming place to pause, check the next event, and ease into community.
        </p>
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
    </nav>
  );
};

export default Navbar;