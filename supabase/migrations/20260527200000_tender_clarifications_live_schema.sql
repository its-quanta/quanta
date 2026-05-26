-- Align tender_clarifications with live schema (if an older migration was applied).

alter table public.tender_clarifications
  add column if not exists related_drawing text,
  add column if not exists related_takeoff_item_id uuid references public.takeoff_items (id) on delete set null,
  add column if not exists ai_generated boolean not null default false,
  add column if not exists reviewed boolean not null default false;

-- Copy legacy column data when present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tender_clarifications'
      and column_name = 'related_drawing_reference'
  ) then
    execute $sql$
      update public.tender_clarifications
      set related_drawing = related_drawing_reference
      where related_drawing is null
        and related_drawing_reference is not null
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tender_clarifications'
      and column_name = 'takeoff_item_id'
  ) then
    execute $sql$
      update public.tender_clarifications
      set related_takeoff_item_id = takeoff_item_id
      where related_takeoff_item_id is null
        and takeoff_item_id is not null
    $sql$;
  end if;
end $$;

alter table public.tender_clarifications
  drop constraint if exists tender_clarifications_type_check;

alter table public.tender_clarifications
  add constraint tender_clarifications_type_check
  check (
    type in (
      'exclusion',
      'assumption',
      'rfi',
      'clarification',
      'risk',
      'note'
    )
  );
