-- Reliable read path for ai_review_items when table GRANT/RLS direct select fails.

create or replace function public.list_ai_review_items_for_project(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_result jsonb;
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

  select coalesce(
    jsonb_agg(row_json order by created_at desc),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      to_jsonb(i) as row_json,
      i.created_at
    from public.ai_review_items i
    where i.project_id = p_project_id
      and i.organisation_id = v_org_id
  ) rows;

  return v_result;
end;
$$;

revoke all on function public.list_ai_review_items_for_project(uuid) from public;
grant execute on function public.list_ai_review_items_for_project(uuid) to authenticated;
