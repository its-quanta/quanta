-- AI review queue: estimator review of future AI takeoff suggestions (no AI in this migration)

create table public.ai_review_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'adjusted')),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  trade text not null default 'General',
  description text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  unit text not null default 'each',
  reasoning text,
  source_document_id uuid references public.documents (id) on delete set null,
  drawing_reference text,
  sheet_number text,
  page_number integer check (page_number is null or page_number > 0),
  result_takeoff_item_id uuid references public.takeoff_items (id) on delete set null,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_review_items_project_id_idx
  on public.ai_review_items (project_id, created_at desc);

create index ai_review_items_organisation_id_idx
  on public.ai_review_items (organisation_id);

create index ai_review_items_status_idx
  on public.ai_review_items (project_id, status);

create trigger ai_review_items_set_updated_at
  before update on public.ai_review_items
  for each row
  execute function public.set_updated_at();

alter table public.ai_review_items enable row level security;

create policy "ai_review_items_select_own_org"
  on public.ai_review_items
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "ai_review_items_insert_own_org"
  on public.ai_review_items
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "ai_review_items_update_own_org"
  on public.ai_review_items
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

create policy "ai_review_items_delete_own_org"
  on public.ai_review_items
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );
