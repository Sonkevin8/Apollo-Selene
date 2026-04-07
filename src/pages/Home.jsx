import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="content-section home-page">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="section-kicker">Apollo by light. Selene by night.</p>
          <h1>Welcome to Apollo Selene</h1>
          <p className="hero-lead">
            A place to arrive gently, stay informed, and feel comfortable returning whenever a new event is announced.
          </p>
          <p>
            Apollo Selene is designed as a warm landing place for community life. The site centers event announcements, but the feeling matters just as much as the information: clear, calm, and inviting from the first moment.
          </p>
          <div className="hero-actions">
            <Link to="/events" className="button-link primary-link">See Upcoming Events</Link>
            <Link to="/ember-room" className="button-link secondary-link">Visit the Ember Room</Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="orbital-badge">
            <span className="orbital-sun"></span>
            <span className="orbital-moon"></span>
          </div>
          <div className="mission-panel">
            <p className="mission-label">Mission Statement</p>
            <p className="mission-text">
              Apollo Selene exists to announce gatherings with clarity and host them with care, creating a community space where people can relax, reconnect, and feel welcome before they ever walk through the door.
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

      <section className="home-timeline card">
        <div>
          <p className="section-kicker">The Rhythm</p>
          <h2>Day, night, and the space between</h2>
        </div>
        <div className="timeline-grid">
          <div>
            <h4>Before the event</h4>
            <p>Apollo Selene gives people a quiet way to check the details, understand the mood, and decide in their own time.</p>
          </div>
          <div>
            <h4>During the event</h4>
            <p>The experience carries that same tone forward with thoughtful programming, conversation, and room to breathe.</p>
          </div>
          <div>
            <h4>After the event</h4>
            <p>Reflections, artwork, and the ember page let the feeling of the gathering linger without turning the homepage into noise.</p>
          </div>
        </div>
      </section>
    </div>
  );
}