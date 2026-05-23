-- Align live databases that were created before timestamp columns were added.

alter table public.organisations
  add column if not exists created_at timestamptz not null default now();

alter table public.organisations
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();
