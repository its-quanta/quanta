-- Ensure document_pages upsert conflict target exists for analysis status updates.

do $$
begin
  alter table public.document_pages
    add constraint document_pages_document_id_page_number_key
    unique (document_id, page_number);
exception
  when duplicate_object then null;
  when duplicate_table then null;
end $$;
