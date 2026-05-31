import React from 'react';
import { NavLink } from 'react-router-dom';
import MobileScrollGuide from './MobileScrollGuide';
import '../styles/Navbar.css';

const navigationItems = [
  { to: '/map-exchange', label: 'Map Exchange' },
];

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand-block">
        <p className="navbar-kicker">
          Apollo Selene <span className="name-secret">secrets</span>
        </p>
        <h2 className="navbar-brand">Sun by day. Moon by night.</h2>
        <p className="navbar-copy">
          A welcoming place to pause, check the next event, and ease into community.
        </p>
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
                <span className="navbar-link-inner">
                  <span className="navbar-link-label">{label}</span>
                </span>
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;