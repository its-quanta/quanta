# Build sequence

Order of implementation for Quanta MVP. Follow **one vertical workflow at a time**: database → RLS → server actions/API → UI → audit/export.

Do not ship UI that pretends to save data without a backing table and policy, except short-lived prototypes clearly marked in PR descriptions.

**Build manual workflows before AI.**

## Phase 0 — Foundation

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 0.1 | Supabase project, env vars, `@supabase/ssr` clients | Auth session works in dev |
| 0.2 | Base Next.js layout, design tokens, Shadcn primitives | App shell renders |
| 0.3 | Migrations: `organisations`, `organisation_members`, `organisation_settings` | RLS tested |

## Phase 1 — Access and organisation

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 1.1 | Sign up / sign in / sign out | User can authenticate |
| 1.2 | Onboarding: create organisation on first login | Profile persisted |
| 1.3 | Organisation profile page (name, contact, logo optional) | Edit and save |
| 1.4 | Settings: default labour rate, margin, markup | Used as defaults on new projects |

**Vertical slice:** User signs in → sees org profile → updates default rates.

## Phase 2 — Projects and workspace shell

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 2.1 | `projects` table + list/create UI | Projects scoped to org |
| 2.2 | Project workspace layout (tabs or nav): Overview, Documents, Takeoff, Materials, Labour, Pricing, Clarifications, Export, Activity | Navigation works with empty states |
| 2.3 | Project metadata edit (client, reference, due date, status) | Saves with audit |

**Vertical slice:** Create project → open workspace → edit details.

## Phase 3 — Documents

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 3.1 | Storage bucket + `project_documents` | Upload PDF/image |
| 3.2 | Document list with type and download | RLS-enforced access |
| 3.3 | Link documents from project overview | Audit on upload/delete |

**Vertical slice:** Upload tender drawing → see it on project → download again.

## Phase 4 — Manual takeoff (critical path)

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 4.1 | `takeoff_items` CRUD table UI | Add/edit/delete/reorder rows |
| 4.2 | Units and quantities validation | Invalid input blocked server-side |
| 4.3 | Audit on takeoff changes | Activity tab shows events |

**Vertical slice:** Enter BOQ-style lines manually → data survives refresh.

## Phase 5 — Materials and labour

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 5.1 | `material_lines` table + UI | Lines optional link to takeoff item |
| 5.2 | `labour_lines` table + UI | Rates default from org settings |
| 5.3 | Subtotals per section | Visible in workspace |

**Vertical slice:** Takeoff quantities drive material/labour lines → subtotals update.

## Phase 6 — Pricing engine

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 6.1 | `project_pricing_summary` recalculation | Direct cost = materials + labour |
| 6.2 | Margin and markup UI (project overrides) | Calculations documented in UI |
| 6.3 | Sell price total on project header | Matches export logic |

**Vertical slice:** Change margin → sell price updates → audit records pricing change.

## Phase 7 — Clarifications

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 7.1 | `tender_clarifications` CRUD | Exclusions, assumptions, RFIs |
| 7.2 | RFI status field | Open/answered/closed |
| 7.3 | Include in export sheet | Appears in Excel |

## Phase 8 — Export and audit

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 8.1 | `audit_events` on all major mutations | Activity feed per project |
| 8.2 | Excel export route (takeoff, materials, labour, pricing, clarifications) | Download matches DB |
| 8.3 | Export logged in audit | Traceable who exported when |

**Vertical slice:** Complete manual estimate → export Excel → open file offline.

## Phase 9 — AI-assisted takeoff (after Phase 4–8 stable)

| Step | Deliverable | Done when |
|------|-------------|-----------|
| 9.1 | `takeoff_draft_items`, `ai_generation_runs` | Draft rows isolated |
| 9.2 | Server-side AI job from selected documents | Returns draft batch |
| 9.3 | Review UI: accept / reject / edit per line | Accepted lines copy to `takeoff_items` with `source = ai_approved` |
| 9.4 | Audit approve/reject | No silent merges |

**Vertical slice:** Run AI draft → review → accept lines → manual pricing unchanged in trust model.

## Dependency graph

```
Phase 0 → Phase 1 → Phase 2 → Phase 3
                              ↓
                         Phase 4 (manual takeoff)
                              ↓
                    Phase 5 → Phase 6 → Phase 7
                              ↓
                         Phase 8 (export/audit)
                              ↓
                         Phase 9 (AI) — optional gate: Phase 8 complete
```

## What not to do early

- Team invitations and roles beyond owner
- Supplier pricing APIs
- BIM viewer
- Real-time multiplayer editing
- Subscription billing

## Related documents

- [build-roadmap.md](./build-roadmap.md) — Milestones and timelines
- [definition-of-done.md](./definition-of-done.md) — Acceptance criteria
- [mvp-feature-lock.md](./mvp-feature-lock.md)
