import React, { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const STATIC_REFLECTIONS = [
  { id: 1, author: 'Sarah M.', title: 'I Felt Comfortable Right Away', content: 'I came to Apollo Selene not knowing anyone and expected to feel awkward. Instead, the room felt soft, friendly, and easy to settle into. By the end of the night, I had sketched, laughed, and actually relaxed.', likes: 12, tags: ['welcome', 'art', 'calm'], approved: true, created_at: '2024-12-15' },
  { id: 2, author: 'Marcus T.', title: 'A Place To Exhale', content: 'The story circle gave me something I did not realize I needed: a place to slow down. No one pushed, no one performed. People listened, shared honestly, and made the whole night feel grounding.', likes: 18, tags: ['storytelling', 'comfort', 'community'], approved: true, created_at: '2024-12-10' },
  { id: 3, author: 'Elena R.', title: 'Gentle Energy, Real Connection', content: 'What stood out to me most was the balance. Apollo Selene feels alive without being overwhelming. I could talk to new people, take a break when I needed one, and still feel part of everything happening around me.', likes: 25, tags: ['connection', 'events', 'reflection'], approved: true, created_at: '2024-12-05' },
];

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const Experiences = () => {
  const isAdmin = window.localStorage.getItem('apollo-admin') === 'true';

  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [form, setForm] = useState({ author: '', title: '', content: '', tags: '' });

  const loadReflections = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      setReflections(STATIC_REFLECTIONS);
      setLoading(false);
      return;
    }
    // Admin sees all; public sees only approved
    let query = supabase.from('reflections').select('*').order('created_at', { ascending: false });
    if (!isAdmin) query = query.eq('approved', true);
    const { data, error } = await query;
    if (error) {
      setReflections(STATIC_REFLECTIONS);
    } else {
      setReflections(data || []);
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { loadReflections(); }, [loadReflections]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setSubmitMsg('Database not configured â€” reflection not saved.');
      return;
    }
    setSubmitting(true);
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from('reflections').insert({
      author: form.author.trim(),
      title: form.title.trim(),
      content: form.content.trim(),
      tags,
    });
    setSubmitting(false);
    if (error) {
      setSubmitMsg('Something went wrong. Please try again.');
    } else {
      setForm({ author: '', title: '', content: '', tags: '' });
      setShowForm(false);
      setSubmitMsg('Thank you â€” your reflection has been submitted and will appear once approved.');
    }
  };

  const handleApprove = async (id) => {
    if (!isUuid(id) || !supabase) return;
    await supabase.from('reflections').update({ approved: true }).eq('id', id);
    setReflections((prev) => prev.map((r) => (r.id === id ? { ...r, approved: true } : r)));
  };

  const handleDelete = async (id) => {
    if (!isUuid(id) || !supabase) {
      setReflections((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    await supabase.from('reflections').delete().eq('id', id);
    setReflections((prev) => prev.filter((r) => r.id !== id));
  };

  const handleLike = async (reflection) => {
    const id = reflection.id;
    if (likedPosts.has(id)) {
      const newLikes = Math.max(0, reflection.likes - 1);
      setLikedPosts((prev) => { const s = new Set(prev); s.delete(id); return s; });
      setReflections((prev) => prev.map((r) => (r.id === id ? { ...r, likes: newLikes } : r)));
      if (isUuid(id) && supabase) supabase.from('reflections').update({ likes: newLikes }).eq('id', id);
    } else {
      const newLikes = reflection.likes + 1;
      setLikedPosts((prev) => new Set([...prev, id]));
      setReflections((prev) => prev.map((r) => (r.id === id ? { ...r, likes: newLikes } : r)));
      if (isUuid(id) && supabase) supabase.from('reflections').update({ likes: newLikes }).eq('id', id);
    }
  };

  const approved = reflections.filter((r) => r.approved);
  const pending = reflections.filter((r) => !r.approved);

  return (
    <div className="content-section">
      <div className="flex justify-between items-center mb-4">
        <h1>Reflections</h1>
        <button onClick={() => setShowForm(true)} className="share-experience-btn">
          Share Your Reflection
        </button>
      </div>

      <div className="card">
        <p>This is where people share how Apollo Selene felt to them â€” about the events, the comfort, the quiet, and the connection they found.</p>
      </div>

      {submitMsg && (
        <div className="card" style={{ borderColor: 'var(--accent-strong)', marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>{submitMsg}</p>
        </div>
      )}

      {/* Submit form modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal experience-modal">
            <h3>Share Your Reflection</h3>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Your name or initials" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
              <input type="text" placeholder="Reflection title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <textarea placeholder="How did Apollo Selene make you feel? What stayed with you?" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows="6" required />
              <input type="text" placeholder="Tags (comma-separated, e.g. calm, connection, welcome)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              <div className="modal-actions">
                <button type="submit" disabled={submitting}>{submitting ? 'Submittingâ€¦' : 'Share Reflection'}</button>
                <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin: pending approvals */}
      {isAdmin && pending.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: '0.75rem' }}>
            Pending Approval ({pending.length})
          </h2>
          <div className="experiences-feed">
            {pending.map((r) => (
              <div key={r.id} className="experience-card" style={{ opacity: 0.75, borderStyle: 'dashed' }}>
                <div className="experience-header">
                  <div className="author-info">
                    <div className="author-avatar">{r.author.charAt(0).toUpperCase()}</div>
                    <div>
                      <h4>{r.author}</h4>
                      <span className="experience-date">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="experience-content">
                  <h3>{r.title}</h3>
                  <p>{r.content}</p>
                </div>
                {r.tags?.length > 0 && (
                  <div className="experience-tags">{r.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
                )}
                <div className="experience-actions" style={{ gap: '0.5rem' }}>
                  <button className="share-experience-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={() => handleApprove(r.id)}>âœ“ Approve</button>
                  <button onClick={() => handleDelete(r.id)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', background: 'none', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '20px', color: '#ff6060', cursor: 'pointer' }}>âœ• Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Published reflections */}
      {loading ? (
        <p style={{ opacity: 0.5 }}>Loading reflectionsâ€¦</p>
      ) : approved.length === 0 ? (
        <div className="card"><p style={{ opacity: 0.6 }}>No reflections yet. Be the first to share yours.</p></div>
      ) : (
        <div className="experiences-feed">
          {approved.map((r) => (
            <div key={r.id} className="experience-card">
              <div className="experience-header">
                <div className="author-info">
                  <div className="author-avatar">{r.author.charAt(0).toUpperCase()}</div>
                  <div>
                    <h4>{r.author}</h4>
                    <span className="experience-date">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="experience-content">
                <h3>{r.title}</h3>
                <p>{r.content}</p>
              </div>
              {r.tags?.length > 0 && (
                <div className="experience-tags">{r.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
              )}
              <div className="experience-actions">
                <button className={`like-btn ${likedPosts.has(r.id) ? 'liked' : ''}`} onClick={() => handleLike(r)}>
                  <span className="heart">â™¥</span> {r.likes}
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '20px', color: '#ff6060', cursor: 'pointer', fontSize: '0.78rem', padding: '0.25rem 0.65rem' }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card text-center">
        <h3>Every Experience Matters</h3>
        <p>Every reflection helps define the kind of place Apollo Selene is becoming. Whether your story is about meeting someone new, finding a quiet corner, or finally feeling able to relax â€” it helps others know they can belong here too.</p>
      </div>
    </div>
  );
};

export default Experiences;
