-- Reliable takeoff package applications: idempotent RLS + security definer upsert

drop policy if exists "takeoff_item_assemblies_select_own_org" on public.takeoff_item_assemblies;
drop policy if exists "takeoff_item_assemblies_insert_own_org" on public.takeoff_item_assemblies;
drop policy if exists "takeoff_item_assemblies_update_own_org" on public.takeoff_item_assemblies;
drop policy if exists "takeoff_item_assemblies_delete_own_org" on public.takeoff_item_assemblies;

create policy "takeoff_item_assemblies_select_own_org"
  on public.takeoff_item_assemblies
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
      where id = takeoff_item_assemblies.project_id
        and organisation_id = takeoff_item_assemblies.organisation_id
    )
  );

create policy "takeoff_item_assemblies_insert_own_org"
  on public.takeoff_item_assemblies
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
        and organisation_id = takeoff_item_assemblies.organisation_id
    )
    and exists (
      select 1
      from public.takeoff_items
      where id = takeoff_item_id
        and project_id = takeoff_item_assemblies.project_id
        and organisation_id = takeoff_item_assemblies.organisation_id
    )
    and exists (
      select 1
      from public.assembly_packages
      where id = assembly_package_id
        and organisation_id = takeoff_item_assemblies.organisation_id
    )
  );

create policy "takeoff_item_assemblies_update_own_org"
  on public.takeoff_item_assemblies
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
      where id = takeoff_item_assemblies.project_id
        and organisation_id = takeoff_item_assemblies.organisation_id
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
        and organisation_id = takeoff_item_assemblies.organisation_id
    )
    and exists (
      select 1
      from public.takeoff_items
      where id = takeoff_item_id
        and project_id = takeoff_item_assemblies.project_id
        and organisation_id = takeoff_item_assemblies.organisation_id
    )
    and exists (
      select 1
      from public.assembly_packages
      where id = assembly_package_id
        and organisation_id = takeoff_item_assemblies.organisation_id
    )
  );

create policy "takeoff_item_assemblies_delete_own_org"
  on public.takeoff_item_assemblies
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
      where id = takeoff_item_assemblies.project_id
        and organisation_id = takeoff_item_assemblies.organisation_id
    )
  );

grant select, insert, update, delete on public.takeoff_item_assemblies to authenticated;

create or replace function public.upsert_takeoff_item_assembly(
  p_project_id uuid,
  p_takeoff_item_id uuid,
  p_assembly_package_id uuid,
  p_quantity numeric default 0,
  p_unit text default 'each',
  p_calculated_cost numeric default 0,
  p_calculated_sell numeric default 0,
  p_calculated_margin numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_row_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select organisation_id
  into v_org_id
  from public.profiles
  where id = v_user_id;

  if v_org_id is null then
    raise exception 'Complete onboarding before applying packages.';
  end if;

  if not exists (
    select 1
    from public.projects
    where id = p_project_id
      and organisation_id = v_org_id
  ) then
    raise exception 'Project not found.';
  end if;

  if not exists (
    select 1
    from public.takeoff_items
    where id = p_takeoff_item_id
      and project_id = p_project_id
      and organisation_id = v_org_id
      and status <> 'excluded'
  ) then
    raise exception 'Takeoff item not found.';
  end if;

  if not exists (
    select 1
    from public.assembly_packages
    where id = p_assembly_package_id
      and organisation_id = v_org_id
      and is_active = true
  ) then
    raise exception 'Assembly package not found.';
  end if;

  insert into public.takeoff_item_assemblies (
    organisation_id,
    project_id,
    takeoff_item_id,
    assembly_package_id,
    quantity,
    unit,
    calculated_cost,
    calculated_sell,
    calculated_margin
  )
  values (
    v_org_id,
    p_project_id,
    p_takeoff_item_id,
    p_assembly_package_id,
    coalesce(p_quantity, 0),
    coalesce(nullif(trim(p_unit), ''), 'each'),
    coalesce(p_calculated_cost, 0),
    coalesce(p_calculated_sell, 0),
    coalesce(p_calculated_margin, 0)
  )
  on conflict (takeoff_item_id) do update
  set
    assembly_package_id = excluded.assembly_package_id,
    quantity = excluded.quantity,
    unit = excluded.unit,
    calculated_cost = excluded.calculated_cost,
    calculated_sell = excluded.calculated_sell,
    calculated_margin = excluded.calculated_margin
  returning id into v_row_id;

  return v_row_id;
end;
$$;

revoke all on function public.upsert_takeoff_item_assembly(
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  numeric,
  numeric,
  numeric
) from public;

grant execute on function public.upsert_takeoff_item_assembly(
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  numeric,
  numeric,
  numeric
) to authenticated;
