import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET_NAME = 'ember-room-uploads';
const TABLE_NAME = 'ember_room_submissions';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];
const MAX_FILE_BYTES = 30 * 1024 * 1024;

const normalizeType = (mimeType) => {
  if (IMAGE_TYPES.includes(mimeType)) {
    return 'photograph';
  }

  if (AUDIO_TYPES.includes(mimeType)) {
    return 'music';
  }

  return 'drawing';
};

export const validateUpload = ({ title, type, file }) => {
  if (!title || !title.trim()) {
    return 'Please add a title.';
  }

  if (!type) {
    return 'Please choose an artwork type.';
  }

  if (!file) {
    return 'Please choose a file to upload.';
  }

  if (file.size > MAX_FILE_BYTES) {
    return 'File is too large. Keep uploads under 30MB.';
  }

  return null;
};

export const submitArtworkUpload = async ({ title, type, description, file }) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your env file.');
  }

  const extension = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const detectedType = normalizeType(file.type);
  const folder = type || detectedType;
  const objectPath = `${folder}/${timestamp}-${safeTitle || 'upload'}.${extension}`;

  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(objectPath);

  const payload = {
    title: title.trim(),
    type: type || detectedType,
    description: description?.trim() || null,
    file_name: file.name,
    file_path: objectPath,
    file_url: publicData.publicUrl,
    mime_type: file.type || null,
    file_size: file.size,
    status: 'pending',
  };

  const { error: dbError } = await supabase.from(TABLE_NAME).insert(payload);

  if (dbError) {
    throw new Error(dbError.message);
  }

  return payload;
};

export const fetchPublicSubmissions = async ({ limit = 12 } = {}) => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => {
    const storageUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(item.file_path || '').data.publicUrl;

    return {
      ...item,
      file_url: item.file_url || storageUrl || '',
    };
  });
};
