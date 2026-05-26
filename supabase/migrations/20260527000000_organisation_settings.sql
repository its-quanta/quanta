-- Organisation profile and estimating defaults (localisation)

alter table public.organisations
  add column if not exists country text,
  add column if not exists currency text,
  add column if not exists tax_rate numeric,
  add column if not exists default_margin_percentage numeric,
  add column if not exists default_markup_percentage numeric,
  add column if not exists default_labour_cost_rate numeric,
  add column if not exists default_labour_charge_rate numeric;

alter table public.organisations
  drop constraint if exists organisations_currency_check;

alter table public.organisations
  add constraint organisations_currency_check
  check (
    currency is null
    or currency in ('NZD', 'AUD', 'GBP', 'USD', 'EUR')
  );

alter table public.organisations
  drop constraint if exists organisations_tax_rate_check;

alter table public.organisations
  add constraint organisations_tax_rate_check
  check (
    tax_rate is null
    or (tax_rate >= 0 and tax_rate <= 100)
  );

alter table public.organisations
  drop constraint if exists organisations_default_margin_check;

alter table public.organisations
  add constraint organisations_default_margin_check
  check (
    default_margin_percentage is null
    or (
      default_margin_percentage >= 0
      and default_margin_percentage < 100
    )
  );

alter table public.organisations
  drop constraint if exists organisations_default_markup_check;

alter table public.organisations
  add constraint organisations_default_markup_check
  check (
    default_markup_percentage is null
    or default_markup_percentage >= 0
  );
