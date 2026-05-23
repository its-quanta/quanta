-- Organisation onboarding: nullable profile tenancy, roles, invites, profile-only signup trigger

-- Expand role model; allow profiles before organisation assignment
update public.profiles
set role = 'viewer'
where role = 'member';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  alter column organisation_id drop not null;

alter table public.profiles
  alter column role drop not null;

alter table public.profiles
  alter column role drop default;

alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role in ('owner', 'admin', 'estimator', 'viewer'));

-- Invites for joining an existing organisation (MVP: token-based)
create table public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  token text not null unique,
  email text,
  role text not null check (role in ('owner', 'admin', 'estimator', 'viewer')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organisation_invites_organisation_id_idx
  on public.organisation_invites (organisation_id);

create index organisation_invites_token_idx
  on public.organisation_invites (token)
  where status = 'pending';

create trigger organisation_invites_set_updated_at
  before update on public.organisation_invites
  for each row
  execute function public.set_updated_at();

-- Signup creates a profile shell only; organisation is assigned during onboarding
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, organisation_id, role)
  values (new.id, new.email, display_name, null, null)
  on conflict (id) do nothing;

  return new;
end;
$$;

alter table public.organisation_invites enable row level security;

-- Org owners/admins can read invites for their organisation (future team UI)
create policy "organisation_invites_select_org_admin"
  on public.organisation_invites
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and organisation_id = organisation_invites.organisation_id
        and role in ('owner', 'admin')
    )
  );

-- Invite acceptance is performed via secure server paths (service role / RPC)
