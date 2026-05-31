-- Migration: Add reference_number to event_ticket_purchases
alter table public.event_ticket_purchases add column if not exists reference_number text unique;
create index if not exists event_ticket_purchases_reference_number_idx on public.event_ticket_purchases(reference_number);