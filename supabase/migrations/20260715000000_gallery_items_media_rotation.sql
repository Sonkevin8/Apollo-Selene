-- Adds per-media orientation metadata so portrait videos can be displayed correctly.

alter table public.gallery_items
  add column if not exists media_rotation smallint not null default 0;

update public.gallery_items
set media_rotation = 0
where media_rotation is null;

alter table public.gallery_items
  drop constraint if exists gallery_items_media_rotation_check;

alter table public.gallery_items
  add constraint gallery_items_media_rotation_check
  check (media_rotation in (0, 90, 180, 270));
