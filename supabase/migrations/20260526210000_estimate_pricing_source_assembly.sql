-- Allow pricing_source = 'assembly' on generated estimate lines

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'estimate_pricing_source'
      and e.enumlabel = 'assembly'
  ) then
    alter type public.estimate_pricing_source add value 'assembly';
  end if;
end
$$;
