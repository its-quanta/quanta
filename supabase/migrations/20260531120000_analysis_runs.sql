-- Background document analysis runs (org-scoped, polled by Plans & Specs UI)

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  progress smallint not null default 0 check (progress >= 0 and progress <= 100),
  current_stage text not null default 'Preparing analysis',
  documents_total integer not null default 1 check (documents_total >= 0),
  documents_completed integer not null default 0 check (documents_completed >= 0),
  pages_total integer not null default 0 check (pages_total >= 0),
  pages_completed integer not null default 0 check (pages_completed >= 0),
  error_message text,
  error_reference text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analysis_runs_project_id_created_at_idx
  on public.analysis_runs (project_id, created_at desc);

create index if not exists analysis_runs_org_id_idx
  on public.analysis_runs (organisation_id);

alter table public.analysis_runs enable row level security;

drop policy if exists "analysis_runs_select_own_org" on public.analysis_runs;
drop policy if exists "analysis_runs_insert_own_org" on public.analysis_runs;
drop policy if exists "analysis_runs_update_own_org" on public.analysis_runs;

create policy "analysis_runs_select_own_org"
  on public.analysis_runs
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "analysis_runs_insert_own_org"
  on public.analysis_runs
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
    and (created_by is null or created_by = auth.uid())
  );

create policy "analysis_runs_update_own_org"
  on public.analysis_runs
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

grant select, insert, update on public.analysis_runs to authenticated;
