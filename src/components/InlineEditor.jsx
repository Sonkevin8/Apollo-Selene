import React, { useState } from 'react';
import { saveSiteContent } from '../lib/siteContent';

export default function InlineEditor({ value = '', fieldKey, multiline = false, isAdmin = false, siteContent = {}, onSiteContentUpdated }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const startEdit = () => { setDraft(value || ''); setEditing(true); setMsg(''); };
  const cancelEdit = () => { setDraft(value || ''); setEditing(false); setMsg(''); };

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setLoading(true);
    setMsg('');
    try {
      const prev = { ...siteContent };
      const payload = { ...siteContent, [fieldKey]: draft };
      // optimistic update
      if (typeof onSiteContentUpdated === 'function') onSiteContentUpdated(payload);
      const { data, error } = await saveSiteContent(payload);
      if (error) {
        // revert
        if (typeof onSiteContentUpdated === 'function') onSiteContentUpdated(prev);
        setMsg(error.message || 'Save failed.');
      } else {
        if (typeof onSiteContentUpdated === 'function') onSiteContentUpdated(data || payload);
        setEditing(false);
      }
    } catch (e) {
      setMsg(e?.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return multiline ? <>{value}</> : <>{value}</>;
  }

  return (
    <span className="inline-editor">
      {!editing ? (
        <>
          {multiline ? <span>{value}</span> : <span>{value}</span>}
          <button type="button" className="button-link secondary-link" style={{ marginLeft: '0.5rem' }} onClick={startEdit}>Edit</button>
        </>
      ) : (
        <div style={{ marginTop: '0.5rem' }}>
          {multiline ? (
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} style={{ width: '100%' }} />
          ) : (
            <input value={draft} onChange={(e) => setDraft(e.target.value)} style={{ width: '100%' }} />
          )}
          <div style={{ marginTop: '0.5rem' }}>
            <button type="button" className="button-link primary-link" onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
            <button type="button" className="button-link secondary-link" onClick={cancelEdit} style={{ marginLeft: '0.5rem' }}>Cancel</button>
            {msg && <span style={{ marginLeft: '0.5rem', color: '#d33' }}>{msg}</span>}
          </div>
        </div>
      )}
    </span>
  );
}
