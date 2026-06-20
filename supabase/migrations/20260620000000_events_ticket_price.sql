-- Add ticket_price column to events table
alter table events
  add column if not exists ticket_price numeric(10,2) default null;
