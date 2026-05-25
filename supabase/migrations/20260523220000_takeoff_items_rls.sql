-- Reliable takeoff item writes: idempotent RLS + security definer RPC

create or replace function public.project_belongs_to_current_org(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = p_project_id
      and organisation_id = public.current_organisation_id()
  )
$$;

alter table public.takeoff_items enable row level security;

drop policy if exists "takeoff_items_select_own_org" on public.takeoff_items;
drop policy if exists "takeoff_items_insert_own_org" on public.takeoff_items;
drop policy if exists "takeoff_items_update_own_org" on public.takeoff_items;
drop policy if exists "takeoff_items_delete_own_org" on public.takeoff_items;

create policy "takeoff_items_select_own_org"
  on public.takeoff_items
  for select
  to authenticated
  using (
    organisation_id = (
      select organisation_id
      from public.profiles
      where id = auth.uid()
    )
    and exists (
      select 1
      from public.projects
      where id = takeoff_items.project_id
        and organisation_id = takeoff_items.organisation_id
    )
  );

create policy "takeoff_items_insert_own_org"
  on public.takeoff_items
  for insert
  to authenticated
  with check (
    organisation_id = (
      select organisation_id
      from public.profiles
      where id = auth.uid()
    )
    and exists (
      select 1
      from public.projects
      where id = project_id
        and organisation_id = takeoff_items.organisation_id
    )
  );

create policy "takeoff_items_update_own_org"
  on public.takeoff_items
  for update
  to authenticated
  using (
    organisation_id = (
      select organisation_id
      from public.profiles
      where id = auth.uid()
    )
    and exists (
      select 1
      from public.projects
      where id = takeoff_items.project_id
        and organisation_id = takeoff_items.organisation_id
    )
  )
  with check (
    organisation_id = (
      select organisation_id
      from public.profiles
      where id = auth.uid()
    )
    and exists (
      select 1
      from public.projects
      where id = project_id
        and organisation_id = takeoff_items.organisation_id
    )
  );

create policy "takeoff_items_delete_own_org"
  on public.takeoff_items
  for delete
  to authenticated
  using (
    organisation_id = (
      select organisation_id
      from public.profiles
      where id = auth.uid()
    )
    and exists (
      select 1
      from public.projects
      where id = takeoff_items.project_id
        and organisation_id = takeoff_items.organisation_id
    )
  );

grant select, insert, update, delete on public.takeoff_items to authenticated;

create or replace function public.create_takeoff_item(
  p_project_id uuid,
  p_item_id uuid default null,
  p_trade text default 'General',
  p_item_name text default '',
  p_description text default null,
  p_quantity numeric default 0,
  p_unit text default 'each',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_item_id uuid := coalesce(p_item_id, gen_random_uuid());
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select organisation_id
  into v_org_id
  from public.profiles
  where id = v_user_id;

  if v_org_id is null then
    raise exception 'Complete onboarding before adding takeoff items.';
  end if;

  if not exists (
    select 1
    from public.projects
    where id = p_project_id
      and organisation_id = v_org_id
  ) then
    raise exception 'Project not found.';
  end if;

  begin
    insert into public.takeoff_items (
      id,
      organisation_id,
      project_id,
      description,
      quantity,
      unit,
      notes
    )
    values (
      v_item_id,
      v_org_id,
      p_project_id,
      coalesce(p_description, ''),
      coalesce(p_quantity, 0),
      coalesce(nullif(trim(p_unit), ''), 'each'),
      p_notes
    );
  exception
    when others then
      raise;
  end;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'takeoff_items'
      and column_name = 'trade'
  ) then
    update public.takeoff_items
    set
      trade = coalesce(nullif(trim(p_trade), ''), 'General'),
      item_name = coalesce(p_item_name, '')
    where id = v_item_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'takeoff_items'
      and column_name = 'status'
  ) then
    update public.takeoff_items
    set
      status = 'needs_review',
      reviewed = false,
      ai_generated = false
    where id = v_item_id;
  end if;

  return v_item_id;
end;
$$;

revoke all on function public.create_takeoff_item(uuid, uuid, text, text, text, numeric, text, text) from public;
grant execute on function public.create_takeoff_item(uuid, uuid, text, text, text, numeric, text, text) to authenticated;
