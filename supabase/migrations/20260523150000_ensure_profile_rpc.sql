-- Reliable onboarding via security definer RPCs (bypasses missing INSERT RLS policies)

create or replace function public.ensure_user_profile(p_full_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if found then
    return v_profile;
  end if;

  select email into v_email from auth.users where id = v_user_id;

  v_full_name := coalesce(
    nullif(trim(p_full_name), ''),
    split_part(v_email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, organisation_id, role)
  values (v_user_id, v_email, v_full_name, null, null)
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.create_organisation_for_user(
  p_company_name text,
  p_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = v_user_id
      and organisation_id is not null
  ) then
    raise exception 'You already belong to an organisation.';
  end if;

  if nullif(trim(p_company_name), '') is null then
    raise exception 'Company name is required.';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Full name is required.';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.organisations (name)
  values (trim(p_company_name))
  returning id into v_org_id;

  insert into public.profiles (id, email, full_name, organisation_id, role)
  values (v_user_id, v_email, trim(p_full_name), v_org_id, 'owner')
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    organisation_id = excluded.organisation_id,
    role = excluded.role;

  return v_org_id;
end;
$$;

revoke all on function public.ensure_user_profile(text) from public;
grant execute on function public.ensure_user_profile(text) to authenticated;

revoke all on function public.create_organisation_for_user(text, text) from public;
grant execute on function public.create_organisation_for_user(text, text) to authenticated;

-- Idempotent RLS policies (safe if 20260523140000 already applied)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "organisations_insert_onboarding" on public.organisations;
create policy "organisations_insert_onboarding"
  on public.organisations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and organisation_id is null
    )
  );
