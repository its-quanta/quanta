-- Optional column for manual sell-rate override (add if pricing_items predates this field)

alter table public.pricing_items
  add column if not exists sell_rate_overridden boolean not null default false;
