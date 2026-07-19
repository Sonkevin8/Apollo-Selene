-- Add per-poster Instagram tag metadata aligned by poster index.
-- Each element stores a comma-separated list of handles for the corresponding poster.

alter table public.events
  add column if not exists poster_instagram_tags text[] not null default '{}';
