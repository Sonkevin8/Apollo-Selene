import { supabase } from './supabaseClient';

export const SITE_CONTENT_TABLE = 'site_settings';
export const SITE_CONTENT_ID = 'hero';

export const getSiteContent = async () => {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.from(SITE_CONTENT_TABLE).select('*').eq('id', SITE_CONTENT_ID).maybeSingle();
  if (error) {
    console.error('Failed to load site content:', error.message);
    return null;
  }
  return data;
};

export const saveSiteContent = async (content) => {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }
  const payload = { id: SITE_CONTENT_ID, ...content };
  const { data, error } = await supabase.from(SITE_CONTENT_TABLE).upsert(payload, { onConflict: 'id' }).select().maybeSingle();
  return { data, error };
};
