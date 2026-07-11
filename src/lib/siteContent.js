import { supabase } from './supabaseClient';

export const SITE_CONTENT_TABLE = 'site_settings';
export const SITE_CONTENT_ID = 'hero';

const LEGACY_COLUMNS = [
  'home_hero_kicker',
  'home_hero_title',
  'home_hero_lead',
  'home_hero_description',
  'home_mission_label',
  'home_mission_text',
  'merchandise_hero_kicker',
  'merchandise_hero_title',
  'merchandise_hero_lead',
  'merchandise_hero_description',
  'merchandise_mission_label',
  'merchandise_mission_text',
];

const RESERVED_KEYS = new Set(['id', 'created_at', 'updated_at', 'content']);

const buildLegacyPayload = (content = {}) => {
  const payload = {};
  LEGACY_COLUMNS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(content, key)) {
      payload[key] = content[key];
    }
  });
  return payload;
};

const buildDynamicPayload = (content = {}) => {
  const payload = {};
  Object.entries(content).forEach(([key, value]) => {
    if (!LEGACY_COLUMNS.includes(key) && !RESERVED_KEYS.has(key)) {
      payload[key] = value;
    }
  });
  return payload;
};

export const getSiteContent = async () => {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.from(SITE_CONTENT_TABLE).select('*').eq('id', SITE_CONTENT_ID).maybeSingle();
  if (error) {
    console.error('Failed to load site content:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  // New schema stores dynamic keys under content JSON; merge for read compatibility.
  const merged = {
    ...data,
    ...(data.content && typeof data.content === 'object' ? data.content : {}),
  };
  delete merged.content;
  return merged;
};

export const saveSiteContent = async (content) => {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const legacyPayload = buildLegacyPayload(content);
  const dynamicPayload = buildDynamicPayload(content);
  const now = new Date().toISOString();

  // Preferred path: save legacy columns + dynamic keys in content JSON.
  const primaryPayload = {
    id: SITE_CONTENT_ID,
    ...legacyPayload,
    content: dynamicPayload,
    updated_at: now,
  };

  const primary = await supabase
    .from(SITE_CONTENT_TABLE)
    .upsert(primaryPayload, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (!primary.error) {
    return {
      data: {
        ...(primary.data || {}),
        ...(primary.data?.content && typeof primary.data.content === 'object' ? primary.data.content : {}),
      },
      error: null,
    };
  }

  const contentColumnMissing = /column\s+"?content"?\s+does\s+not\s+exist/i.test(primary.error.message || '');
  if (!contentColumnMissing) {
    return primary;
  }

  // Fallback path for older DB schema: save only legacy columns so current edits don't fully break.
  const fallbackPayload = {
    id: SITE_CONTENT_ID,
    ...legacyPayload,
    updated_at: now,
  };

  const fallback = await supabase
    .from(SITE_CONTENT_TABLE)
    .upsert(fallbackPayload, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (fallback.error) {
    return fallback;
  }

  if (Object.keys(dynamicPayload).length > 0) {
    return {
      data: fallback.data,
      error: new Error('New content fields require latest Supabase migration. Please run migrations and try save again.'),
    };
  }

  return { data: fallback.data, error: null };
};
