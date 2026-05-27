-- AI visual review layer: overlay geometry, segments (future), approval audit trail

alter table public.ai_review_items
  add column if not exists overlay_geometry jsonb;

comment on column public.ai_review_items.overlay_geometry is
  'Normalised overlay shape for review canvas (bbox or polygon). Populated when AI geometry is available — not used for extraction in MVP.';

create table public.ai_review_segments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  ai_review_item_id uuid not null references public.ai_review_items (id) on delete cascade,
  segment_key text not null,
  trade text not null default 'General',
  geometry jsonb,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'adjusted')),
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ai_review_item_id, segment_key)
);

create index ai_review_segments_item_id_idx
  on public.ai_review_segments (ai_review_item_id);

create index ai_review_segments_project_id_idx
  on public.ai_review_segments (project_id);

create trigger ai_review_segments_set_updated_at
  before update on public.ai_review_segments
  for each row
  execute function public.set_updated_at();

alter table public.ai_review_segments enable row level security;

create policy "ai_review_segments_select_own_org"
  on public.ai_review_segments for select to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "ai_review_segments_insert_own_org"
  on public.ai_review_segments for insert to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "ai_review_segments_update_own_org"
  on public.ai_review_segments for update to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  )
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "ai_review_segments_delete_own_org"
  on public.ai_review_segments for delete to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create table public.ai_review_approval_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  ai_review_item_id uuid not null references public.ai_review_items (id) on delete cascade,
  ai_review_segment_id uuid references public.ai_review_segments (id) on delete set null,
  action text not null check (action in ('approve', 'reject', 'adjust', 'pending')),
  notes text,
  performed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_review_approval_events_item_id_idx
  on public.ai_review_approval_events (ai_review_item_id, created_at desc);

alter table public.ai_review_approval_events enable row level security;

create policy "ai_review_approval_events_select_own_org"
  on public.ai_review_approval_events for select to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "ai_review_approval_events_insert_own_org"
  on public.ai_review_approval_events for insert to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );
