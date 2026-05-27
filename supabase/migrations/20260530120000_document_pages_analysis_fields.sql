-- Document page metadata for batched AI analysis

alter table public.document_pages
  add column if not exists project_id uuid references public.projects (id) on delete cascade;

update public.document_pages dp
set project_id = d.project_id
from public.documents d
where d.id = dp.document_id
  and dp.project_id is null;

alter table public.document_pages
  add column if not exists page_label text,
  add column if not exists page_type text,
  add column if not exists include_in_analysis boolean not null default false,
  add column if not exists analysis_status text;

create index if not exists document_pages_project_document_idx
  on public.document_pages (project_id, document_id, page_number asc);
