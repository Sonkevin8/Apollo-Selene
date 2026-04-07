import React, { useEffect, useState } from 'react';
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
  const [showScrollGuide, setShowScrollGuide] = useState(true);
  const activeItem = navigationItems.find(({ to }) => to === location.pathname) || navigationItems[0];

  useEffect(() => {
    setShowScrollGuide(true);
  }, [location.pathname, theme]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollGuide(window.scrollY < 36);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div
        className={`mobile-scroll-guide mobile-scroll-guide--${theme} ${showScrollGuide ? 'is-visible' : 'is-hidden'}`}
        aria-live="polite"
      >
        <div className="mobile-scroll-guide-figure">
          <MobileScrollGuide theme={theme} />
        </div>
        <p className="mobile-scroll-guide-copy">
          {theme === 'apollo' ? 'Apollo' : 'Selene'} points to {activeItem.label} below.
        </p>
      </div>
    </nav>
  );
};

export default Navbar;