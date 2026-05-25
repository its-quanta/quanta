-- Organisation standards library and entity links (Standards + Scope Gap Engine v1)

create type public.standard_type as enum (
  'nz_standard',
  'building_code',
  'specification',
  'manufacturer_guide',
  'drawing',
  'custom'
);

create type public.standard_link_entity_type as enum (
  'takeoff_item',
  'assembly_package',
  'pricing_item'
);

create table public.standards (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  reference_code text not null,
  name text not null,
  standard_type public.standard_type not null default 'custom',
  trade text,
  jurisdiction text,
  description text,
  notes text,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint standards_reference_code_org_key unique (organisation_id, reference_code)
);

create table public.standard_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  standard_id uuid not null references public.standards (id) on delete cascade,
  entity_type public.standard_link_entity_type not null,
  entity_id uuid not null,
  project_id uuid references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint standard_links_entity_standard_key unique (
    organisation_id,
    standard_id,
    entity_type,
    entity_id
  )
);

create index standards_organisation_id_idx on public.standards (organisation_id);
create index standards_organisation_active_idx
  on public.standards (organisation_id, is_active);
create index standard_links_organisation_id_idx
  on public.standard_links (organisation_id);
create index standard_links_entity_idx
  on public.standard_links (entity_type, entity_id);
create index standard_links_project_id_idx on public.standard_links (project_id);
create index standard_links_standard_id_idx on public.standard_links (standard_id);

create trigger standards_set_updated_at
  before update on public.standards
  for each row
  execute function public.set_updated_at();

alter table public.standards enable row level security;
alter table public.standard_links enable row level security;

create policy "standards_select_own_org"
  on public.standards for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "standards_insert_own_org"
  on public.standards for insert to authenticated
  with check (organisation_id = public.current_organisation_id());

create policy "standards_update_own_org"
  on public.standards for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "standards_delete_own_org"
  on public.standards for delete to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "standard_links_select_own_org"
  on public.standard_links for select to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and (
      project_id is null
      or public.project_belongs_to_current_org(project_id)
    )
  );

create policy "standard_links_insert_own_org"
  on public.standard_links for insert to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and (
      project_id is null
      or public.project_belongs_to_current_org(project_id)
    )
  );

create policy "standard_links_delete_own_org"
  on public.standard_links for delete to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and (
      project_id is null
      or public.project_belongs_to_current_org(project_id)
    )
  );

grant select, insert, update, delete on public.standards to authenticated;
grant select, insert, delete on public.standard_links to authenticated;
