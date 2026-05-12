import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { fetchPublicSubmissions, submitArtworkUpload, validateUpload } from '../lib/emberRoomUploads';

const EmberRoom = () => {
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
      ? 'Supabase is connected. New uploads are now saved to storage and your submissions table.'
      : 'Uploads are in preview mode until Supabase keys are added in your env file.';
  }, []);

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
        <p className="section-kicker">Public Creative Hub</p>
        <h1>Ember Room</h1>
        <p className="hero-lead">
          Ember Room is now a public space for the community to share creative work in one place.
        </p>
        <p>
          Upload music, drawings, and photographs so visitors can explore what everyone is making. The upload experience is being prepared for full storage support.
        </p>
        <ul className="ember-room-highlights">
          <li>Upload artwork in three formats: music, drawings, and photos.</li>
          <li>Open to everyone, with no invite required.</li>
          <li>Submissions are built for Supabase storage and a public gallery feed.</li>
        </ul>
        <form className="ember-upload-form" onSubmit={handleSubmit}>
          <label htmlFor="ember-title">
            Title
            <input
              id="ember-title"
              name="title"
              type="text"
              placeholder="Name your piece"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label htmlFor="ember-type">
            Artwork Type
            <select
              id="ember-type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
            >
              <option value="drawing">Drawing</option>
              <option value="photograph">Photograph</option>
              <option value="music">Music</option>
            </select>
          </label>
          <label htmlFor="ember-file">
            File Upload
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
            Description
            <textarea
              id="ember-description"
              name="description"
              placeholder="Tell people about your work"
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
            {isSubmitting ? 'Uploading...' : 'Submit Artwork'}
          </button>
        </form>
        <section className="ember-gallery" aria-live="polite">
          <div className="ember-gallery-header">
            <h2>Community Uploads</h2>
            <button type="button" className="button-link secondary-link" onClick={loadGallery} disabled={galleryLoading}>
              {galleryLoading ? 'Refreshing...' : 'Refresh Feed'}
            </button>
          </div>
          {!isSupabaseConfigured && (
            <p className="ember-upload-note">
              Add Supabase keys to show the live community feed.
            </p>
          )}
          {galleryError && <p className="ember-upload-feedback ember-upload-feedback--error">{galleryError}</p>}
          {galleryLoading && <p className="ember-upload-note">Loading community submissions...</p>}
          {!galleryLoading && isSupabaseConfigured && !galleryError && galleryItems.length === 0 && (
            <p className="ember-upload-note">No uploads yet. Be the first to share your art.</p>
          )}
          {!galleryLoading && galleryItems.length > 0 && (
            <div className="ember-gallery-grid">
              {galleryItems.map((item) => renderGalleryCard(item))}
            </div>
          )}
        </section>
        <div className="hero-actions">
          <Link to="/events" className="button-link primary-link">Back to Events</Link>
          <Link to="/" className="button-link secondary-link">Return Home</Link>
        </div>
      </div>
    </div>
  );
};

export default EmberRoom;