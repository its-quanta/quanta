-- Organisation rate libraries (labour, material, supplier, subcontractor)

create table public.labour_rates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  unit text not null default 'hour',
  cost_rate numeric not null default 0 check (cost_rate >= 0),
  charge_rate numeric not null default 0 check (charge_rate >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.material_rates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  supplier text,
  unit text not null default 'each',
  cost_rate numeric not null default 0 check (cost_rate >= 0),
  waste_percent numeric not null default 0 check (
    waste_percent >= 0
    and waste_percent <= 100
  ),
  category text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_rates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  supplier text not null,
  item text not null,
  unit text not null default 'each',
  rate numeric not null default 0 check (rate >= 0),
  rate_updated_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subcontractor_rates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  trade text not null,
  supplier text,
  rate_basis text not null default 'item',
  rate numeric not null default 0 check (rate >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index labour_rates_organisation_id_sort_idx
  on public.labour_rates (organisation_id, sort_order asc, created_at asc);

create index material_rates_organisation_id_sort_idx
  on public.material_rates (organisation_id, sort_order asc, created_at asc);

create index supplier_rates_organisation_id_sort_idx
  on public.supplier_rates (organisation_id, sort_order asc, created_at asc);

create index supplier_rates_organisation_rate_updated_idx
  on public.supplier_rates (organisation_id, rate_updated_date);

create index subcontractor_rates_organisation_id_sort_idx
  on public.subcontractor_rates (organisation_id, sort_order asc, created_at asc);

create trigger labour_rates_set_updated_at
  before update on public.labour_rates
  for each row
  execute function public.set_updated_at();

create trigger material_rates_set_updated_at
  before update on public.material_rates
  for each row
  execute function public.set_updated_at();

create trigger supplier_rates_set_updated_at
  before update on public.supplier_rates
  for each row
  execute function public.set_updated_at();

create trigger subcontractor_rates_set_updated_at
  before update on public.subcontractor_rates
  for each row
  execute function public.set_updated_at();

alter table public.labour_rates enable row level security;
alter table public.material_rates enable row level security;
alter table public.supplier_rates enable row level security;
alter table public.subcontractor_rates enable row level security;

create policy "labour_rates_select_own_org"
  on public.labour_rates for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "labour_rates_insert_own_org"
  on public.labour_rates for insert to authenticated
  with check (organisation_id = public.current_organisation_id());

create policy "labour_rates_update_own_org"
  on public.labour_rates for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "labour_rates_delete_own_org"
  on public.labour_rates for delete to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "material_rates_select_own_org"
  on public.material_rates for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "material_rates_insert_own_org"
  on public.material_rates for insert to authenticated
  with check (organisation_id = public.current_organisation_id());

create policy "material_rates_update_own_org"
  on public.material_rates for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "material_rates_delete_own_org"
  on public.material_rates for delete to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "supplier_rates_select_own_org"
  on public.supplier_rates for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "supplier_rates_insert_own_org"
  on public.supplier_rates for insert to authenticated
  with check (organisation_id = public.current_organisation_id());

create policy "supplier_rates_update_own_org"
  on public.supplier_rates for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "supplier_rates_delete_own_org"
  on public.supplier_rates for delete to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "subcontractor_rates_select_own_org"
  on public.subcontractor_rates for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "subcontractor_rates_insert_own_org"
  on public.subcontractor_rates for insert to authenticated
  with check (organisation_id = public.current_organisation_id());

create policy "subcontractor_rates_update_own_org"
  on public.subcontractor_rates for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "subcontractor_rates_delete_own_org"
  on public.subcontractor_rates for delete to authenticated
  using (organisation_id = public.current_organisation_id());
