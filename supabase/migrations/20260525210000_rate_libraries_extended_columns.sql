-- Optional columns for rate library UI (idempotent)

alter table public.labour_rates
  add column if not exists role text,
  add column if not exists is_active boolean not null default true;

alter table public.material_rates
  add column if not exists notes text,
  add column if not exists is_active boolean not null default true;

alter table public.supplier_rates
  add column if not exists category text,
  add column if not exists notes text,
  add column if not exists is_active boolean not null default true;

alter table public.subcontractor_rates
  add column if not exists is_active boolean not null default true;
