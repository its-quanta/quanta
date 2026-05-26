-- Tender clarifications (exclusions, assumptions, RFIs) and org templates

create table public.clarification_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  type text not null check (type in ('exclusion', 'assumption')),
  title text not null,
  description text,
  category text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tender_clarifications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (type in ('exclusion', 'assumption', 'rfi')),
  title text not null,
  description text,
  category text,
  status text not null default 'open' check (
    status in ('draft', 'open', 'answered', 'closed')
  ),
  priority text check (
    priority is null
    or priority in ('low', 'medium', 'high')
  ),
  related_drawing_reference text,
  takeoff_item_id uuid references public.takeoff_items (id) on delete set null,
  template_id uuid references public.clarification_templates (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clarification_templates_organisation_id_idx
  on public.clarification_templates (organisation_id, type, sort_order);

create index tender_clarifications_project_id_idx
  on public.tender_clarifications (project_id, type, sort_order);

create index tender_clarifications_organisation_id_idx
  on public.tender_clarifications (organisation_id);

create trigger clarification_templates_set_updated_at
  before update on public.clarification_templates
  for each row
  execute function public.set_updated_at();

create trigger tender_clarifications_set_updated_at
  before update on public.tender_clarifications
  for each row
  execute function public.set_updated_at();

alter table public.clarification_templates enable row level security;
alter table public.tender_clarifications enable row level security;

create policy "clarification_templates_select_own_org"
  on public.clarification_templates for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "clarification_templates_insert_own_org"
  on public.clarification_templates for insert to authenticated
  with check (organisation_id = public.current_organisation_id());

create policy "clarification_templates_update_own_org"
  on public.clarification_templates for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "clarification_templates_delete_own_org"
  on public.clarification_templates for delete to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "tender_clarifications_select_own_org"
  on public.tender_clarifications for select to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "tender_clarifications_insert_own_org"
  on public.tender_clarifications for insert to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "tender_clarifications_update_own_org"
  on public.tender_clarifications for update to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  )
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "tender_clarifications_delete_own_org"
  on public.tender_clarifications for delete to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

grant select, insert, update, delete on public.clarification_templates to authenticated;
grant select, insert, update, delete on public.tender_clarifications to authenticated;
