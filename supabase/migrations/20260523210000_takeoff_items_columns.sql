-- Backfill takeoff_items columns on databases created before the full schema

alter table public.takeoff_items add column if not exists source_document_id uuid references public.documents (id) on delete set null;
alter table public.takeoff_items add column if not exists trade text default 'General';
alter table public.takeoff_items add column if not exists item_name text default '';
alter table public.takeoff_items add column if not exists drawing_reference text;
alter table public.takeoff_items add column if not exists page_number integer;
alter table public.takeoff_items add column if not exists confidence_score numeric;
alter table public.takeoff_items add column if not exists ai_generated boolean default false;
alter table public.takeoff_items add column if not exists reviewed boolean default false;
alter table public.takeoff_items add column if not exists status text default 'needs_review';
alter table public.takeoff_items add column if not exists sort_order integer default 0;

-- Migrate legacy item_code into item_name when present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'takeoff_items'
      and column_name = 'item_code'
  ) then
    execute $sql$
      update public.takeoff_items
      set item_name = item_code
      where (item_name is null or item_name = '')
        and item_code is not null
        and item_code <> ''
    $sql$;
  end if;
end
$$;

update public.takeoff_items set trade = 'General' where trade is null;
update public.takeoff_items set item_name = '' where item_name is null;
update public.takeoff_items set status = 'needs_review' where status is null;
update public.takeoff_items set sort_order = 0 where sort_order is null;
update public.takeoff_items set ai_generated = false where ai_generated is null;
update public.takeoff_items set reviewed = false where reviewed is null;
