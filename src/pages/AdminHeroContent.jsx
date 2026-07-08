import React, { useEffect, useState } from 'react';
import { getSiteContent, saveSiteContent } from '../lib/siteContent';

const fieldDefinitions = [
  { key: 'home_hero_kicker', label: 'Home hero kicker' },
  { key: 'home_hero_title', label: 'Home hero title' },
  { key: 'home_hero_lead', label: 'Home hero lead' },
  { key: 'home_hero_description', label: 'Home hero description' },
  { key: 'home_mission_label', label: 'Home mission label' },
  { key: 'home_mission_text', label: 'Home mission text' },
  { key: 'merchandise_hero_kicker', label: 'Merch hero kicker' },
  { key: 'merchandise_hero_title', label: 'Merch hero title' },
  { key: 'merchandise_hero_lead', label: 'Merch hero lead' },
  { key: 'merchandise_hero_description', label: 'Merch hero description' },
  { key: 'merchandise_mission_label', label: 'Merch mission label' },
  { key: 'merchandise_mission_text', label: 'Merch mission text' },
];

const AdminHeroContent = ({ isAdmin, onContentSaved }) => {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      const data = await getSiteContent();
      if (!active) return;
      setContent(data || {});
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleChange = (key, value) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await saveSiteContent(content);
    if (error) {
      setMessage('Unable to save hero content.');
    } else {
      setMessage('Hero content saved.');
      if (typeof onContentSaved === 'function') {
        onContentSaved(content);
      }
    }

    setSaving(false);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <section className="card admin-hero-content-card">
      <h2>Editable Hero Content</h2>
      {loading ? (
        <p>Loading content…</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {fieldDefinitions.map(({ key, label }) => (
            <label key={key} className="admin-field">
              <span>{label}</span>
              <textarea
                value={content[key] || ''}
                onChange={(event) => handleChange(key, event.target.value)}
                rows={key.includes('description') || key.includes('text') ? 3 : 1}
              />
            </label>
          ))}
          <button type="submit" disabled={saving} className="button-link primary-link">
            {saving ? 'Saving…' : 'Save Hero Content'}
          </button>
          {message && <p style={{ marginTop: '0.75rem' }}>{message}</p>}
        </form>
      )}
    </section>
  );
};

export default AdminHeroContent;
