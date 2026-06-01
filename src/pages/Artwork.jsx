import React, { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const GALLERY_TABLE = 'gallery_items';
const GALLERY_BUCKET = 'gallery';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const STATIC_ARTWORKS = [
  {
    id: 1,
    title: 'Quiet Orbit',
    artist: 'Apollo Selene Collective',
    description: 'A collaborative work built around the feeling of arriving somewhere peaceful. Soft tones and circular movement reflect the calm rhythm of the space.',
    image_url: 'https://images.pexels.com/photos/1109541/pexels-photo-1109541.jpeg?auto=compress&cs=tinysrgb&w=600',
    medium: 'Mixed Media',
    year: '2026',
    story: 'Created during an early Apollo Selene gathering, this piece invited each guest to add one mark representing what comfort looks like to them. The final composition became a shared map of rest, warmth, and belonging.',
  },
  {
    id: 2,
    title: 'Between Sun and Moon',
    artist: 'J. Rivera and N. Cole',
    description: 'This piece explores the balance between bright social energy and quiet reflection, the two moods Apollo Selene tries to hold at once.',
    image_url: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=600',
    medium: 'Digital Art',
    year: '2026',
    story: 'The artists developed this work after a reflection night focused on what people need from a community space. Their answer was balance: room for conversation, room for silence, and a feeling that both are welcome.',
  },
  {
    id: 3,
    title: 'Soft Landing',
    artist: 'Mina Sol',
    description: 'A warm abstract painting inspired by the moment someone realizes they can let their shoulders drop and simply be present.',
    image_url: 'https://images.pexels.com/photos/1708936/pexels-photo-1708936.jpeg?auto=compress&cs=tinysrgb&w=600',
    medium: 'Acrylic on Canvas',
    year: '2025',
    story: 'Painted after an Apollo Selene open house, this piece captures the emotional shift from uncertainty to ease. It became one of the defining images for the community because it mirrors the feeling many visitors describe.',
  },
];

const defaultUploadForm = { title: '', artist: '', description: '', medium: '', year: '', story: '' };

export default function Artwork() {
  const isAdmin = window.localStorage.getItem('apollo-admin') === 'true';

  const [artworks, setArtworks] = useState(STATIC_ARTWORKS);
  const [selectedArtwork, setSelectedArtwork] = useState(null);

  // Upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadForm, setUploadForm] = useState(defaultUploadForm);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editingCard, setEditingCard] = useState(null);
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from(GALLERY_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setArtworks(data);
      });
  }, []);

  const handleUpload = async () => {
    if (!uploadFile || !supabase) return;
    if (!uploadForm.title.trim()) { setUploadStatus('Title is required.'); return; }
    const ext = uploadFile.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      setUploadStatus('Only JPG, PNG, WEBP, or GIF images are allowed.');
      return;
    }
    if (uploadFile.size > MAX_IMAGE_BYTES) {
      setUploadStatus('File is too large. Maximum size is 10 MB.');
      return;
    }
    setUploading(true);
    setUploadStatus('');
    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safeName}`;
    const { error: storageError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(path, uploadFile, { upsert: false });
    if (storageError) {
      setUploadStatus(`Upload failed: ${storageError.message}`);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
    const { data: inserted, error: dbError } = await supabase
      .from(GALLERY_TABLE)
      .insert({
        title: uploadForm.title.trim(),
        artist: uploadForm.artist.trim(),
        description: uploadForm.description.trim(),
        medium: uploadForm.medium.trim(),
        year: uploadForm.year.trim(),
        story: uploadForm.story.trim(),
        image_url: publicUrl,
      })
      .select()
      .single();
    setUploading(false);
    if (dbError) {
      setUploadStatus(`Image uploaded but failed to save card: ${dbError.message}`);
      return;
    }
    setArtworks((prev) => [inserted, ...prev]);
    setUploadForm(defaultUploadForm);
    setUploadFile(null);
    setShowUploadForm(false);
  };

  const handleEditSave = async () => {
    if (!editingCard || !supabase) return;
    const { id, title, artist, description, medium, year, story } = editingCard;
    const { data: updated, error } = await supabase
      .from(GALLERY_TABLE)
      .update({ title, artist, description, medium, year, story })
      .eq('id', id)
      .select()
      .single();
    if (error) { setEditStatus(`Save failed: ${error.message}`); return; }
    setArtworks((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setEditingCard(null);
    setEditStatus('');
  };

  const handleDelete = async (id) => {
    if (!supabase) return;
    await supabase.from(GALLERY_TABLE).delete().eq('id', id);
    setArtworks((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="content-section">
      <h1>Apollo Selene Gallery</h1>

      <div className="card">
        <p>
          The gallery reflects the emotional tone of Apollo Selene: calm, welcoming, and quietly alive. These works help shape the atmosphere around our events and give people another way to connect with the space.
        </p>
        <p>
          <strong>Living Gallery:</strong> This collection grows through gatherings, conversations, and shared moments of reflection. Each piece carries a little of the mood people come here to find.
        </p>
      </div>

      {/* Admin upload controls */}
      {isAdmin && (
        <div className="gallery-admin-bar">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => { setShowUploadForm((v) => !v); setUploadStatus(''); }}
          >
            {showUploadForm ? 'Cancel' : '+ Add Image'}
          </button>

          {showUploadForm && (
            <div className="gallery-upload-form">
              <label className="gallery-upload-file-label">
                {uploadFile ? uploadFile.name : 'Choose image (JPG, PNG, WEBP, GIF — max 10 MB)'}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                  className="gallery-upload-file-input"
                  onChange={(e) => { setUploadFile(e.target.files[0] || null); setUploadStatus(''); }}
                />
              </label>
              <div className="gallery-upload-fields">
                <input placeholder="Title *" value={uploadForm.title} onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))} />
                <input placeholder="Artist" value={uploadForm.artist} onChange={(e) => setUploadForm((f) => ({ ...f, artist: e.target.value }))} />
                <input placeholder="Medium" value={uploadForm.medium} onChange={(e) => setUploadForm((f) => ({ ...f, medium: e.target.value }))} />
                <input placeholder="Year" value={uploadForm.year} onChange={(e) => setUploadForm((f) => ({ ...f, year: e.target.value }))} />
                <textarea placeholder="Description" value={uploadForm.description} onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))} />
                <textarea placeholder="Story behind the art" value={uploadForm.story} onChange={(e) => setUploadForm((f) => ({ ...f, story: e.target.value }))} />
              </div>
              <button
                type="button"
                className="button-link primary-link"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
              >
                {uploading ? 'Uploading…' : 'Add to Gallery'}
              </button>
              {uploadStatus && <p className="gallery-status">{uploadStatus}</p>}
            </div>
          )}
        </div>
      )}

      {/* Artwork Gallery */}
      <div className="artwork-gallery">
        {artworks.map((artwork) => (
          <div
            key={artwork.id}
            className="artwork-card"
            onClick={() => !isAdmin && setSelectedArtwork(artwork)}
          >
            <div className="artwork-image">
              <img src={artwork.image_url || artwork.image} alt={artwork.title} />
              {!isAdmin && (
                <div className="artwork-overlay">
                  <span className="view-details">View Details</span>
                </div>
              )}
              {isAdmin && (
                <div className="artwork-admin-actions">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingCard({ ...artwork }); setEditStatus(''); }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="artwork-delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDelete(artwork.id); }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <div className="artwork-info">
              <h3>{artwork.title}</h3>
              <p className="artwork-artist">by {artwork.artist}</p>
              <p className="artwork-medium">{artwork.medium} • {artwork.year}</p>
              <p className="artwork-description">{artwork.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal (non-admin) */}
      {selectedArtwork && (
        <div className="modal-overlay" onClick={() => setSelectedArtwork(null)}>
          <div className="modal artwork-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedArtwork(null)}>×</button>
            <div className="artwork-detail">
              <div className="artwork-detail-image">
                <img src={selectedArtwork.image_url || selectedArtwork.image} alt={selectedArtwork.title} />
              </div>
              <div className="artwork-detail-info">
                <h2>{selectedArtwork.title}</h2>
                <p className="detail-artist">by {selectedArtwork.artist}</p>
                <p className="detail-medium">{selectedArtwork.medium} • {selectedArtwork.year}</p>
                <p className="detail-description">{selectedArtwork.description}</p>
                <div className="artwork-story">
                  <h4>The Story Behind the Art</h4>
                  <p>{selectedArtwork.story}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (admin only) */}
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)}>
          <div className="modal artwork-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setEditingCard(null)}>×</button>
            <h2 style={{ marginTop: 0 }}>Edit Card</h2>
            <div className="gallery-upload-fields">
              <input placeholder="Title" value={editingCard.title} onChange={(e) => setEditingCard((c) => ({ ...c, title: e.target.value }))} />
              <input placeholder="Artist" value={editingCard.artist} onChange={(e) => setEditingCard((c) => ({ ...c, artist: e.target.value }))} />
              <input placeholder="Medium" value={editingCard.medium} onChange={(e) => setEditingCard((c) => ({ ...c, medium: e.target.value }))} />
              <input placeholder="Year" value={editingCard.year} onChange={(e) => setEditingCard((c) => ({ ...c, year: e.target.value }))} />
              <textarea placeholder="Description" value={editingCard.description} onChange={(e) => setEditingCard((c) => ({ ...c, description: e.target.value }))} />
              <textarea placeholder="Story" value={editingCard.story} onChange={(e) => setEditingCard((c) => ({ ...c, story: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
              <button type="button" className="button-link primary-link" onClick={handleEditSave}>Save</button>
              <button type="button" className="button-link secondary-link" onClick={() => setEditingCard(null)}>Cancel</button>
            </div>
            {editStatus && <p className="gallery-status">{editStatus}</p>}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Creativity Sets the Tone</h3>
        <p>
          In Apollo Selene, art helps create a softer entry into community. It gives people something to notice, reflect on, and talk about before the room ever asks anything from them.
        </p>
        <p>
          <strong>Want to contribute?</strong> Join an art night or share a piece that captures comfort, rest, gathering, or reflection. It does not need to be polished. It only needs to be honest.
        </p>
      </div>

      <div className="card">
        <h3>What the Gallery Holds</h3>
        <ul>
          <li><strong>Atmosphere Pieces:</strong> Work that helps the space feel warm, steady, and welcoming</li>
          <li><strong>Story-Carrying Art:</strong> Each piece reflects a real gathering, feeling, or conversation</li>
          <li><strong>Collaborative Spirit:</strong> Many works begin with more than one person contributing</li>
          <li><strong>Open Creativity:</strong> Anyone can contribute, regardless of experience or training</li>
          <li><strong>Growing Collection:</strong> The gallery evolves as the community continues to gather</li>
        </ul>
      </div>
    </div>
  );
}

  const [artworks] = useState([
    {
      id: 1,
      title: 'Quiet Orbit',
      artist: 'Apollo Selene Collective',
      description: 'A collaborative work built around the feeling of arriving somewhere peaceful. Soft tones and circular movement reflect the calm rhythm of the space.',
      image: 'https://images.pexels.com/photos/1109541/pexels-photo-1109541.jpeg?auto=compress&cs=tinysrgb&w=600',
      medium: 'Mixed Media',
      year: '2026',
      story: 'Created during an early Apollo Selene gathering, this piece invited each guest to add one mark representing what comfort looks like to them. The final composition became a shared map of rest, warmth, and belonging.'
    },
    {
      id: 2,
      title: 'Between Sun and Moon',
      artist: 'J. Rivera and N. Cole',
      description: 'This piece explores the balance between bright social energy and quiet reflection, the two moods Apollo Selene tries to hold at once.',
      image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=600',
      medium: 'Digital Art',
      year: '2026',
      story: 'The artists developed this work after a reflection night focused on what people need from a community space. Their answer was balance: room for conversation, room for silence, and a feeling that both are welcome.'
    },
    {
      id: 3,
      title: 'Soft Landing',
      artist: 'Mina Sol',
      description: 'A warm abstract painting inspired by the moment someone realizes they can let their shoulders drop and simply be present.',
      image: 'https://images.pexels.com/photos/1708936/pexels-photo-1708936.jpeg?auto=compress&cs=tinysrgb&w=600',
      medium: 'Acrylic on Canvas',
      year: '2025',
      story: 'Painted after an Apollo Selene open house, this piece captures the emotional shift from uncertainty to ease. It became one of the defining images for the community because it mirrors the feeling many visitors describe.'
    },
  ]);

  const [selectedArtwork, setSelectedArtwork] = useState(null);

  return (
    <div className="content-section">
      <h1>Apollo Selene Gallery</h1>
      
      <div className="card">
        <p>
          The gallery reflects the emotional tone of Apollo Selene: calm, welcoming, and quietly alive. These works help shape the atmosphere around our events and give people another way to connect with the space.
        </p>
        <p>
          <strong>Living Gallery:</strong> This collection grows through gatherings, conversations, and shared moments of reflection. Each piece carries a little of the mood people come here to find.
        </p>
      </div>

      {/* Artwork Gallery */}
      <div className="artwork-gallery">
        {artworks.map(artwork => (
          <div 
            key={artwork.id} 
            className="artwork-card"
            onClick={() => setSelectedArtwork(artwork)}
          >
            <div className="artwork-image">
              <img src={artwork.image} alt={artwork.title} />
              <div className="artwork-overlay">
                <span className="view-details">View Details</span>
              </div>
            </div>
            <div className="artwork-info">
              <h3>{artwork.title}</h3>
              <p className="artwork-artist">by {artwork.artist}</p>
              <p className="artwork-medium">{artwork.medium} • {artwork.year}</p>
              <p className="artwork-description">{artwork.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Artwork Detail Modal */}
      {selectedArtwork && (
        <div className="modal-overlay" onClick={() => setSelectedArtwork(null)}>
          <div className="modal artwork-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-btn"
              onClick={() => setSelectedArtwork(null)}
            >
              ×
            </button>
            <div className="artwork-detail">
              <div className="artwork-detail-image">
                <img src={selectedArtwork.image} alt={selectedArtwork.title} />
              </div>
              <div className="artwork-detail-info">
                <h2>{selectedArtwork.title}</h2>
                <p className="detail-artist">by {selectedArtwork.artist}</p>
                <p className="detail-medium">{selectedArtwork.medium} • {selectedArtwork.year}</p>
                <p className="detail-description">{selectedArtwork.description}</p>
                <div className="artwork-story">
                  <h4>The Story Behind the Art</h4>
                  <p>{selectedArtwork.story}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Creativity Sets the Tone</h3>
        <p>
          In Apollo Selene, art helps create a softer entry into community. It gives people something to notice, reflect on, and talk about before the room ever asks anything from them.
        </p>
        <p>
          <strong>Want to contribute?</strong> Join an art night or share a piece that captures comfort, rest, gathering, or reflection. It does not need to be polished. It only needs to be honest.
        </p>
      </div>

      <div className="card">
        <h3>What the Gallery Holds</h3>
        <ul>
          <li><strong>Atmosphere Pieces:</strong> Work that helps the space feel warm, steady, and welcoming</li>
          <li><strong>Story-Carrying Art:</strong> Each piece reflects a real gathering, feeling, or conversation</li>
          <li><strong>Collaborative Spirit:</strong> Many works begin with more than one person contributing</li>
          <li><strong>Open Creativity:</strong> Anyone can contribute, regardless of experience or training</li>
          <li><strong>Growing Collection:</strong> The gallery evolves as the community continues to gather</li>
        </ul>
      </div>
    </div>
  );
}