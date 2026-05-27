-- Bulk import audit history (CSV/XLSX organisation data)

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  import_type text not null,
  rows_imported integer not null default 0 check (rows_imported >= 0),
  rows_failed integer not null default 0 check (rows_failed >= 0),
  duplicate_strategy text not null default 'skip'
    check (duplicate_strategy in ('skip', 'overwrite', 'create_new')),
  imported_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index import_batches_organisation_id_idx
  on public.import_batches (organisation_id, created_at desc);

alter table public.import_batches enable row level security;

create policy "import_batches_select_own_org"
  on public.import_batches
  for select
  to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "import_batches_insert_own_org"
  on public.import_batches
  for insert
  to authenticated
  with check (organisation_id = public.current_organisation_id());
