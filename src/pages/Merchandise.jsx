import React from 'react';

const Merchandise = ({ siteContent = {} }) => {
  const {
    merchandise_hero_kicker = 'Merchandise',
    merchandise_hero_title = 'Coming Soon',
    merchandise_hero_lead = 'The Apollo Selene shop is being prepared now and is not open yet.',
    merchandise_hero_description = 'When it launches, it will include a small collection of thoughtful pieces that match the tone of the space: calm, useful, and easy to bring into everyday life.',
    merchandise_mission_label = 'What To Expect',
    merchandise_mission_text = 'Apparel, art prints, and a few quiet keepsakes that help support future gatherings without turning the site into a storefront too early.',
  } = siteContent;

  const merchFields = [
    { key: 'merchandise_hero_kicker', label: 'Kicker', multiline: false },
    { key: 'merchandise_hero_title', label: 'Title', multiline: false },
    { key: 'merchandise_hero_lead', label: 'Lead', multiline: false },
    { key: 'merchandise_hero_description', label: 'Description', multiline: true },
    { key: 'merchandise_mission_label', label: 'Mission label', multiline: false },
    { key: 'merchandise_mission_text', label: 'Mission text', multiline: true },
  ];

  return (
    <div className="content-section">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="section-kicker">{merchandise_hero_kicker}</p>
          <h1>{merchandise_hero_title}</h1>
          <p className="hero-lead">
            {merchandise_hero_lead}
          </p>
          <p>
            {merchandise_hero_description}
          </p>
        </div>

        <div className="mission-panel">
          <p className="mission-label">{merchandise_mission_label}</p>
          <p className="mission-text">
            {merchandise_mission_text}
          </p>
        </div>
      </section>

      <section className="card">
        <h2>Why It Is Locked For Now</h2>
        <p>
          The merchandise section is paused until the first collection, pricing, and fulfillment details are ready. That keeps the site focused on events and community updates until the shop experience is complete.
        </p>
        <p>
          Check back soon for the official launch.
        </p>
      </section>
    </div>
  );
};

export default Merchandise;