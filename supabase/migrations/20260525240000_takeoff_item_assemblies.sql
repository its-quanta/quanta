-- Links takeoff lines to applied assembly packages (Apply Package v1)

create table public.takeoff_item_assemblies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  takeoff_item_id uuid not null references public.takeoff_items (id) on delete cascade,
  assembly_package_id uuid not null references public.assembly_packages (id) on delete restrict,
  quantity numeric not null default 0 check (quantity >= 0),
  unit text not null default 'each',
  calculated_cost numeric not null default 0 check (calculated_cost >= 0),
  calculated_sell numeric not null default 0 check (calculated_sell >= 0),
  calculated_margin numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint takeoff_item_assemblies_takeoff_item_id_key unique (takeoff_item_id)
);

create index takeoff_item_assemblies_project_id_idx
  on public.takeoff_item_assemblies (project_id);

create index takeoff_item_assemblies_organisation_id_idx
  on public.takeoff_item_assemblies (organisation_id);

create index takeoff_item_assemblies_assembly_package_id_idx
  on public.takeoff_item_assemblies (assembly_package_id);

alter table public.takeoff_item_assemblies enable row level security;

create policy "takeoff_item_assemblies_select_own_org"
  on public.takeoff_item_assemblies
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "takeoff_item_assemblies_insert_own_org"
  on public.takeoff_item_assemblies
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "takeoff_item_assemblies_update_own_org"
  on public.takeoff_item_assemblies
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

create policy "takeoff_item_assemblies_delete_own_org"
  on public.takeoff_item_assemblies
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

grant select, insert, update, delete on public.takeoff_item_assemblies to authenticated;
