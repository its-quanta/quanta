-- Projects table for Quanta tender workspaces

create type public.project_status as enum (
  'draft',
  'in_review',
  'submitted',
  'won',
  'lost',
  'archived'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  client_name text,
  site_address text,
  project_type text,
  trade_scope text,
  tender_due_date date,
  status public.project_status not null default 'draft',
  notes text,
  estimated_value numeric,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_organisation_id_updated_at_idx
  on public.projects (organisation_id, updated_at desc);

create index projects_organisation_id_status_idx
  on public.projects (organisation_id, status);

create index projects_tender_due_date_idx
  on public.projects (organisation_id, tender_due_date);

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "projects_select_own_org"
  on public.projects
  for select
  to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "projects_insert_own_org"
  on public.projects
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and created_by = auth.uid()
  );

create policy "projects_update_own_org"
  on public.projects
  for update
  to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "projects_delete_own_org"
  on public.projects
  for delete
  to authenticated
  using (organisation_id = public.current_organisation_id());
