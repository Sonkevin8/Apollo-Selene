-- Adds event metadata to gallery_items for completed event tracking.
alter table if exists public.gallery_items
  add column if not exists event_id text;

alter table if exists public.gallery_items
  add column if not exists event_date text;

alter table if exists public.gallery_items
  add column if not exists event_time text;

alter table if exists public.gallery_items
  add column if not exists event_location text;
