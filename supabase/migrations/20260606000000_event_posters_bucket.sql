-- Create the event-posters storage bucket (public read, admin write)
insert into storage.buckets (id, name, public)
values ('event-posters', 'event-posters', true)
on conflict (id) do nothing;

-- Allow anyone to read files in the bucket
create policy "event-posters public read"
  on storage.objects for select
  using (bucket_id = 'event-posters');

-- Allow authenticated users to upload (admin-only in practice via app logic)
create policy "event-posters authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-posters');

-- Allow authenticated users to delete their own uploads
create policy "event-posters authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-posters');
