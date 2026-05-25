-- Structured drawing references: indexed document pages + takeoff link fields

create table public.document_pages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  page_number integer not null check (page_number > 0),
  sheet_number text,
  sheet_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, page_number)
);

create index document_pages_document_id_idx
  on public.document_pages (document_id, page_number asc);

create index document_pages_organisation_id_idx
  on public.document_pages (organisation_id);

create trigger document_pages_set_updated_at
  before update on public.document_pages
  for each row
  execute function public.set_updated_at();

alter table public.document_pages enable row level security;

create policy "document_pages_select_own_org"
  on public.document_pages
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1
      from public.documents d
      where d.id = document_id
        and d.organisation_id = public.current_organisation_id()
        and public.project_belongs_to_current_org(d.project_id)
    )
  );

create policy "document_pages_insert_own_org"
  on public.document_pages
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1
      from public.documents d
      where d.id = document_id
        and d.organisation_id = public.current_organisation_id()
        and public.project_belongs_to_current_org(d.project_id)
    )
  );

create policy "document_pages_update_own_org"
  on public.document_pages
  for update
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
  )
  with check (
    organisation_id = public.current_organisation_id()
  );

create policy "document_pages_delete_own_org"
  on public.document_pages
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
  );

-- Takeoff structured reference columns
alter table public.takeoff_items
  add column if not exists document_page_id uuid references public.document_pages (id) on delete set null;

alter table public.takeoff_items
  add column if not exists sheet_number text;

alter table public.takeoff_items
  add column if not exists detail_reference text;

alter table public.takeoff_items
  add column if not exists specification_reference text;

create index takeoff_items_document_page_id_idx
  on public.takeoff_items (document_page_id);
