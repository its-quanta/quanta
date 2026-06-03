-- Drawing register: revision per sheet/page

alter table public.document_pages
  add column if not exists revision text;
