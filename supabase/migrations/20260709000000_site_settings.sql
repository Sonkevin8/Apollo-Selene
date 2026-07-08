create table if not exists public.site_settings (
  id text primary key,
  home_hero_kicker text,
  home_hero_title text,
  home_hero_lead text,
  home_hero_description text,
  home_mission_label text,
  home_mission_text text,
  merchandise_hero_kicker text,
  merchandise_hero_title text,
  merchandise_hero_lead text,
  merchandise_hero_description text,
  merchandise_mission_label text,
  merchandise_mission_text text,
  updated_at timestamptz not null default now()
);
