import React, { useEffect, useState } from 'react';
import { saveSiteContent } from '../lib/siteContent';

const defaultFieldDefinitions = [
  { key: 'home_hero_kicker', label: 'Kicker', multiline: false },
  { key: 'home_hero_title', label: 'Title', multiline: false },
  { key: 'home_hero_lead', label: 'Lead', multiline: false },
  { key: 'home_hero_description', label: 'Description', multiline: true },
  { key: 'home_mission_label', label: 'Mission label', multiline: false },
  { key: 'home_mission_text', label: 'Mission text', multiline: true },
];

const EditableField = ({ label, value, multiline, onChange }) => (
  <label className="inline-hero-field">
    <span>{label}</span>
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    ) : (
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    )}
  </label>
);

const InlineHeroEditor = ({ content, onContentChange, onSave }) => {
  const [formState, setFormState] = useState(content || {});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setFormState(content || {});
  }, [content]);

  const handleFieldChange = (key, nextValue) => {
    const nextState = { ...formState, [key]: nextValue };
    setFormState(nextState);
    onContentChange(nextState);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const { error, data } = await saveSiteContent(formState);
    if (error) {
      setMessage('Unable to save updates.');
    } else {
      setMessage('Saved successfully.');
      onSave?.(data);
    }
    setSaving(false);
  };

  return (
    <div className="inline-hero-editor card">
      <h3>Edit Hero Content</h3>
      {fieldDefinitions.map(({ key, label, multiline }) => (
        <EditableField
          key={key}
          label={label}
          value={formState[key] || ''}
          multiline={multiline}
          onChange={(value) => handleFieldChange(key, value)}
        />
      ))}
      <button type="button" onClick={handleSave} className="button-link primary-link" disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
      {message ? <p className="inline-editor-message">{message}</p> : null}
    </div>
  );
};

export default InlineHeroEditor;
