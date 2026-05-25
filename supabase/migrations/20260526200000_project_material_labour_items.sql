-- Project materials and labour generated from assembly packages (Estimating backbone v1)

create type public.estimate_pricing_source as enum (
  'assembly_package',
  'manual'
);

create table public.project_material_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  takeoff_item_id uuid not null references public.takeoff_items (id) on delete cascade,
  assembly_package_id uuid not null references public.assembly_packages (id) on delete restrict,
  source_package_name text not null,
  material_name text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  unit text not null default 'each',
  cost_rate numeric not null default 0 check (cost_rate >= 0),
  total_cost numeric not null default 0 check (total_cost >= 0),
  wastage_percent numeric not null default 0 check (
    wastage_percent >= 0
    and wastage_percent <= 100
  ),
  supplier text,
  pricing_source public.estimate_pricing_source not null default 'assembly_package',
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.project_labour_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  takeoff_item_id uuid not null references public.takeoff_items (id) on delete cascade,
  assembly_package_id uuid not null references public.assembly_packages (id) on delete restrict,
  source_package_name text not null,
  labour_name text not null,
  hours numeric not null default 0 check (hours >= 0),
  unit text not null default 'hr',
  cost_rate numeric not null default 0 check (cost_rate >= 0),
  charge_rate numeric not null default 0 check (charge_rate >= 0),
  total_cost numeric not null default 0 check (total_cost >= 0),
  total_sell numeric not null default 0 check (total_sell >= 0),
  pricing_source public.estimate_pricing_source not null default 'assembly_package',
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create index project_material_items_project_id_idx
  on public.project_material_items (project_id, created_at asc);

create index project_material_items_takeoff_item_id_idx
  on public.project_material_items (takeoff_item_id);

create index project_material_items_assembly_package_id_idx
  on public.project_material_items (assembly_package_id);

create index project_material_items_organisation_id_idx
  on public.project_material_items (organisation_id);

create index project_labour_items_project_id_idx
  on public.project_labour_items (project_id, created_at asc);

create index project_labour_items_takeoff_item_id_idx
  on public.project_labour_items (takeoff_item_id);

create index project_labour_items_assembly_package_id_idx
  on public.project_labour_items (assembly_package_id);

create index project_labour_items_organisation_id_idx
  on public.project_labour_items (organisation_id);

alter table public.project_material_items enable row level security;
alter table public.project_labour_items enable row level security;

create policy "project_material_items_select_own_org"
  on public.project_material_items
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "project_material_items_insert_own_org"
  on public.project_material_items
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "project_material_items_update_own_org"
  on public.project_material_items
  for update
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  )
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "project_material_items_delete_own_org"
  on public.project_material_items
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "project_labour_items_select_own_org"
  on public.project_labour_items
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "project_labour_items_insert_own_org"
  on public.project_labour_items
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "project_labour_items_update_own_org"
  on public.project_labour_items
  for update
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  )
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "project_labour_items_delete_own_org"
  on public.project_labour_items
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

grant select, insert, update, delete on public.project_material_items to authenticated;
grant select, insert, update, delete on public.project_labour_items to authenticated;
