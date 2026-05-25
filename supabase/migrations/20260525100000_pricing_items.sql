-- Pricing lines linked to takeoff items (Pricing Engine v1)

create type public.pricing_method as enum (
  'm2',
  'sqm',
  'lm',
  'm3',
  'each',
  'item',
  'hour',
  'day',
  'allowance',
  'package',
  'subcontractor_quote',
  'custom'
);

create table public.pricing_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  takeoff_item_id uuid not null references public.takeoff_items (id) on delete cascade,
  pricing_method public.pricing_method not null default 'each',
  quantity numeric not null default 0 check (quantity >= 0),
  unit text not null default 'each',
  cost_rate numeric not null default 0 check (cost_rate >= 0),
  total_cost numeric not null default 0,
  markup_percentage numeric check (
    markup_percentage is null or markup_percentage >= 0
  ),
  margin_percentage numeric check (
    margin_percentage is null
    or (margin_percentage >= 0 and margin_percentage < 100)
  ),
  sell_rate numeric not null default 0 check (sell_rate >= 0),
  sell_rate_overridden boolean not null default false,
  total_sell numeric not null default 0,
  gross_profit numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pricing_items_project_id_idx
  on public.pricing_items (project_id, created_at asc);

create index pricing_items_organisation_id_idx
  on public.pricing_items (organisation_id);

create index pricing_items_takeoff_item_id_idx
  on public.pricing_items (takeoff_item_id);

create trigger pricing_items_set_updated_at
  before update on public.pricing_items
  for each row
  execute function public.set_updated_at();

alter table public.pricing_items enable row level security;

create policy "pricing_items_select_own_org"
  on public.pricing_items
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "pricing_items_insert_own_org"
  on public.pricing_items
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "pricing_items_update_own_org"
  on public.pricing_items
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

create policy "pricing_items_delete_own_org"
  on public.pricing_items
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

-- Project-level pricing progress (0–100)
alter table public.projects
  add column if not exists pricing_completion numeric;
