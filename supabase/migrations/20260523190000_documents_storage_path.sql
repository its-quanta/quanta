-- Align documents table with app schema (storage_path and related columns)

alter table public.documents add column if not exists storage_path text;
alter table public.documents add column if not exists file_type text;
alter table public.documents add column if not exists document_type text;
alter table public.documents add column if not exists page_count integer;
alter table public.documents add column if not exists processing_status text;
alter table public.documents add column if not exists ai_summary text;
alter table public.documents add column if not exists uploaded_by uuid references auth.users (id) on delete set null;

-- Migrate legacy file_url into storage_path when present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'file_url'
  ) then
    execute $sql$
      update public.documents
      set storage_path = file_url
      where storage_path is null
        and file_url is not null
    $sql$;
  end if;
end
$$;

-- Backfill file_type from mime_type when present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'mime_type'
  ) then
    execute $sql$
      update public.documents
      set file_type = mime_type
      where file_type is null
        and mime_type is not null
    $sql$;
  end if;
end
$$;

update public.documents
set processing_status = 'ready'
where processing_status is null;
