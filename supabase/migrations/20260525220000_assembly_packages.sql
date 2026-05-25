-- Organisation assembly / pricing packages (library v1)

create type public.assembly_package_item_type as enum (
  'material',
  'labour',
  'plant',
  'subcontractor',
  'allowance'
);

create table public.assembly_packages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  description text,
  trade text,
  unit text not null default 'm2',
  default_cost_rate numeric not null default 0 check (default_cost_rate >= 0),
  default_sell_rate numeric not null default 0 check (default_sell_rate >= 0),
  default_markup_percentage numeric check (
    default_markup_percentage is null
    or (default_markup_percentage >= 0 and default_markup_percentage <= 1000)
  ),
  default_margin_percentage numeric check (
    default_margin_percentage is null
    or (default_margin_percentage >= 0 and default_margin_percentage < 100)
  ),
  standard_reference text,
  specification_reference text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assembly_package_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  assembly_package_id uuid not null references public.assembly_packages (id) on delete cascade,
  item_type public.assembly_package_item_type not null default 'material',
  item_name text not null,
  quantity_per_unit numeric not null default 0 check (quantity_per_unit >= 0),
  unit text not null default 'each',
  wastage_percentage numeric not null default 0 check (
    wastage_percentage >= 0
    and wastage_percentage <= 100
  ),
  cost_rate numeric not null default 0 check (cost_rate >= 0),
  sell_rate numeric check (sell_rate is null or sell_rate >= 0),
  total_cost_per_unit numeric not null default 0 check (total_cost_per_unit >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index assembly_packages_organisation_id_idx
  on public.assembly_packages (organisation_id);

create index assembly_packages_organisation_active_idx
  on public.assembly_packages (organisation_id, is_active);

create index assembly_package_items_package_id_idx
  on public.assembly_package_items (assembly_package_id);

create index assembly_package_items_organisation_id_idx
  on public.assembly_package_items (organisation_id);

create trigger assembly_packages_set_updated_at
  before update on public.assembly_packages
  for each row
  execute function public.set_updated_at();

alter table public.assembly_packages enable row level security;
alter table public.assembly_package_items enable row level security;

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
