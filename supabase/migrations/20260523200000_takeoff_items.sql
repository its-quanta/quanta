-- Manual takeoff items for Quanta tender workspaces

create type public.takeoff_item_status as enum (
  'ai_draft',
  'needs_review',
  'reviewed',
  'priced',
  'excluded'
);

create table public.takeoff_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_document_id uuid references public.documents (id) on delete set null,
  trade text not null default 'General',
  item_name text not null default '',
  description text,
  quantity numeric not null default 0 check (quantity >= 0),
  unit text not null default 'each',
  drawing_reference text,
  page_number integer check (page_number is null or page_number > 0),
  confidence_score numeric check (
    confidence_score is null
    or (confidence_score >= 0 and confidence_score <= 1)
  ),
  ai_generated boolean not null default false,
  reviewed boolean not null default false,
  status public.takeoff_item_status not null default 'needs_review',
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index takeoff_items_project_id_sort_order_idx
  on public.takeoff_items (project_id, sort_order asc, created_at asc);

create index takeoff_items_organisation_id_idx
  on public.takeoff_items (organisation_id);

create index takeoff_items_source_document_id_idx
  on public.takeoff_items (source_document_id);

create trigger takeoff_items_set_updated_at
  before update on public.takeoff_items
  for each row
  execute function public.set_updated_at();

alter table public.takeoff_items enable row level security;

create policy "takeoff_items_select_own_org"
  on public.takeoff_items
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "takeoff_items_insert_own_org"
  on public.takeoff_items
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "takeoff_items_update_own_org"
  on public.takeoff_items
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

create policy "takeoff_items_delete_own_org"
  on public.takeoff_items
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );
