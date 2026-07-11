import React, { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import InlineEditor from '../components/InlineEditor';
import { isAdminUiEnabled } from '../lib/adminAccess';

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

const defaultUploadForm = { title: '', artist: '', description: '', medium: '', year: '', story: '', price: '' };

export default function Artwork({ siteContent = {}, onSiteContentUpdated }) {
  const isAdmin = isAdminUiEnabled();
  const {
    artwork_intro_title = 'Apollo Selene Gallery',
    artwork_intro_text = 'The gallery reflects the emotional tone of Apollo Selene: calm, welcoming, and quietly alive. These works help shape the atmosphere around our events and give people another way to connect with the space.',
    artwork_intro_living = 'Living Gallery: This collection grows through gatherings, conversations, and shared moments of reflection. Each piece carries a little of the mood people come here to find.',
    artwork_outro_title = 'Creativity Sets the Tone',
    artwork_outro_text = 'In Apollo Selene, art helps create a softer entry into community. It gives people something to notice, reflect on, and talk about before the room ever asks anything from them.',
    artwork_outro_cta = 'Want to contribute? Join an art night or share a piece that captures comfort, rest, gathering, or reflection. It does not need to be polished. It only needs to be honest.',
    artwork_holds_title = 'What the Gallery Holds',
    artwork_holds_item_1 = 'Atmosphere Pieces: Work that helps the space feel warm, steady, and welcoming',
    artwork_holds_item_2 = 'Story-Carrying Art: Each piece reflects a real gathering, feeling, or conversation',
    artwork_holds_item_3 = 'Collaborative Spirit: Many works begin with more than one person contributing',
    artwork_holds_item_4 = 'Open Creativity: Anyone can contribute, regardless of experience or training',
    artwork_holds_item_5 = 'Growing Collection: The gallery evolves as the community continues to gather',
    artwork_modal_story_title = 'The Story Behind the Art',
    artwork_modal_edit_title = 'Edit Card',
    artwork_modal_replace_image = 'Replace image (JPG, PNG, WEBP, GIF - max 10 MB)',
    artwork_modal_ph_title = 'Title',
    artwork_modal_ph_artist = 'Artist',
    artwork_modal_ph_medium = 'Medium',
    artwork_modal_ph_year = 'Year',
    artwork_modal_ph_description = 'Description',
    artwork_modal_ph_story = 'Story',
    artwork_modal_btn_save = 'Save',
    artwork_modal_btn_cancel = 'Cancel',
  } = siteContent;
  const [currentUserId, setCurrentUserId] = useState(null);

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
  const [editFile, setEditFile] = useState(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id ?? null);
    });
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
        user_id: currentUserId ?? null,
        price: uploadForm.price ? parseFloat(uploadForm.price) : null,
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

  const isUuid = (id) =>
    typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const handleEditSave = async () => {
    if (!editingCard) return;
    const { id, title, artist, description, medium, year, story } = editingCard;
    let newImageUrl = editingCard.image_url;

    if (editFile) {
      const ext = editFile.name.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
        setEditStatus('Only JPG, PNG, WEBP, or GIF images are allowed.');
        return;
      }
      if (editFile.size > MAX_IMAGE_BYTES) {
        setEditStatus('File is too large. Maximum size is 10 MB.');
        return;
      }
      setEditUploading(true);
      const safeName = editFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${Date.now()}-${safeName}`;
      const { error: storageError } = await supabase.storage
        .from(GALLERY_BUCKET)
        .upload(path, editFile, { upsert: false });
      if (storageError) {
        setEditStatus(`Image upload failed: ${storageError.message}`);
        setEditUploading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
      newImageUrl = publicUrl;
      setEditUploading(false);
    }

    if (!isUuid(id) || !supabase) {
      // Static placeholder artwork — update local state only
      setArtworks((prev) => prev.map((a) => (a.id === id ? { ...a, title, artist, description, medium, year, story, image_url: newImageUrl } : a)));
      setEditingCard(null);
      setEditFile(null);
      return;
    }
    const { data: updated, error } = await supabase
      .from(GALLERY_TABLE)
      .update({ title, artist, description, medium, year, story, image_url: newImageUrl })
      .eq('id', id)
      .select()
      .single();
    if (error) { setEditStatus(`Save failed: ${error.message}`); return; }
    setArtworks((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setEditingCard(null);
    setEditFile(null);
    setEditStatus('');
  };

  const handleDelete = async (id) => {
    if (isUuid(id) && supabase) {
      await supabase.from(GALLERY_TABLE).delete().eq('id', id);
    }
    setArtworks((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="content-section">
      <h1>
        <InlineEditor
          isAdmin={isAdmin}
          value={artwork_intro_title}
          fieldKey="artwork_intro_title"
          multiline={false}
          siteContent={siteContent}
          onSiteContentUpdated={onSiteContentUpdated}
        />
      </h1>

      <div className="card">
        <p>
          <InlineEditor
            isAdmin={isAdmin}
            value={artwork_intro_text}
            fieldKey="artwork_intro_text"
            multiline={true}
            siteContent={siteContent}
            onSiteContentUpdated={onSiteContentUpdated}
          />
        </p>
        <p>
          <InlineEditor
            isAdmin={isAdmin}
            value={artwork_intro_living}
            fieldKey="artwork_intro_living"
            multiline={true}
            siteContent={siteContent}
            onSiteContentUpdated={onSiteContentUpdated}
          />
        </p>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginTop: '0.75rem' }}>
          <p className="section-kicker" style={{ marginBottom: '0.45rem' }}>Artwork modal labels</p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_story_title} fieldKey="artwork_modal_story_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_edit_title} fieldKey="artwork_modal_edit_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_replace_image} fieldKey="artwork_modal_replace_image" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_ph_title} fieldKey="artwork_modal_ph_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_ph_artist} fieldKey="artwork_modal_ph_artist" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_ph_medium} fieldKey="artwork_modal_ph_medium" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_ph_year} fieldKey="artwork_modal_ph_year" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_ph_description} fieldKey="artwork_modal_ph_description" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_ph_story} fieldKey="artwork_modal_ph_story" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_btn_save} fieldKey="artwork_modal_btn_save" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          <p style={{ margin: 0 }}><InlineEditor isAdmin={isAdmin} value={artwork_modal_btn_cancel} fieldKey="artwork_modal_btn_cancel" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
        </div>
      )}

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
                {uploadFile ? uploadFile.name : 'Choose image (JPG, PNG, WEBP, GIF â€” max 10 MB)'}
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
                <input type="number" min="0" step="0.01" placeholder="Price (NZD) — leave blank if not for sale" value={uploadForm.price} onChange={(e) => setUploadForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <button
                type="button"
                className="button-link primary-link"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
              >
                {uploading ? 'Uploadingâ€¦' : 'Add to Gallery'}
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
              <p className="artwork-medium">{artwork.medium} â€¢ {artwork.year}</p>
              <p className="artwork-description">{artwork.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal (non-admin) */}
      {selectedArtwork && (
        <div className="modal-overlay" onClick={() => setSelectedArtwork(null)}>
          <div className="modal artwork-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedArtwork(null)}>Ã—</button>
            <div className="artwork-detail">
              <div className="artwork-detail-image">
                <img src={selectedArtwork.image_url || selectedArtwork.image} alt={selectedArtwork.title} />
              </div>
              <div className="artwork-detail-info">
                <h2>{selectedArtwork.title}</h2>
                <p className="detail-artist">by {selectedArtwork.artist}</p>
                <p className="detail-medium">{selectedArtwork.medium} â€¢ {selectedArtwork.year}</p>
                <p className="detail-description">{selectedArtwork.description}</p>
                <div className="artwork-story">
                  <h4>{artwork_modal_story_title}</h4>
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
            <button className="close-btn" onClick={() => { setEditingCard(null); setEditFile(null); setEditStatus(''); }}>Ã—</button>
            <h2 style={{ marginTop: 0 }}>{artwork_modal_edit_title}</h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <img
                src={editFile ? URL.createObjectURL(editFile) : (editingCard.image_url || editingCard.image)}
                alt={editingCard.title}
                style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <label className="gallery-upload-file-label" style={{ display: 'block', marginTop: '0.5rem', cursor: 'pointer' }}>
                {editFile ? editFile.name : artwork_modal_replace_image}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                  className="gallery-upload-file-input"
                  onChange={(e) => { setEditFile(e.target.files[0] || null); setEditStatus(''); }}
                />
              </label>
            </div>
            <div className="gallery-upload-fields">
              <input placeholder={artwork_modal_ph_title} value={editingCard.title} onChange={(e) => setEditingCard((c) => ({ ...c, title: e.target.value }))} />
              <input placeholder={artwork_modal_ph_artist} value={editingCard.artist} onChange={(e) => setEditingCard((c) => ({ ...c, artist: e.target.value }))} />
              <input placeholder={artwork_modal_ph_medium} value={editingCard.medium} onChange={(e) => setEditingCard((c) => ({ ...c, medium: e.target.value }))} />
              <input placeholder={artwork_modal_ph_year} value={editingCard.year} onChange={(e) => setEditingCard((c) => ({ ...c, year: e.target.value }))} />
              <textarea placeholder={artwork_modal_ph_description} value={editingCard.description} onChange={(e) => setEditingCard((c) => ({ ...c, description: e.target.value }))} />
              <textarea placeholder={artwork_modal_ph_story} value={editingCard.story} onChange={(e) => setEditingCard((c) => ({ ...c, story: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
              <button type="button" className="button-link primary-link" onClick={handleEditSave} disabled={editUploading}>
                {editUploading ? 'Uploading…' : artwork_modal_btn_save}
              </button>
              <button type="button" className="button-link secondary-link" onClick={() => { setEditingCard(null); setEditFile(null); setEditStatus(''); }}>{artwork_modal_btn_cancel}</button>
            </div>
            {editStatus && <p className="gallery-status">{editStatus}</p>}
          </div>
        </div>
      )}

      <div className="card">
        <h3>
          <InlineEditor
            isAdmin={isAdmin}
            value={artwork_outro_title}
            fieldKey="artwork_outro_title"
            multiline={false}
            siteContent={siteContent}
            onSiteContentUpdated={onSiteContentUpdated}
          />
        </h3>
        <p>
          <InlineEditor
            isAdmin={isAdmin}
            value={artwork_outro_text}
            fieldKey="artwork_outro_text"
            multiline={true}
            siteContent={siteContent}
            onSiteContentUpdated={onSiteContentUpdated}
          />
        </p>
        <p>
          <InlineEditor
            isAdmin={isAdmin}
            value={artwork_outro_cta}
            fieldKey="artwork_outro_cta"
            multiline={true}
            siteContent={siteContent}
            onSiteContentUpdated={onSiteContentUpdated}
          />
        </p>
      </div>

      <div className="card">
        <h3>
          <InlineEditor
            isAdmin={isAdmin}
            value={artwork_holds_title}
            fieldKey="artwork_holds_title"
            multiline={false}
            siteContent={siteContent}
            onSiteContentUpdated={onSiteContentUpdated}
          />
        </h3>
        <ul>
          <li>
            <InlineEditor
              isAdmin={isAdmin}
              value={artwork_holds_item_1}
              fieldKey="artwork_holds_item_1"
              multiline={true}
              siteContent={siteContent}
              onSiteContentUpdated={onSiteContentUpdated}
            />
          </li>
          <li>
            <InlineEditor
              isAdmin={isAdmin}
              value={artwork_holds_item_2}
              fieldKey="artwork_holds_item_2"
              multiline={true}
              siteContent={siteContent}
              onSiteContentUpdated={onSiteContentUpdated}
            />
          </li>
          <li>
            <InlineEditor
              isAdmin={isAdmin}
              value={artwork_holds_item_3}
              fieldKey="artwork_holds_item_3"
              multiline={true}
              siteContent={siteContent}
              onSiteContentUpdated={onSiteContentUpdated}
            />
          </li>
          <li>
            <InlineEditor
              isAdmin={isAdmin}
              value={artwork_holds_item_4}
              fieldKey="artwork_holds_item_4"
              multiline={true}
              siteContent={siteContent}
              onSiteContentUpdated={onSiteContentUpdated}
            />
          </li>
          <li>
            <InlineEditor
              isAdmin={isAdmin}
              value={artwork_holds_item_5}
              fieldKey="artwork_holds_item_5"
              multiline={true}
              siteContent={siteContent}
              onSiteContentUpdated={onSiteContentUpdated}
            />
          </li>
        </ul>
      </div>
    </div>
  );
}
