import React, { useEffect, useState } from 'react';
import { getSiteContent, saveSiteContent } from '../lib/siteContent';

const RESERVED_KEYS = new Set(['id', 'created_at', 'updated_at']);

const prettifyKey = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const groupKey = (key) => {
  if (!key.includes('_')) return 'misc';
  return key.split('_')[0];
};

const AdminHeroContent = ({ isAdmin, onContentSaved }) => {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

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

    const payload = Object.entries(content).reduce((acc, [key, value]) => {
      if (!RESERVED_KEYS.has(key)) {
        acc[key] = value;
      }
      return acc;
    }, {});

    const { error } = await saveSiteContent(payload);
    if (error) {
      setMessage('Unable to save content.');
    } else {
      setMessage('Content saved.');
      if (typeof onContentSaved === 'function') {
        onContentSaved(payload);
      }
    }

    setSaving(false);
  };

  if (!isAdmin) {
    return null;
  }

  const editableEntries = Object.entries(content)
    .filter(([key]) => !RESERVED_KEYS.has(key))
    .filter(([key]) => {
      if (!query.trim()) return true;
      return key.toLowerCase().includes(query.toLowerCase());
    })
    .sort(([a], [b]) => a.localeCompare(b));

  const groupedEntries = editableEntries.reduce((acc, [key, value]) => {
    const group = groupKey(key);
    if (!acc[group]) acc[group] = [];
    acc[group].push([key, value]);
    return acc;
  }, {});

  const groupOrder = Object.keys(groupedEntries).sort((a, b) => a.localeCompare(b));

  return (
    <section className="card admin-hero-content-card">
      <h2>Central Content Manager</h2>
      <p style={{ marginTop: 0, opacity: 0.75 }}>
        Edit all site copy keys in one place. Changes save to site settings and appear across pages.
      </p>
      {loading ? (
        <p>Loading content…</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="admin-field" style={{ marginBottom: '0.75rem' }}>
            <span>Search Keys</span>
            <input
              type="text"
              placeholder="e.g. home_, events_btn_, artwork_modal_"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {groupOrder.map((group) => (
            <div key={group} style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.4rem', textTransform: 'capitalize' }}>{group}</h3>
              {groupedEntries[group].map(([key, value]) => (
                <label key={key} className="admin-field">
                  <span>{prettifyKey(key)} <code style={{ opacity: 0.7 }}>{key}</code></span>
                  <textarea
                    value={value || ''}
                    onChange={(event) => handleChange(key, event.target.value)}
                    rows={key.includes('description') || key.includes('text') || key.includes('summary') ? 3 : 1}
                  />
                </label>
              ))}
            </div>
          ))}

          {editableEntries.length === 0 && <p>No matching keys found.</p>}

          <button type="submit" disabled={saving} className="button-link primary-link">
            {saving ? 'Saving…' : 'Save All Content'}
          </button>
          {message && <p style={{ marginTop: '0.75rem' }}>{message}</p>}
        </form>
      )}
    </section>
  );
};

export default AdminHeroContent;
