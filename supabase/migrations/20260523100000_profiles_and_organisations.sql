-- Organisations and profiles for Quanta auth / tenancy (MVP)

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_organisation_id_idx on public.profiles (organisation_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organisations_set_updated_at
  before update on public.organisations
  for each row
  execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Organisation scope for RLS policies
create or replace function public.current_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id
  from public.profiles
  where id = auth.uid()
$$;

-- Onboarding for new auth users (metadata: full_name, organisation_name)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  org_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'organisation_name'), ''),
    display_name || ' Organisation'
  );

  insert into public.organisations (name)
  values (org_name)
  returning id into new_org_id;

  insert into public.profiles (id, email, full_name, organisation_id, role)
  values (new.id, new.email, display_name, new_org_id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.organisations enable row level security;
alter table public.profiles enable row level security;

-- Organisations: members can read and update their own org
create policy "organisations_select_own"
  on public.organisations
  for select
  to authenticated
  using (id = public.current_organisation_id());

create policy "organisations_update_owner"
  on public.organisations
  for update
  to authenticated
  using (
    id = public.current_organisation_id()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and organisation_id = organisations.id
        and role = 'owner'
    )
  )
  with check (id = public.current_organisation_id());

-- Profiles: users read/update their own row; same-org read for future team features
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No direct insert/delete for authenticated users; onboarding uses trigger or service role
