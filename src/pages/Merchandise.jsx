import React from 'react';
import InlineEditor from '../components/InlineEditor';
import { isAdminUiEnabled } from '../lib/adminAccess';

const Merchandise = ({ siteContent = {}, onSiteContentUpdated }) => {
  const isAdmin = isAdminUiEnabled();
  const {
    merchandise_hero_kicker = 'Merchandise',
    merchandise_hero_title = 'Coming Soon',
    merchandise_hero_lead = 'The Apollo Selene shop is being prepared now and is not open yet.',
    merchandise_hero_description = 'When it launches, it will include a small collection of thoughtful pieces that match the tone of the space: calm, useful, and easy to bring into everyday life.',
    merchandise_mission_label = 'What To Expect',
    merchandise_mission_text = 'Apparel, art prints, and a few quiet keepsakes that help support future gatherings without turning the site into a storefront too early.',
    merchandise_locked_title = 'Why It Is Locked For Now',
    merchandise_locked_text = 'The merchandise section is paused until the first collection, pricing, and fulfillment details are ready. That keeps the site focused on events and community updates until the shop experience is complete.',
    merchandise_locked_note = 'Check back soon for the official launch.',
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
          <p className="section-kicker"><InlineEditor isAdmin={isAdmin} value={merchandise_hero_kicker} fieldKey="merchandise_hero_kicker" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <h1><InlineEditor isAdmin={isAdmin} value={merchandise_hero_title} fieldKey="merchandise_hero_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></h1>
          <p className="hero-lead">
            <InlineEditor isAdmin={isAdmin} value={merchandise_hero_lead} fieldKey="merchandise_hero_lead" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
          </p>
          <p>
            <InlineEditor isAdmin={isAdmin} value={merchandise_hero_description} fieldKey="merchandise_hero_description" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
          </p>
        </div>

        <div className="mission-panel">
          <p className="mission-label"><InlineEditor isAdmin={isAdmin} value={merchandise_mission_label} fieldKey="merchandise_mission_label" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p className="mission-text">
            <InlineEditor isAdmin={isAdmin} value={merchandise_mission_text} fieldKey="merchandise_mission_text" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
          </p>
        </div>
      </section>

      <section className="card">
        <h2><InlineEditor isAdmin={isAdmin} value={merchandise_locked_title} fieldKey="merchandise_locked_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></h2>
        <p>
          <InlineEditor isAdmin={isAdmin} value={merchandise_locked_text} fieldKey="merchandise_locked_text" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
        </p>
        <p>
          <InlineEditor isAdmin={isAdmin} value={merchandise_locked_note} fieldKey="merchandise_locked_note" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
        </p>
      </section>
    </div>
  );
};

export default Merchandise;