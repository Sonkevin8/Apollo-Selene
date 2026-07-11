import React, { useEffect, useMemo, useState } from 'react';
import InlineEditor from '../components/InlineEditor';
import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { fetchPublicSubmissions, submitArtworkUpload, validateUpload } from '../lib/emberRoomUploads';
import { isAdminUiEnabled } from '../lib/adminAccess';

const EmberRoom = ({ siteContent = {}, onSiteContentUpdated }) => {
  const isAdmin = isAdminUiEnabled();
  const {
    ember_kicker = 'Public Creative Hub',
    ember_title = 'Ember Room',
    ember_lead = 'Ember Room is now a public space for the community to share creative work in one place.',
    ember_description = 'Upload music, drawings, and photographs so visitors can explore what everyone is making. The upload experience is being prepared for full storage support.',
    ember_highlight_1 = 'Upload artwork in three formats: music, drawings, and photos.',
    ember_highlight_2 = 'Open to everyone, with no invite required.',
    ember_highlight_3 = 'Submissions are built for Supabase storage and a public gallery feed.',
    ember_form_label_title = 'Title',
    ember_form_label_type = 'Artwork Type',
    ember_form_label_file = 'File Upload',
    ember_form_label_description = 'Description',
    ember_ph_title = 'Name your piece',
    ember_ph_description = 'Tell people about your work',
    ember_option_drawing = 'Drawing',
    ember_option_photo = 'Photograph',
    ember_option_music = 'Music',
    ember_note_connected = 'Supabase is connected. New uploads are now saved to storage and your submissions table.',
    ember_note_preview = 'Uploads are in preview mode until Supabase keys are added in your env file.',
    ember_btn_submit = 'Submit Artwork',
    ember_gallery_title = 'Community Uploads',
    ember_btn_refresh = 'Refresh Feed',
    ember_note_missing_keys = 'Add Supabase keys to show the live community feed.',
    ember_note_loading = 'Loading community submissions...',
    ember_note_empty = 'No uploads yet. Be the first to share your art.',
    ember_btn_back_events = 'Back to Events',
    ember_btn_back_home = 'Return Home',
  } = siteContent;
  const [title, setTitle] = useState('');
  const [type, setType] = useState('drawing');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(isSupabaseConfigured);
  const [galleryError, setGalleryError] = useState('');

  const integrationNote = useMemo(() => {
    return isSupabaseConfigured
      ? ember_note_connected
      : ember_note_preview;
  }, [ember_note_connected, ember_note_preview]);

  const loadGallery = async () => {
    if (!isSupabaseConfigured) {
      setGalleryItems([]);
      setGalleryError('');
      return;
    }

    try {
      setGalleryLoading(true);
      setGalleryError('');
      const submissions = await fetchPublicSubmissions({ limit: 12 });
      setGalleryItems(submissions);
    } catch (error) {
      setGalleryError(error.message || 'Could not load gallery right now.');
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isUnmounted = false;

    const bootstrapGallery = async () => {
      try {
        const submissions = await fetchPublicSubmissions({ limit: 12 });
        if (!isUnmounted) {
          setGalleryItems(submissions);
        }
      } catch (error) {
        if (!isUnmounted) {
          setGalleryError(error.message || 'Could not load gallery right now.');
        }
      } finally {
        if (!isUnmounted) {
          setGalleryLoading(false);
        }
      }
    };

    bootstrapGallery();

    return () => {
      isUnmounted = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError('');
    setFormSuccess('');

    const validationError = validateUpload({ title, type, file });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!isSupabaseConfigured) {
      setFormError('Supabase is not configured yet. Add keys from .env.example to enable uploads.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitArtworkUpload({
        title,
        type,
        description,
        file,
      });

      setFormSuccess('Artwork submitted successfully. It is now stored and ready for moderation.');
      setTitle('');
      setType('drawing');
      setDescription('');
      setFile(null);
      event.target.reset();
      loadGallery();
    } catch (error) {
      setFormError(error.message || 'Could not upload right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGalleryCard = (item) => {
    const key = item.id || `${item.file_path}-${item.created_at}`;
    const mediaType = item.type || 'drawing';
    const createdLabel = item.created_at ? new Date(item.created_at).toLocaleDateString() : null;

    return (
      <article key={key} className="ember-gallery-card">
        <div className="ember-gallery-media">
          {mediaType === 'music' ? (
            <audio controls preload="none" src={item.file_url} className="ember-gallery-audio">
              Your browser does not support audio playback.
            </audio>
          ) : (
            <img
              src={item.file_url}
              alt={item.title || 'Community submission'}
              loading="lazy"
              className="ember-gallery-image"
            />
          )}
        </div>
        <div className="ember-gallery-meta">
          <p className="ember-gallery-type">{mediaType}</p>
          <h3>{item.title || 'Untitled'}</h3>
          {item.description && <p>{item.description}</p>}
          {createdLabel && <p className="ember-gallery-date">Submitted {createdLabel}</p>}
        </div>
      </article>
    );
  };

  return (
    <div className="content-section ember-room-page">
      <AnimatedBackground className="ember-room-canvas" />
      <div className="ember-room-overlay card">
        <p className="section-kicker"><InlineEditor isAdmin={isAdmin} value={ember_kicker} fieldKey="ember_kicker" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
        <h1><InlineEditor isAdmin={isAdmin} value={ember_title} fieldKey="ember_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></h1>
        <p className="hero-lead">
          <InlineEditor isAdmin={isAdmin} value={ember_lead} fieldKey="ember_lead" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
        </p>
        <p>
          <InlineEditor isAdmin={isAdmin} value={ember_description} fieldKey="ember_description" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} />
        </p>
        <ul className="ember-room-highlights">
          <li><InlineEditor isAdmin={isAdmin} value={ember_highlight_1} fieldKey="ember_highlight_1" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></li>
          <li><InlineEditor isAdmin={isAdmin} value={ember_highlight_2} fieldKey="ember_highlight_2" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></li>
          <li><InlineEditor isAdmin={isAdmin} value={ember_highlight_3} fieldKey="ember_highlight_3" multiline={true} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></li>
        </ul>
        {isAdmin && (
          <div className="card" style={{ marginBottom: '0.75rem' }}>
            <p className="section-kicker" style={{ marginBottom: '0.45rem' }}>Ember labels</p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_form_label_title} fieldKey="ember_form_label_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_form_label_type} fieldKey="ember_form_label_type" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_form_label_file} fieldKey="ember_form_label_file" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_form_label_description} fieldKey="ember_form_label_description" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_ph_title} fieldKey="ember_ph_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_ph_description} fieldKey="ember_ph_description" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_btn_submit} fieldKey="ember_btn_submit" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_gallery_title} fieldKey="ember_gallery_title" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_btn_refresh} fieldKey="ember_btn_refresh" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: '0 0 0.35rem' }}><InlineEditor isAdmin={isAdmin} value={ember_btn_back_events} fieldKey="ember_btn_back_events" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
            <p style={{ margin: 0 }}><InlineEditor isAdmin={isAdmin} value={ember_btn_back_home} fieldKey="ember_btn_back_home" multiline={false} siteContent={siteContent} onSiteContentUpdated={onSiteContentUpdated} /></p>
          </div>
        )}
        <form className="ember-upload-form" onSubmit={handleSubmit}>
          <label htmlFor="ember-title">
            {ember_form_label_title}
            <input
              id="ember-title"
              name="title"
              type="text"
              placeholder={ember_ph_title}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label htmlFor="ember-type">
            {ember_form_label_type}
            <select
              id="ember-type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
            >
              <option value="drawing">{ember_option_drawing}</option>
              <option value="photograph">{ember_option_photo}</option>
              <option value="music">{ember_option_music}</option>
            </select>
          </label>
          <label htmlFor="ember-file">
            {ember_form_label_file}
            <input
              id="ember-file"
              name="file"
              type="file"
              accept="image/*,audio/*"
              required
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <label htmlFor="ember-description">
            {ember_form_label_description}
            <textarea
              id="ember-description"
              name="description"
              placeholder={ember_ph_description}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <p className="ember-upload-note">
            {integrationNote}
          </p>
          {formError && <p className="ember-upload-feedback ember-upload-feedback--error">{formError}</p>}
          {formSuccess && <p className="ember-upload-feedback ember-upload-feedback--success">{formSuccess}</p>}
          <button type="submit" className="button-link primary-link ember-upload-button" disabled={isSubmitting}>
            {isSubmitting ? 'Uploading...' : ember_btn_submit}
          </button>
        </form>
        <section className="ember-gallery" aria-live="polite">
          <div className="ember-gallery-header">
            <h2>{ember_gallery_title}</h2>
            <button type="button" className="button-link secondary-link" onClick={loadGallery} disabled={galleryLoading}>
              {galleryLoading ? 'Refreshing...' : ember_btn_refresh}
            </button>
          </div>
          {!isSupabaseConfigured && (
            <p className="ember-upload-note">
              {ember_note_missing_keys}
            </p>
          )}
          {galleryError && <p className="ember-upload-feedback ember-upload-feedback--error">{galleryError}</p>}
          {galleryLoading && <p className="ember-upload-note">{ember_note_loading}</p>}
          {!galleryLoading && isSupabaseConfigured && !galleryError && galleryItems.length === 0 && (
            <p className="ember-upload-note">{ember_note_empty}</p>
          )}
          {!galleryLoading && galleryItems.length > 0 && (
            <div className="ember-gallery-grid">
              {galleryItems.map((item) => renderGalleryCard(item))}
            </div>
          )}
        </section>
        <div className="hero-actions">
          <Link to="/events" className="button-link primary-link">{ember_btn_back_events}</Link>
          <Link to="/" className="button-link secondary-link">{ember_btn_back_home}</Link>
        </div>
      </div>
    </div>
  );
};

export default EmberRoom;