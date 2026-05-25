-- Add updated_at to takeoff_item_assemblies (Apply Package v1 schema)

alter table public.takeoff_item_assemblies
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists takeoff_item_assemblies_set_updated_at on public.takeoff_item_assemblies;

create trigger takeoff_item_assemblies_set_updated_at
  before update on public.takeoff_item_assemblies
  for each row
  execute function public.set_updated_at();
