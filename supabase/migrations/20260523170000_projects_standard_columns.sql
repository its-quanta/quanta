-- Backfill standard project columns on databases created before the full schema

alter table public.projects add column if not exists tender_due_date date;
alter table public.projects add column if not exists notes text;
alter table public.projects add column if not exists site_address text;
alter table public.projects add column if not exists project_type text;
alter table public.projects add column if not exists trade_scope text;
alter table public.projects add column if not exists estimated_value numeric;
