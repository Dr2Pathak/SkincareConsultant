-- Add per-day routine assignment for the calendar (date -> routine_id).
-- Run in Supabase SQL Editor after profiles table exists.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS schedule_overrides jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.schedule_overrides IS 'Map of date (YYYY-MM-DD) to routine id for calendar per-day assignment.';
