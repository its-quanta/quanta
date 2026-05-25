-- Reliable document metadata writes: idempotent RLS + security definer RPC

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

drop policy if exists "documents_select_own_org" on public.documents;
drop policy if exists "documents_insert_own_org" on public.documents;
drop policy if exists "documents_update_own_org" on public.documents;
drop policy if exists "documents_delete_own_org" on public.documents;

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
    and (uploaded_by is null or uploaded_by = auth.uid())
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

grant select, insert, update, delete on public.documents to authenticated;

create or replace function public.create_document_record(
  p_project_id uuid,
  p_file_name text,
  p_storage_path text,
  p_file_type text,
  p_document_type text default 'other',
  p_document_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_document_id uuid := coalesce(p_document_id, gen_random_uuid());
  v_path_prefix text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select organisation_id
  into v_org_id
  from public.profiles
  where id = v_user_id;

  if v_org_id is null then
    raise exception 'Complete onboarding before uploading documents.';
  end if;

  if not exists (
    select 1
    from public.projects
    where id = p_project_id
      and organisation_id = v_org_id
  ) then
    raise exception 'Project not found.';
  end if;

  v_path_prefix := v_org_id::text || '/' || p_project_id::text || '/';

  if p_storage_path is null
    or position('..' in p_storage_path) > 0
    or not starts_with(p_storage_path, v_path_prefix)
  then
    raise exception 'Invalid storage path for this project.';
  end if;

  begin
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'documents'
        and column_name = 'uploaded_by'
    ) then
      insert into public.documents (
        id,
        organisation_id,
        project_id,
        file_name,
        storage_path,
        file_type,
        document_type,
        processing_status,
        uploaded_by
      )
      values (
        v_document_id,
        v_org_id,
        p_project_id,
        p_file_name,
        p_storage_path,
        p_file_type,
        coalesce(nullif(trim(p_document_type), ''), 'other')::public.document_classification,
        'ready',
        v_user_id
      );
    else
      insert into public.documents (
        id,
        organisation_id,
        project_id,
        file_name,
        storage_path,
        file_type,
        document_type,
        processing_status
      )
      values (
        v_document_id,
        v_org_id,
        p_project_id,
        p_file_name,
        p_storage_path,
        p_file_type,
        coalesce(nullif(trim(p_document_type), ''), 'other')::public.document_classification,
        'ready'
      );
    end if;
  exception
    when invalid_text_representation then
      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'documents'
          and column_name = 'uploaded_by'
      ) then
        insert into public.documents (
          id,
          organisation_id,
          project_id,
          file_name,
          storage_path,
          file_type,
          document_type,
          processing_status,
          uploaded_by
        )
        values (
          v_document_id,
          v_org_id,
          p_project_id,
          p_file_name,
          p_storage_path,
          p_file_type,
          coalesce(nullif(trim(p_document_type), ''), 'other'),
          'ready',
          v_user_id
        );
      else
        insert into public.documents (
          id,
          organisation_id,
          project_id,
          file_name,
          storage_path,
          file_type,
          document_type,
          processing_status
        )
        values (
          v_document_id,
          v_org_id,
          p_project_id,
          p_file_name,
          p_storage_path,
          p_file_type,
          coalesce(nullif(trim(p_document_type), ''), 'other'),
          'ready'
        );
      end if;
    when undefined_column then
      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'documents'
          and column_name = 'uploaded_by'
      ) then
        insert into public.documents (
          id,
          organisation_id,
          project_id,
          file_name,
          file_url,
          file_type,
          document_type,
          processing_status,
          uploaded_by
        )
        values (
          v_document_id,
          v_org_id,
          p_project_id,
          p_file_name,
          p_storage_path,
          p_file_type,
          coalesce(nullif(trim(p_document_type), ''), 'other'),
          'ready',
          v_user_id
        );
      else
        insert into public.documents (
          id,
          organisation_id,
          project_id,
          file_name,
          file_url,
          file_type,
          document_type,
          processing_status
        )
        values (
          v_document_id,
          v_org_id,
          p_project_id,
          p_file_name,
          p_storage_path,
          p_file_type,
          coalesce(nullif(trim(p_document_type), ''), 'other'),
          'ready'
        );
      end if;
  end;

  return v_document_id;
end;
$$;

revoke all on function public.create_document_record(uuid, text, text, text, text, uuid) from public;
grant execute on function public.create_document_record(uuid, text, text, text, text, uuid) to authenticated;
