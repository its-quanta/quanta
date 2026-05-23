# Build roadmap

High-level delivery plan for Quanta MVP. Detailed implementation order lives in [build-sequence.md](./build-sequence.md).

**Strategy:** Ship working vertical slices. **Manual estimating before AI.** Database before decorative UI.

## Milestones

| Milestone | Name | Outcome | Depends on |
|-----------|------|---------|------------|
| M0 | Foundation | Auth, Supabase, app shell, org tables + RLS | — |
| M1 | Organisation ready | Profile + default rates/margins | M0 |
| M2 | Project workspace | Create/open projects; workspace navigation | M1 |
| M3 | Documents | Upload and manage tender files | M2 |
| M4 | Manual estimate core | Takeoff + materials + labour tables | M3 |
| M5 | Pricing and clarifications | Sell price, exclusions, assumptions, RFIs | M4 |
| M6 | Export and governance | Excel export + audit activity | M5 |
| M7 | AI takeoff draft | Draft generation + review/accept | M6 |

M7 is **MVP scope** per feature lock but **gates on M6** so manual truth paths are proven first.

## Timeline shape (indicative)

No fixed calendar — use milestones as sprint themes. Suggested focus per week for a solo builder:

| Week | Focus | Exit criteria |
|------|--------|---------------|
| 1 | M0–M1 | Sign in, org profile, settings saved |
| 2 | M2–M3 | Project workspace + document upload |
| 3 | M4 (takeoff) | Manual takeoff CRUD end-to-end |
| 4 | M4 (build-up) | Materials and labour tables + subtotals |
| 5 | M5 | Pricing engine + clarifications |
| 6 | M6 | Excel export matches DB; audit feed |
| 7+ | M7 | AI draft pipeline + review UI |

Adjust pace for team size; do not start M7 until M6 definition of done passes.

## Deliverables by milestone

### M0 — Foundation

- Supabase project (Auth, DB, Storage)
- Next.js App Router layout
- Tailwind + Shadcn base components
- Migrations: organisations, members, settings
- Environment and Vercel preview deploy

### M1 — Organisation ready

- Sign up / sign in flows
- Onboarding creates organisation
- Settings page for default rates and margins
- Dashboard shell (project list placeholder)

### M2 — Project workspace

- Projects CRUD
- Workspace tabs and project header (status, client, due date)
- Empty states per tab

### M3 — Documents

- Storage bucket policies
- Upload/list/download/delete UI
- Document types on metadata

### M4 — Manual estimate core

- `takeoff_items` editable grid
- `material_lines` and `labour_lines` with subtotals
- Link takeoff → materials/labour optional but supported

### M5 — Pricing and clarifications

- `project_pricing_summary` with margin/markup
- Pricing tab with transparent breakdown
- Clarifications CRUD (three types)

### M6 — Export and governance

- `audit_events` wired to mutations
- Activity tab
- Excel export route + audit on export
- **MVP feature-complete for manual tender workflow**

### M7 — AI takeoff draft

- `ai_generation_runs` + `takeoff_draft_items`
- Server-side generation from selected documents
- Review UI with accept/reject/edit
- Promote to `takeoff_items` only on user action

## Post-MVP backlog (do not build in MVP)

Tracked for prioritisation after M7 and production dogfooding:

1. Team invitations and roles
2. Supplier price libraries (manual import first)
3. Accounting export (Xero, MYOB, etc.)
4. Subscription billing
5. Mobile-friendly layouts
6. BIM / measure integration
7. Historical project search and benchmarks
8. Collaboration (comments, assignments)

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| AI inaccuracy on drawings | Draft-only table; strong review UI; manual path first |
| Scope creep (CRM, scheduling) | [mvp-feature-lock.md](./mvp-feature-lock.md) out-of-scope list |
| UI without data | [build-sequence.md](./build-sequence.md) vertical slice rule |
| Cross-tenant data leak | [security-rules.md](./security-rules.md) RLS checklist per PR |
| Export mismatch with UI | Single calculation path shared by pricing tab and export |

## Definition of MVP launch

Launch when **M6** definition of done is complete for a pilot subcontractor:

- Can run a real tender manually from project create to Excel export
- Audit trail trusted for internal review
- Organisation defaults reduce repetitive entry

**M7** can ship immediately after launch to the same pilot or in the same release if stable — but manual workflow must not regress.

## Document map

| Document | Purpose |
|----------|---------|
| [product-scope.md](./product-scope.md) | What we build and for whom |
| [mvp-feature-lock.md](./mvp-feature-lock.md) | Locked in/out list |
| [build-sequence.md](./build-sequence.md) | Step-by-step build order |
| [database-schema.md](./database-schema.md) | Tables and relationships |
| [user-flows.md](./user-flows.md) | Journeys |
| [ai-workflows.md](./ai-workflows.md) | AI draft pipeline |
| [security-rules.md](./security-rules.md) | RLS and safety |
| [design-system.md](./design-system.md) | UI standards |
| [definition-of-done.md](./definition-of-done.md) | Acceptance criteria |

## Related documents

- [build-sequence.md](./build-sequence.md)
- [definition-of-done.md](./definition-of-done.md)
- [mvp-feature-lock.md](./mvp-feature-lock.md)
