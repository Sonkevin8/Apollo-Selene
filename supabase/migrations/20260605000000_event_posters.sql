-- Add posters array column to events table.
-- Stores up to 4 poster image URLs per event.
-- The legacy `poster` (single text) column is kept for backwards compatibility.

alter table public.events
  add column if not exists posters text[] not null default '{}';
