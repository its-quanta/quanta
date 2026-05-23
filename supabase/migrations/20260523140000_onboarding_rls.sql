-- Onboarding without service role: RLS for profile/org creation + invite RPC

-- Users can create their own profile shell during onboarding
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- Users without an organisation can create one
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

-- Accept invite by token (server-validated, runs as definer)
create or replace function public.accept_organisation_invite(
  p_token text,
  p_full_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.organisation_invites%rowtype;
  v_email text;
  v_full_name text;
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

  select *
  into v_invite
  from public.organisation_invites
  where token = p_token
    and status = 'pending';

  if not found then
    raise exception 'Invite token is invalid or has already been used.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    update public.organisation_invites
    set status = 'expired'
    where id = v_invite.id;

    raise exception 'This invite has expired.';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  if v_invite.email is not null and v_invite.email is distinct from v_email then
    raise exception 'This invite is for a different email address.';
  end if;

  select coalesce(
    nullif(trim(p_full_name), ''),
    p.full_name,
    split_part(v_email, '@', 1)
  )
  into v_full_name
  from public.profiles p
  where p.id = v_user_id;

  if v_full_name is null then
    v_full_name := split_part(v_email, '@', 1);
  end if;

  insert into public.profiles (id, email, full_name, organisation_id, role)
  values (v_user_id, v_email, v_full_name, v_invite.organisation_id, v_invite.role)
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    organisation_id = excluded.organisation_id,
    role = excluded.role;

  update public.organisation_invites
  set
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = now()
  where id = v_invite.id
    and status = 'pending';
end;
$$;

revoke all on function public.accept_organisation_invite(text, text) from public;
grant execute on function public.accept_organisation_invite(text, text) to authenticated;
