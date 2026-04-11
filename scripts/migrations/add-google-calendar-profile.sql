-- Google Calendar integration (refresh token + optional IANA timezone for event times).
-- Run in Supabase SQL Editor after reviewing security (server-side storage only).

alter table public.profiles
  add column if not exists google_calendar_refresh_token text,
  add column if not exists google_calendar_connected_at timestamptz,
  add column if not exists calendar_time_zone text;

comment on column public.profiles.google_calendar_refresh_token is 'OAuth refresh token for Google Calendar API; never expose to client.';
