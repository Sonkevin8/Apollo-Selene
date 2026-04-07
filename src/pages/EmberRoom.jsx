import React from 'react';
import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';

const EmberRoom = () => {
  return (
    <div className="content-section ember-room-page">
      <AnimatedBackground className="ember-room-canvas" />
      <div className="ember-room-overlay card">
        <p className="section-kicker">Fire / Amber Animation</p>
        <h1>Ember Room</h1>
        <p className="hero-lead">
          The original amber motion now lives here as its own environment: a separate room for warmth, atmosphere, and a slower visual rhythm.
        </p>
        <p>
          Keeping it off the landing page lets Apollo Selene stay focused and welcoming, while still preserving the animated fire energy as a distinct part of the project.
        </p>
        <div className="hero-actions">
          <Link to="/events" className="button-link primary-link">Back to Events</Link>
          <Link to="/" className="button-link secondary-link">Return Home</Link>
        </div>
      </div>
    </div>
  );
};

export default EmberRoom;