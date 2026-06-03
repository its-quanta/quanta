-- Repair ai_review_items on databases that were created without approval/link columns.

alter table public.ai_review_items
  add column if not exists result_takeoff_item_id uuid
    references public.takeoff_items (id) on delete set null;

alter table public.ai_review_items
  add column if not exists accepted_by uuid
    references auth.users (id) on delete set null;

alter table public.ai_review_items
  add column if not exists accepted_at timestamptz;

alter table public.ai_review_items
  add column if not exists review_notes text;

alter table public.ai_review_items
  add column if not exists updated_at timestamptz not null default now();

alter table public.ai_review_items
  add column if not exists overlay_geometry jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'ai_review_items_set_updated_at'
  ) then
    create trigger ai_review_items_set_updated_at
      before update on public.ai_review_items
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- Security-definer accept update (mirrors insert/list RPC pattern).
create or replace function public.mark_ai_review_item_accepted(
  p_item_id uuid,
  p_project_id uuid,
  p_takeoff_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
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

  update public.ai_review_items
  set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    result_takeoff_item_id = p_takeoff_item_id
  where id = p_item_id
    and project_id = p_project_id
    and organisation_id = v_org_id;

  if not found then
    raise exception 'suggestion_not_found' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.mark_ai_review_item_accepted(uuid, uuid, uuid) from public;
grant execute on function public.mark_ai_review_item_accepted(uuid, uuid, uuid) to authenticated;
