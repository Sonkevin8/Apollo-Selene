import React from 'react';
import { Link } from 'react-router-dom';
import InlineEditor from '../components/InlineEditor';
import { saveSiteContent } from '../lib/siteContent';

export default function Home({ theme = 'apollo', siteContent = {}, onSiteContentUpdated }) {
  const {
    home_hero_kicker = 'Apollo by light. Selene by night.',
    home_hero_title = 'Welcome to Apollo Selene',
    home_hero_lead = 'A quiet place to arrive, find the next gathering, and feel welcome enough to come back again.',
    home_hero_description = 'Apollo Selene is a warm landing spot for community life. It keeps event details in focus, while still aiming to feel calm, clear, and inviting from the very first visit.',
    home_mission_label = 'Mission Statement',
    home_mission_text = 'Apollo Selene brings people together by sharing gatherings clearly and welcoming everyone with thoughtful care. It aims to create a space where people can relax, reconnect, and feel at ease before they even arrive.',
  } = siteContent;

  const homeFields = [
    { key: 'home_hero_kicker', label: 'Kicker', multiline: false },
    { key: 'home_hero_title', label: 'Title', multiline: false },
    { key: 'home_hero_lead', label: 'Lead', multiline: false },
    { key: 'home_hero_description', label: 'Description', multiline: true },
    { key: 'home_mission_label', label: 'Mission label', multiline: false },
    { key: 'home_mission_text', label: 'Mission text', multiline: true },
  ];

  return (
    <div className="content-section home-page">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="section-kicker"><InlineEditor isAdmin={window.localStorage.getItem('apollo-admin') === 'true'} value={home_hero_kicker} fieldKey="home_hero_kicker" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <h1>
            <InlineEditor isAdmin={window.localStorage.getItem('apollo-admin') === 'true'} value={home_hero_title} fieldKey="home_hero_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /> <span className="name-secret">secrets</span>
          </h1>
          <p className="hero-lead">
            <InlineEditor isAdmin={window.localStorage.getItem('apollo-admin') === 'true'} value={home_hero_lead} fieldKey="home_hero_lead" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
          </p>
          <p>
            <InlineEditor isAdmin={window.localStorage.getItem('apollo-admin') === 'true'} value={home_hero_description} fieldKey="home_hero_description" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
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
            <p className="mission-label"><InlineEditor isAdmin={window.localStorage.getItem('apollo-admin') === 'true'} value={home_mission_label} fieldKey="home_mission_label" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p className="mission-text">
              <InlineEditor isAdmin={window.localStorage.getItem('apollo-admin') === 'true'} value={home_mission_text} fieldKey="home_mission_text" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
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