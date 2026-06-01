-- Apollo Selene user content schema
-- Adds user ownership + pricing to gallery_items,
-- and creates the mixtape_uploads tracking table.

-- ───────────────────────────────────────────────
-- gallery_items: link to profile owner + optional price
-- ───────────────────────────────────────────────
alter table public.gallery_items
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists price   numeric(10, 2) default null;

create index if not exists gallery_items_user_id_idx on public.gallery_items (user_id);

-- Allow the owning user to update/delete their own items
drop policy if exists "gallery_items_update_own" on public.gallery_items;
create policy "gallery_items_update_own"
  on public.gallery_items for update
  using (auth.uid() = user_id);

drop policy if exists "gallery_items_delete_own" on public.gallery_items;
create policy "gallery_items_delete_own"
  on public.gallery_items for delete
  using (auth.uid() = user_id);

drop policy if exists "gallery_items_insert_auth" on public.gallery_items;
create policy "gallery_items_insert_auth"
  on public.gallery_items for insert
  with check (auth.role() = 'authenticated');

-- ───────────────────────────────────────────────
-- mixtape_uploads: track every uploaded MP3
-- ───────────────────────────────────────────────
create table if not exists public.mixtape_uploads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text,
  description text,
  file_url    text not null,
  price       numeric(10, 2) default null,
  created_at  timestamptz not null default now()
);

create index if not exists mixtape_uploads_user_id_idx on public.mixtape_uploads (user_id);

alter table public.mixtape_uploads enable row level security;

drop policy if exists "mixtape_uploads_select_all" on public.mixtape_uploads;
create policy "mixtape_uploads_select_all"
  on public.mixtape_uploads for select
  using (true);

drop policy if exists "mixtape_uploads_insert_own" on public.mixtape_uploads;
create policy "mixtape_uploads_insert_own"
  on public.mixtape_uploads for insert
  with check (auth.uid() = user_id);

drop policy if exists "mixtape_uploads_delete_own" on public.mixtape_uploads;
create policy "mixtape_uploads_delete_own"
  on public.mixtape_uploads for delete
  using (auth.uid() = user_id);
