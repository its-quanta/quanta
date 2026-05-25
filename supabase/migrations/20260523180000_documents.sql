-- Project documents: metadata table, private storage bucket, RLS

create type public.document_processing_status as enum (
  'pending',
  'ready',
  'failed'
);

create type public.document_classification as enum (
  'architectural_drawings',
  'structural_drawings',
  'specification',
  'schedule',
  'scope_document',
  'photos_images',
  'other'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_type text not null,
  document_type public.document_classification not null default 'other',
  page_count integer,
  processing_status public.document_processing_status not null default 'pending',
  ai_summary text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index documents_project_id_created_at_idx
  on public.documents (project_id, created_at desc);

create index documents_organisation_id_idx
  on public.documents (organisation_id);

create or replace function public.project_belongs_to_current_org(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = p_project_id
      and organisation_id = public.current_organisation_id()
  )
$$;

alter table public.documents enable row level security;

create policy "documents_select_own_org"
  on public.documents
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

create policy "documents_insert_own_org"
  on public.documents
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
    and uploaded_by = auth.uid()
  );

create policy "documents_update_own_org"
  on public.documents
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

create policy "documents_delete_own_org"
  on public.documents
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

-- Private storage bucket for tender files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage path: {organisation_id}/{project_id}/{file_name}
create policy "project_documents_select_own_org"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
  );

create policy "project_documents_insert_own_org"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
    and public.project_belongs_to_current_org(((storage.foldername(name))[2])::uuid)
  );

create policy "project_documents_delete_own_org"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1] = public.current_organisation_id()::text
  );
