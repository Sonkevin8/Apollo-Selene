import React from 'react';
import { NavLink } from 'react-router-dom';
import MobileScrollGuide from './MobileScrollGuide';
import '../styles/Navbar.css';

const navigationItems = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events' },
  { to: '/experiences', label: 'Reflections' },
  { to: '/account', label: 'Account' },
  { to: '/mixtape-exchange', label: 'Mixtape Exchange' },
  { to: '/artwork', label: 'Gallery' },
  { to: '/earth', label: 'Earth' },
  { to: '/ember-room', label: 'Ember Room' },
];

const Navbar = ({ theme, onToggleTheme }) => {
  return (
    <nav className="navbar">
      <div className="navbar-brand-block">
        <p className="navbar-kicker">
          Apollo Selene <span className="name-secret">secrets</span>
        </p>
        <h2 className="navbar-brand">Sun by day. Moon by night.</h2>
        <p className="navbar-copy">Explore events, art, and cassette deliveries from one place.</p>
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
              <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
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
                    <span className="navbar-link-label">{label}</span>
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