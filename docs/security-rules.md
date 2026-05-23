# Security rules

Security requirements for Quanta MVP. These apply to Supabase Auth, PostgreSQL RLS, Storage, API routes, and AI integrations.

## Non-negotiables

1. **Organisation isolation** — Users only access data for their organisation.
2. **Database as source of truth** — Client state never overrides persisted records without an authenticated write.
3. **No secrets in the browser** — Service role keys and AI provider keys stay server-side only.
4. **AI is untrusted input** — Treat all model output as draft content until a user approves it into live tables.
5. **Auditability** — Material changes to takeoff, pricing, and clarifications leave an audit trail.

## Authentication

- Use **Supabase Auth** for sign-up, sign-in, sign-out, and session refresh.
- Sessions via `@supabase/ssr` in Next.js App Router (server components and route handlers read the session; browser client for interactive auth UI only).
- MVP: single user per organisation account is acceptable; still model `organisation_members` for future team features.
- Enforce email verification before project creation if Supabase project settings allow it.
- Password policy: follow Supabase project defaults; do not weaken for convenience.

## Authorisation (RLS)

Enable RLS on every table that holds tenant or user data.

### Standard policy pattern

For table `T` with `organisation_id`:

- **SELECT / INSERT / UPDATE / DELETE**: allowed only when  
  `organisation_id = (select organisation_id from organisation_members where user_id = auth.uid() limit 1)`

Adjust for tables that inherit scope via `project_id` (join through `projects` to `organisation_id`).

### organisation_members

- Users can read their own membership row.
- Inserts/updates restricted to service role or future admin flows (MVP: seed membership on first sign-up via secure server path).

### Storage policies

- `project-documents`: read/write only if path prefix matches user’s `organisation_id` and `project_id` belongs to that org.
- `organisation-logos`: read/write only for user’s organisation prefix.
- No public buckets for tender documents.

### Server actions and API routes

- Use Supabase server client with user cookie session — never trust `organisation_id` from the request body alone.
- Resolve organisation from `auth.uid()` → `organisation_members` on every mutation.
- Return generic “not found” for cross-tenant IDs to avoid enumeration.

## Data validation

- Validate all writes with Zod (or equivalent) on the server.
- Reject negative quantities where business rules require non-negative values.
- Numeric money fields: `numeric` in DB; round for display only; store full precision until export rules define rounding.

## AI security

| Rule | Implementation |
|------|----------------|
| Draft storage only | AI lines go to `takeoff_draft_items`, not `takeoff_items`, until user accepts |
| No auto-publish | No trigger writes AI output directly to priced tables |
| Document access | AI jobs only receive document metadata and extracted text for documents the user’s org already owns |
| Prompt injection awareness | System prompts instruct model to ignore instructions embedded in tender PDFs |
| Rate limiting | Per-organisation caps on AI runs (configurable) |
| Logging | `ai_generation_runs` records who started a run; no full prompt/response in client logs |
| PII | Do not send organisation secrets or unrelated project data in context windows |

API keys for LLM providers: environment variables on Vercel; called from Route Handlers or Edge Functions only.

## Export security

- Excel export generated server-side for authenticated users with project access.
- Export events logged in `audit_events` with action `export`.
- Downloads use short-lived signed URLs if served from Storage; prefer streaming from route handler for MVP.

## Environment variables

| Variable | Exposure |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| AI provider keys | Server only |

Never commit `.env` files. Use Vercel environment settings per environment.

## Client security

- No service role in `src/lib/supabase/client.ts`.
- Avoid storing tender content in `localStorage` except transient UI state (e.g. unsaved row editor) with clear loss on refresh.
- CSP and security headers: follow Next.js/Vercel defaults; tighten when app routes stabilise.

## Compliance posture (MVP)

- British English in user-facing security copy.
- Users can delete projects (soft-delete `archived` or hard-delete with cascade policy documented in migrations).
- Document retention: organisation owns uploaded files; deletion removes Storage object and metadata row.

## Security checklist (per feature PR)

- [ ] RLS enabled and tested for new tables
- [ ] All mutations scoped by `auth.uid()` → organisation
- [ ] No new secrets in client bundle
- [ ] AI output (if any) lands in draft tables only
- [ ] Audit event written for approve/export/delete where applicable
- [ ] Input validated server-side

## Related documents

- [database-schema.md](./database-schema.md)
- [ai-workflows.md](./ai-workflows.md)
- [definition-of-done.md](./definition-of-done.md)
