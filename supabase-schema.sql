-- Run this in the Supabase SQL editor

create table properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  address text not null,
  listing_text text not null,
  overall_score integer not null check (overall_score between 0 and 100),
  subscores jsonb not null default '[]',
  verdict text not null default '',
  bull_case text not null default '',
  bear_case text not null default '',
  created_at timestamptz not null default now()
);

-- Row-level security: users can only see their own properties
alter table properties enable row level security;

create policy "Users can read own properties"
  on properties for select
  using (auth.uid() = user_id);

create policy "Users can insert own properties"
  on properties for insert
  with check (auth.uid() = user_id);
