-- Grants, idempotent RLS, and security-definer inserts for assembly packages (v1)

grant select, insert, update, delete on public.assembly_packages to authenticated;
grant select, insert, update, delete on public.assembly_package_items to authenticated;

drop policy if exists "assembly_packages_select_own_org" on public.assembly_packages;
drop policy if exists "assembly_packages_insert_own_org" on public.assembly_packages;
drop policy if exists "assembly_packages_update_own_org" on public.assembly_packages;
drop policy if exists "assembly_packages_delete_own_org" on public.assembly_packages;

create policy "assembly_packages_select_own_org"
  on public.assembly_packages for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "assembly_packages_insert_own_org"
  on public.assembly_packages for insert to authenticated
  with check (organisation_id = public.current_organisation_id());

create policy "assembly_packages_update_own_org"
  on public.assembly_packages for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "assembly_packages_delete_own_org"
  on public.assembly_packages for delete to authenticated
  using (organisation_id = public.current_organisation_id());

drop policy if exists "assembly_package_items_select_own_org" on public.assembly_package_items;
drop policy if exists "assembly_package_items_insert_own_org" on public.assembly_package_items;
drop policy if exists "assembly_package_items_update_own_org" on public.assembly_package_items;
drop policy if exists "assembly_package_items_delete_own_org" on public.assembly_package_items;

create policy "assembly_package_items_select_own_org"
  on public.assembly_package_items for select to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1
      from public.assembly_packages p
      where p.id = assembly_package_items.assembly_package_id
        and p.organisation_id = public.current_organisation_id()
    )
  );

create policy "assembly_package_items_insert_own_org"
  on public.assembly_package_items for insert to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1
      from public.assembly_packages p
      where p.id = assembly_package_items.assembly_package_id
        and p.organisation_id = public.current_organisation_id()
    )
  );

create policy "assembly_package_items_update_own_org"
  on public.assembly_package_items for update to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1
      from public.assembly_packages p
      where p.id = assembly_package_items.assembly_package_id
        and p.organisation_id = public.current_organisation_id()
    )
  )
  with check (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1
      from public.assembly_packages p
      where p.id = assembly_package_items.assembly_package_id
        and p.organisation_id = public.current_organisation_id()
    )
  );

create policy "assembly_package_items_delete_own_org"
  on public.assembly_package_items for delete to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1
      from public.assembly_packages p
      where p.id = assembly_package_items.assembly_package_id
        and p.organisation_id = public.current_organisation_id()
    )
  );

create or replace function public.create_assembly_package(
  p_package_id uuid default null,
  p_name text default '',
  p_description text default null,
  p_trade text default null,
  p_unit text default 'm2',
  p_default_cost_rate numeric default 0,
  p_default_sell_rate numeric default 0,
  p_default_markup_percentage numeric default null,
  p_default_margin_percentage numeric default null,
  p_standard_reference text default null,
  p_specification_reference text default null,
  p_notes text default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_package_id uuid := coalesce(p_package_id, gen_random_uuid());
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select organisation_id
  into v_org_id
  from public.profiles
  where id = v_user_id;

  if v_org_id is null then
    raise exception 'Complete onboarding before creating assemblies.';
  end if;

  insert into public.assembly_packages (
    id,
    organisation_id,
    name,
    description,
    trade,
    unit,
    default_cost_rate,
    default_sell_rate,
    default_markup_percentage,
    default_margin_percentage,
    standard_reference,
    specification_reference,
    notes,
    is_active
  )
  values (
    v_package_id,
    v_org_id,
    coalesce(nullif(trim(p_name), ''), 'Untitled assembly'),
    p_description,
    p_trade,
    coalesce(nullif(trim(p_unit), ''), 'm2'),
    coalesce(p_default_cost_rate, 0),
    coalesce(p_default_sell_rate, 0),
    p_default_markup_percentage,
    p_default_margin_percentage,
    p_standard_reference,
    p_specification_reference,
    p_notes,
    coalesce(p_is_active, true)
  );

  return v_package_id;
end;
$$;

create or replace function public.create_assembly_package_item(
  p_item_id uuid default null,
  p_assembly_package_id uuid,
  p_item_type public.assembly_package_item_type default 'material',
  p_item_name text default '',
  p_quantity_per_unit numeric default 0,
  p_unit text default 'each',
  p_wastage_percentage numeric default 0,
  p_cost_rate numeric default 0,
  p_sell_rate numeric default null,
  p_total_cost_per_unit numeric default 0,
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

  if p_assembly_package_id is null then
    raise exception 'Assembly package is required.';
  end if;

  select organisation_id
  into v_org_id
  from public.profiles
  where id = v_user_id;

  if v_org_id is null then
    raise exception 'Complete onboarding before adding assembly components.';
  end if;

  if not exists (
    select 1
    from public.assembly_packages p
    where p.id = p_assembly_package_id
      and p.organisation_id = v_org_id
  ) then
    raise exception 'Assembly not found.';
  end if;

  insert into public.assembly_package_items (
    id,
    organisation_id,
    assembly_package_id,
    item_type,
    item_name,
    quantity_per_unit,
    unit,
    wastage_percentage,
    cost_rate,
    sell_rate,
    total_cost_per_unit,
    notes
  )
  values (
    v_item_id,
    v_org_id,
    p_assembly_package_id,
    coalesce(p_item_type, 'material'::public.assembly_package_item_type),
    coalesce(nullif(trim(p_item_name), ''), 'Component'),
    coalesce(p_quantity_per_unit, 0),
    coalesce(nullif(trim(p_unit), ''), 'each'),
    coalesce(p_wastage_percentage, 0),
    coalesce(p_cost_rate, 0),
    p_sell_rate,
    coalesce(p_total_cost_per_unit, 0),
    p_notes
  );

  return v_item_id;
end;
$$;

revoke all on function public.create_assembly_package(
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  boolean
) from public;

grant execute on function public.create_assembly_package(
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  boolean
) to authenticated;

revoke all on function public.create_assembly_package_item(
  uuid,
  uuid,
  public.assembly_package_item_type,
  text,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
) from public;

grant execute on function public.create_assembly_package_item(
  uuid,
  uuid,
  public.assembly_package_item_type,
  text,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text
) to authenticated;
