alter table if exists public.site_settings
  add column if not exists content jsonb not null default '{}'::jsonb;

-- Backfill legacy columns into content JSON so central manager can edit them in one place.
update public.site_settings
set content = coalesce(content, '{}'::jsonb)
  || jsonb_strip_nulls(
    jsonb_build_object(
      'home_hero_kicker', home_hero_kicker,
      'home_hero_title', home_hero_title,
      'home_hero_lead', home_hero_lead,
      'home_hero_description', home_hero_description,
      'home_mission_label', home_mission_label,
      'home_mission_text', home_mission_text,
      'merchandise_hero_kicker', merchandise_hero_kicker,
      'merchandise_hero_title', merchandise_hero_title,
      'merchandise_hero_lead', merchandise_hero_lead,
      'merchandise_hero_description', merchandise_hero_description,
      'merchandise_mission_label', merchandise_mission_label,
      'merchandise_mission_text', merchandise_mission_text
    )
  );
