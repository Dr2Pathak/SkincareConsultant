-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
-- Creates tables for profiles, routines, and products.

-- Profiles: one per auth user (id = auth.uid())
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  skin_types text[] default '{}',
  concerns text[] default '{}',
  avoid_list text[] default '{}',
  tolerance text default 'medium' check (tolerance in ('low', 'medium', 'high')),
  schedule_overrides jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Routines: AM/PM steps per user
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  am jsonb default '[]',
  pm jsonb default '[]',
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Products: catalog (loaded from pipeline output)
create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text not null,
  inci_list jsonb not null default '[]',
  category text,
  description text,
  updated_at timestamptz default now()
);

-- Optional: RLS so users only see their own profile/routine
alter table public.profiles enable row level security;
alter table public.routines enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can read own routine" on public.routines for select using (auth.uid() = user_id);
create policy "Users can update own routine" on public.routines for update using (auth.uid() = user_id);
create policy "Users can insert own routine" on public.routines for insert with check (auth.uid() = user_id);

-- Products: public read (no RLS or allow all)
alter table public.products enable row level security;
create policy "Products are readable by all" on public.products for select using (true);

-- Index for product search
create index if not exists products_name_gin on public.products using gin (to_tsvector('english', name));
create index if not exists products_brand_idx on public.products (brand);
