-- Ensure uploaded_by exists for document uploads and RLS

alter table public.documents
  add column if not exists uploaded_by uuid references auth.users (id) on delete set null;
