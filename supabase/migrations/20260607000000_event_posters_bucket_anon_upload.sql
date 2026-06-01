-- Fix: admin uses localStorage auth (not Supabase auth), so uploads arrive as anon role.
-- Drop the authenticated-only insert policy and replace with one that allows anon + authenticated.
drop policy if exists "event-posters authenticated upload" on storage.objects;
drop policy if exists "event-posters authenticated delete" on storage.objects;

create policy "event-posters upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'event-posters');

create policy "event-posters delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'event-posters');
