-- ai_review_items (and related tables) were created with RLS but without GRANTs
-- for the authenticated role. Inserts then fail with "permission denied" even when
-- RLS would allow the row.
--
-- Some Supabase projects were created before core org helper functions existed.
-- Bootstrap those helpers first so this migration and ai_review_items RLS work.

create or replace function public.current_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id
  from public.profiles
  where id = auth.uid()
$$;

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

grant select, insert, update, delete on public.ai_review_items to authenticated;

-- Optional visual-layer tables (only if that migration has been applied).
do $$
begin
  if to_regclass('public.ai_review_segments') is not null then
    grant select, insert, update, delete on public.ai_review_segments to authenticated;
  end if;

  if to_regclass('public.ai_review_approval_events') is not null then
    grant select, insert on public.ai_review_approval_events to authenticated;
  end if;
end $$;

-- Security-definer RPC for reliable suggestion inserts (used by document analysis).
-- Uses inline auth/project checks so it does not depend on helper functions at
-- runtime beyond profiles/projects/documents tables.
create or replace function public.insert_ai_review_suggestions(
  p_project_id uuid,
  p_document_id uuid,
  p_trade_focus text,
  p_suggestions jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_item jsonb;
  v_count integer := 0;
  v_confidence numeric;
  v_page_number integer;
  v_quantity numeric;
  v_description text;
  v_source_document_id uuid;
begin
  select p.organisation_id
  into v_org_id
  from public.projects p
  inner join public.profiles pr
    on pr.organisation_id = p.organisation_id
   and pr.id = auth.uid()
  where p.id = p_project_id;

  if v_org_id is null then
    raise exception 'project_access_denied' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.documents d
    where d.id = p_document_id
      and d.project_id = p_project_id
      and d.organisation_id = v_org_id
  ) then
    raise exception 'document_not_found' using errcode = '22023';
  end if;

  if p_suggestions is null or jsonb_typeof(p_suggestions) <> 'array' then
    return 0;
  end if;

  for v_item in select value from jsonb_array_elements(p_suggestions)
  loop
    v_description := nullif(trim(coalesce(v_item->>'description', '')), '');
    if v_description is null then
      continue;
    end if;

    v_confidence := null;
    if v_item ? 'confidence' and v_item->>'confidence' is not null then
      v_confidence := (v_item->>'confidence')::numeric;
      if v_confidence > 1 then
        v_confidence := greatest(0::numeric, least(1::numeric, v_confidence / 100));
      else
        v_confidence := greatest(0::numeric, least(1::numeric, v_confidence));
      end if;
    end if;

    v_quantity := greatest(0::numeric, coalesce((v_item->>'quantity')::numeric, 0));

    v_page_number := null;
    if v_item ? 'page_number' and v_item->>'page_number' is not null then
      v_page_number := floor((v_item->>'page_number')::numeric)::integer;
      if v_page_number <= 0 then
        v_page_number := null;
      end if;
    end if;

    v_source_document_id := p_document_id;
    if v_item ? 'source_document_id' and v_item->>'source_document_id' is not null then
      if exists (
        select 1
        from public.documents d
        where d.id = (v_item->>'source_document_id')::uuid
          and d.project_id = p_project_id
          and d.organisation_id = v_org_id
      ) then
        v_source_document_id := (v_item->>'source_document_id')::uuid;
      end if;
    end if;

    insert into public.ai_review_items (
      organisation_id,
      project_id,
      status,
      confidence,
      trade,
      description,
      quantity,
      unit,
      reasoning,
      source_document_id,
      drawing_reference,
      sheet_number,
      page_number
    ) values (
      v_org_id,
      p_project_id,
      'pending',
      v_confidence,
      coalesce(
        nullif(trim(coalesce(v_item->>'trade', '')), ''),
        nullif(trim(coalesce(p_trade_focus, '')), ''),
        'General'
      ),
      v_description,
      v_quantity,
      coalesce(nullif(trim(coalesce(v_item->>'unit', '')), ''), 'each'),
      nullif(trim(coalesce(v_item->>'reasoning', '')), ''),
      v_source_document_id,
      nullif(trim(coalesce(v_item->>'drawing_reference', '')), ''),
      nullif(trim(coalesce(v_item->>'sheet_number', '')), ''),
      v_page_number
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.insert_ai_review_suggestions(uuid, uuid, text, jsonb) from public;
grant execute on function public.insert_ai_review_suggestions(uuid, uuid, text, jsonb) to authenticated;

-- Ensure ai_review_items RLS policies reference working helpers (idempotent).
alter table public.ai_review_items enable row level security;

drop policy if exists "ai_review_items_select_own_org" on public.ai_review_items;
create policy "ai_review_items_select_own_org"
  on public.ai_review_items
  for select
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

drop policy if exists "ai_review_items_insert_own_org" on public.ai_review_items;
create policy "ai_review_items_insert_own_org"
  on public.ai_review_items
  for insert
  to authenticated
  with check (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );

drop policy if exists "ai_review_items_update_own_org" on public.ai_review_items;
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

drop policy if exists "ai_review_items_delete_own_org" on public.ai_review_items;
create policy "ai_review_items_delete_own_org"
  on public.ai_review_items
  for delete
  to authenticated
  using (
    organisation_id = public.current_organisation_id()
    and public.project_belongs_to_current_org(project_id)
  );
