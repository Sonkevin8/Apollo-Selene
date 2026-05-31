-- Apollo Selene Mixtape Exchange schema
-- Run this in Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- citext can be useful later for case-insensitive columns; current schema
-- uses a functional unique index for usernames.
create extension if not exists citext;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  city text,
  username text unique,
  bio text,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'label')),
  subscription_status text,
  stripe_customer_id text unique,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists plan_tier text not null default 'free';
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists stripe_customer_id text unique;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists created_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_plan_tier_check;
alter table public.profiles
  add constraint profiles_plan_tier_check
  check (plan_tier in ('free', 'pro', 'label'));

create or replace function public.normalize_profile_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is not null then
    new.username = lower(trim(new.username));
    if new.username = '' then
      new.username = null;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  return new;
end;
$$;

create or replace function public.handle_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

drop trigger if exists on_profile_updated_at on public.profiles;

create trigger on_profile_updated_at
before update on public.profiles
for each row execute procedure public.handle_profile_updated_at();

drop trigger if exists on_profile_username_normalize on public.profiles;

create trigger on_profile_username_normalize
before insert or update of username on public.profiles
for each row execute procedure public.normalize_profile_username();

-- Backfill existing rows to match the normalized username rules.
update public.profiles
set username = nullif(lower(trim(username)), '')
where username is not null
  and (
    trim(username) = ''
    or username <> lower(trim(username))
  );

alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles
  add constraint profiles_username_format_check
  check (
    username is null
    or (
      char_length(username) between 3 and 24
      and username ~ '^[a-z0-9_]+$'
      and username !~ '__'
      and username !~ '^_'
      and username !~ '_$'
    )
  ) not valid;

-- One-shot collision cleanup for case-insensitive usernames.
-- Keeps the oldest profile row for each username and clears the rest.
-- This also returns a report of affected profiles in SQL editor results.
with ranked_usernames as (
  select
    id,
    email,
    username,
    lower(username) as username_key,
    row_number() over (
      partition by lower(username)
      order by created_at asc nulls last, id asc
    ) as rn,
    first_value(id) over (
      partition by lower(username)
      order by created_at asc nulls last, id asc
    ) as kept_profile_id
  from public.profiles
  where username is not null and username <> ''
),
to_clear as (
  select
    id,
    email,
    username,
    username_key,
    kept_profile_id
  from ranked_usernames
  where rn > 1
),
cleared as (
  update public.profiles p
  set username = null
  from to_clear c
  where p.id = c.id
  returning p.id
)
select
  c.username_key as collided_username,
  c.kept_profile_id,
  c.id as cleared_profile_id,
  c.email as cleared_profile_email,
  c.username as previous_username
from to_clear c
join cleared cl on cl.id = c.id
order by c.username_key, c.id;

drop index if exists profiles_username_ci_unique_idx;
create unique index profiles_username_ci_unique_idx
  on public.profiles (lower(username))
  where username is not null and username <> '';

create table if not exists public.mixtape_exchanges (
  id bigint generated by default as identity primary key,
  created_at timestamptz not null default now(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  cassette_title text not null,
  set_style text,
  note text,
  sender_hub text,
  receiver_hub text,
  sender_lat double precision not null,
  sender_lng double precision not null,
  receiver_lat double precision not null,
  receiver_lng double precision not null,
  sender_airport_code text,
  sender_airport_name text,
  sender_airport_lat double precision,
  sender_airport_lng double precision,
  receiver_airport_code text,
  receiver_airport_name text,
  receiver_airport_lat double precision,
  receiver_airport_lng double precision,
  sender_address text,
  sender_address_lat double precision,
  sender_address_lng double precision,
  receiver_address text,
  receiver_address_lat double precision,
  receiver_address_lng double precision,
  flight_distance_km double precision,
  flight_duration_minutes integer,
  sender_vehicle_minutes integer,
  receiver_vehicle_minutes integer,
  total_vehicle_minutes integer,
  total_delivery_minutes integer,
  altitude double precision not null default 0.25,
  duration_seconds integer not null default 24,
  offset_seconds integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'in_flight', 'delivered', 'cancelled'))
);

alter table public.mixtape_exchanges add column if not exists sender_airport_code text;
alter table public.mixtape_exchanges add column if not exists sender_airport_name text;
alter table public.mixtape_exchanges add column if not exists sender_airport_lat double precision;
alter table public.mixtape_exchanges add column if not exists sender_airport_lng double precision;
alter table public.mixtape_exchanges add column if not exists receiver_airport_code text;
alter table public.mixtape_exchanges add column if not exists receiver_airport_name text;
alter table public.mixtape_exchanges add column if not exists receiver_airport_lat double precision;
alter table public.mixtape_exchanges add column if not exists receiver_airport_lng double precision;
alter table public.mixtape_exchanges add column if not exists sender_address text;
alter table public.mixtape_exchanges add column if not exists sender_address_lat double precision;
alter table public.mixtape_exchanges add column if not exists sender_address_lng double precision;
alter table public.mixtape_exchanges add column if not exists receiver_address text;
alter table public.mixtape_exchanges add column if not exists receiver_address_lat double precision;
alter table public.mixtape_exchanges add column if not exists receiver_address_lng double precision;
alter table public.mixtape_exchanges add column if not exists flight_distance_km double precision;
alter table public.mixtape_exchanges add column if not exists flight_duration_minutes integer;
alter table public.mixtape_exchanges add column if not exists sender_vehicle_minutes integer;
alter table public.mixtape_exchanges add column if not exists receiver_vehicle_minutes integer;
alter table public.mixtape_exchanges add column if not exists total_vehicle_minutes integer;
alter table public.mixtape_exchanges add column if not exists total_delivery_minutes integer;

update public.mixtape_exchanges
set
  sender_airport_lat = coalesce(sender_airport_lat, sender_lat),
  sender_airport_lng = coalesce(sender_airport_lng, sender_lng),
  receiver_airport_lat = coalesce(receiver_airport_lat, receiver_lat),
  receiver_airport_lng = coalesce(receiver_airport_lng, receiver_lng),
  sender_airport_name = coalesce(sender_airport_name, sender_hub),
  receiver_airport_name = coalesce(receiver_airport_name, receiver_hub);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_sender_lat_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_sender_lat_check
  check (sender_lat between -90 and 90);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_sender_lng_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_sender_lng_check
  check (sender_lng between -180 and 180);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_receiver_lat_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_receiver_lat_check
  check (receiver_lat between -90 and 90);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_receiver_lng_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_receiver_lng_check
  check (receiver_lng between -180 and 180);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_duration_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_duration_check
  check (duration_seconds > 0);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_sender_airport_lat_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_sender_airport_lat_check
  check (sender_airport_lat is null or sender_airport_lat between -90 and 90);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_sender_airport_lng_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_sender_airport_lng_check
  check (sender_airport_lng is null or sender_airport_lng between -180 and 180);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_receiver_airport_lat_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_receiver_airport_lat_check
  check (receiver_airport_lat is null or receiver_airport_lat between -90 and 90);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_receiver_airport_lng_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_receiver_airport_lng_check
  check (receiver_airport_lng is null or receiver_airport_lng between -180 and 180);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_sender_address_lat_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_sender_address_lat_check
  check (sender_address_lat is null or sender_address_lat between -90 and 90);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_sender_address_lng_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_sender_address_lng_check
  check (sender_address_lng is null or sender_address_lng between -180 and 180);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_receiver_address_lat_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_receiver_address_lat_check
  check (receiver_address_lat is null or receiver_address_lat between -90 and 90);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_receiver_address_lng_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_receiver_address_lng_check
  check (receiver_address_lng is null or receiver_address_lng between -180 and 180);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_flight_duration_minutes_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_flight_duration_minutes_check
  check (flight_duration_minutes is null or flight_duration_minutes >= 0);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_sender_vehicle_minutes_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_sender_vehicle_minutes_check
  check (sender_vehicle_minutes is null or sender_vehicle_minutes >= 0);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_receiver_vehicle_minutes_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_receiver_vehicle_minutes_check
  check (receiver_vehicle_minutes is null or receiver_vehicle_minutes >= 0);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_total_vehicle_minutes_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_total_vehicle_minutes_check
  check (total_vehicle_minutes is null or total_vehicle_minutes >= 0);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_total_delivery_minutes_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_total_delivery_minutes_check
  check (total_delivery_minutes is null or total_delivery_minutes >= 0);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_offset_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_offset_check
  check (offset_seconds >= 0);

alter table public.mixtape_exchanges drop constraint if exists mixtape_exchanges_altitude_check;
alter table public.mixtape_exchanges
  add constraint mixtape_exchanges_altitude_check
  check (altitude >= 0 and altitude <= 2);

create table if not exists public.mixtape_invites (
  id bigint generated by default as identity primary key,
  created_at timestamptz not null default now(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  invite_email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'accepted', 'failed'))
);

create table if not exists public.event_ticket_purchases (
  id bigint generated by default as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  event_id text not null,
  event_title text,
  event_date text,
  event_location text,
  purchaser_email text,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_total integer,
  currency text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  raw_event jsonb
);

create index if not exists mixtape_exchanges_sender_idx on public.mixtape_exchanges(sender_id);
create index if not exists mixtape_exchanges_receiver_idx on public.mixtape_exchanges(receiver_id);
create index if not exists mixtape_exchanges_status_idx on public.mixtape_exchanges(status);
create index if not exists mixtape_invites_sender_idx on public.mixtape_invites(sender_id);
create index if not exists mixtape_invites_email_idx on public.mixtape_invites(invite_email);
create index if not exists event_ticket_purchases_user_idx on public.event_ticket_purchases(user_id);
create index if not exists event_ticket_purchases_event_idx on public.event_ticket_purchases(event_id);
create index if not exists event_ticket_purchases_status_idx on public.event_ticket_purchases(payment_status);

alter table public.profiles enable row level security;
alter table public.mixtape_exchanges enable row level security;
alter table public.mixtape_invites enable row level security;
alter table public.event_ticket_purchases enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_authenticated" on public.profiles;

create policy "profiles_select_authenticated"
on public.profiles
for select
using (auth.role() = 'authenticated');

drop policy if exists "profiles_insert_self" on public.profiles;

create policy "profiles_insert_self"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_update_self"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Mixtape policies
drop policy if exists "mixtape_select_participants" on public.mixtape_exchanges;

create policy "mixtape_select_participants"
on public.mixtape_exchanges
for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "mixtape_insert_sender" on public.mixtape_exchanges;

create policy "mixtape_insert_sender"
on public.mixtape_exchanges
for insert
with check (auth.uid() = sender_id);

drop policy if exists "mixtape_update_participants" on public.mixtape_exchanges;

create policy "mixtape_update_participants"
on public.mixtape_exchanges
for update
using (auth.uid() = sender_id or auth.uid() = receiver_id)
with check (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "mixtape_delete_sender" on public.mixtape_exchanges;

create policy "mixtape_delete_sender"
on public.mixtape_exchanges
for delete
using (auth.uid() = sender_id);

-- Invite policies
drop policy if exists "mixtape_invites_insert_sender" on public.mixtape_invites;

create policy "mixtape_invites_insert_sender"
on public.mixtape_invites
for insert
with check (auth.uid() = sender_id);

drop policy if exists "mixtape_invites_select_sender" on public.mixtape_invites;

create policy "mixtape_invites_select_sender"
on public.mixtape_invites
for select
using (auth.uid() = sender_id);

drop policy if exists "mixtape_invites_update_sender" on public.mixtape_invites;

create policy "mixtape_invites_update_sender"
on public.mixtape_invites
for update
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

drop policy if exists "mixtape_invites_delete_sender" on public.mixtape_invites;

create policy "mixtape_invites_delete_sender"
on public.mixtape_invites
for delete
using (auth.uid() = sender_id);

-- Ticket purchase policies
drop policy if exists "ticket_purchases_select_owner" on public.event_ticket_purchases;

create policy "ticket_purchases_select_owner"
on public.event_ticket_purchases
for select
using (auth.uid() = user_id);

-- Public-safe route feed for the Earth globe.
-- Exposes only non-sensitive delivery route fields.
create or replace view public.mixtape_routes_public as
select
  id,
  created_at,
  sender_airport_code,
  sender_airport_name,
  sender_airport_lat,
  sender_airport_lng,
  receiver_airport_code,
  receiver_airport_name,
  receiver_airport_lat,
  receiver_airport_lng,
  sender_address,
  receiver_address,
  flight_distance_km,
  flight_duration_minutes,
  sender_vehicle_minutes,
  receiver_vehicle_minutes,
  total_vehicle_minutes,
  total_delivery_minutes,
  altitude,
  duration_seconds,
  offset_seconds,
  status
from public.mixtape_exchanges
where status in ('in_flight', 'delivered');

grant select on public.mixtape_routes_public to anon;
grant select on public.mixtape_routes_public to authenticated;

-- Optional: Earth page can point to this table directly with VITE_DELIVERY_TABLE=mixtape_exchanges.
