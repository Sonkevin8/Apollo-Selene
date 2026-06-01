-- Apollo Selene Gallery schema
-- Creates the gallery_items table and storage bucket with RLS policies.

-- ───────────────────────────────────────────────
-- Table
-- ───────────────────────────────────────────────
create table if not exists public.gallery_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  artist      text,
  description text,
  medium      text,
  year        text,
  story       text,
  image_url   text,
  created_at  timestamptz not null default now()
);

-- Everyone can read gallery items
alter table public.gallery_items enable row level security;

drop policy if exists "gallery_items_select_all" on public.gallery_items;
create policy "gallery_items_select_all"
  on public.gallery_items for select
  using (true);

-- No authenticated insert/update/delete via RLS — admin writes happen
-- through the service-role key or are managed manually in the dashboard.
-- If you want to allow the admin Supabase user to write, add policies here.

-- ───────────────────────────────────────────────
-- Storage bucket
-- ───────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "gallery_storage_select_all" on storage.objects;
create policy "gallery_storage_select_all"
  on storage.objects for select
  using (bucket_id = 'gallery');

-- Authenticated upload (admin logs in via Supabase auth to upload)
drop policy if exists "gallery_storage_insert_auth" on storage.objects;
create policy "gallery_storage_insert_auth"
  on storage.objects for insert
  with check (bucket_id = 'gallery' and auth.role() = 'authenticated');
