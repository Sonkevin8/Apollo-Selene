import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import MobileScrollGuide from './MobileScrollGuide';
import '../styles/Navbar.css';

const navigationItems = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events' },
  { to: '/experiences', label: 'Reflections' },
  { to: '/merchandise', label: 'Shop' },
  { to: '/artwork', label: 'Gallery' },
  { to: '/ember-room', label: 'Ember Room' },
];

const Navbar = ({ theme, onToggleTheme }) => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand-block">
        <p className="navbar-kicker">Apollo Selene</p>
        <h2 className="navbar-brand">Sun by day. Moon by night.</h2>
        <p className="navbar-copy">
          A welcoming place to pause, check the next event, and ease into community.
        </p>
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'apollo' ? 'Switch to Selene Mode' : 'Switch to Apollo Mode'}
        </button>
      </div>
      <ul className="navbar-menu">
        {navigationItems.map(({ to, label }) => (
          <li key={to}>
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
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;