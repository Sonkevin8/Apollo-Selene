import React from 'react';
import { Link } from 'react-router-dom';

export default function Home({ theme = 'apollo' }) {
  return (
    <div className="content-section home-page">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="section-kicker">Apollo by light. Selene by night.</p>
          <h1>
            Welcome to Apollo Selene <span className="name-secret">secrets</span>
          </h1>
          <p className="hero-lead">
            A quiet place to arrive, find the next gathering, and feel welcome enough to come back again.
          </p>
          <p>
            Apollo Selene is a warm landing spot for community life. It keeps event details in focus, while still aiming to feel calm, clear, and inviting from the very first visit.
          </p>
          <div className="hero-actions">
            <Link to="/events" className="button-link primary-link">See Upcoming Events</Link>
            <Link to="/ember-room" className="button-link secondary-link">Visit the Ember Room</Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="orbital-badge orbital-badge--solo">
            {theme === 'apollo' ? (
              <div className="orbital-sun">
                <span className="orbital-sun-shimmer" />
              </div>
            ) : (
              <div className="orbital-moon">
                <span className="orbital-moon-craters" />
              </div>
            )}
          </div>
          <div className="mission-panel">
            <p className="mission-label">Mission Statement</p>
            <p className="mission-text">
              Apollo Selene brings people together by sharing gatherings clearly and welcoming everyone with thoughtful care. It aims to create a space where people can relax, reconnect, and feel at ease before they even arrive.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-2">
        <div className="feature-card card">
          <h3>Apollo Mode</h3>
          <p>
            Light mode carries the daytime side of the identity: warm, bright, and oriented around momentum, visibility, and clear event details.
          </p>
        </div>

        <div className="feature-card card">
          <h3>Selene Mode</h3>
          <p>
            Dark mode shifts into the evening mood: reflective, soft, and grounded, with the same information delivered in a more restful atmosphere.
          </p>
        </div>
      </section>

      <section className="card">
        <h2>What People Should Feel Here</h2>
        <div className="grid grid-3">
          <div className="principle-card">
            <h4>Unrushed</h4>
            <p>Announcements are easy to read, and the tone never asks visitors to perform or keep up.</p>
          </div>
          <div className="principle-card">
            <h4>Included</h4>
            <p>Every page should make it clear that newcomers, regulars, and quiet observers all belong here.</p>
          </div>
          <div className="principle-card">
            <h4>Ready</h4>
            <p>By the time someone leaves the page for an event, they should know what to expect and feel at ease about going.</p>
          </div>
        </div>
      </section>

    </div>
  );
}