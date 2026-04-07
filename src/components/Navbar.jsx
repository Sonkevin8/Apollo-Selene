import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = ({ theme, onToggleTheme }) => {
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
        <li><NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink></li>
        <li><NavLink to="/events" className={({ isActive }) => isActive ? "active" : ""}>Events</NavLink></li>
        <li><NavLink to="/experiences" className={({ isActive }) => isActive ? "active" : ""}>Reflections</NavLink></li>
        <li><NavLink to="/merchandise" className={({ isActive }) => isActive ? "active" : ""}>Shop</NavLink></li>
        <li><NavLink to="/artwork" className={({ isActive }) => isActive ? "active" : ""}>Gallery</NavLink></li>
        <li><NavLink to="/ember-room" className={({ isActive }) => isActive ? "active" : ""}>Ember Room</NavLink></li>
      </ul>
    </nav>
  );
};

export default Navbar;