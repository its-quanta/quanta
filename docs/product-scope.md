# Product scope

## What Quanta is

Quanta is an AI-assisted estimating and tender workspace for small contractors and subcontractors. It helps teams turn drawings and specifications into structured takeoffs, priced build-ups, and exportable tender outputs — without enterprise estimating software complexity.

The database is the source of truth. AI assists drafting; users review and approve everything that leaves the workspace.

## Target users

Primary:

- Fitout contractors
- Carpentry subcontractors
- Demolition and deconstruction contractors
- Ceiling installers
- Joinery installers
- Flooring contractors
- Specialty installers
- Small commercial builders

Secondary:

- Estimators and QS teams working with subcontractors (review, markup, coordination)

### User needs (MVP)

- Create and manage tender projects in one place
- Upload tender documents (drawings, specs, schedules)
- Build takeoffs manually first, with AI draft assistance later
- Price materials and labour with organisation defaults
- Record exclusions, assumptions, and RFIs
- Export to Excel for submission or internal review
- See what changed and who approved it

## MVP in scope

Aligned with [mvp-feature-lock.md](./mvp-feature-lock.md):

| Area | Capability |
|------|------------|
| Access | Authentication (email/password or magic link via Supabase Auth) |
| Organisation | Organisation profile and settings |
| Projects | Project creation and project workspace |
| Documents | Document upload and listing per project |
| Takeoff | Manual takeoff table; AI-assisted takeoff draft generation (after manual path works) |
| Build-up | Material takeoff table; labour build-up table |
| Pricing | Pricing engine; margin and markup calculations |
| Tender clarity | Exclusions, assumptions, RFIs |
| Output | Excel export |
| Governance | Audit trail and user corrections |
| Defaults | Basic settings for default rates and margins |

## Explicitly out of scope (MVP)

Do not build these until post-MVP unless the feature lock is updated:

- Mobile app
- Accounting integrations
- Supplier live pricing
- Full BIM viewer
- Team invitations and multi-user collaboration beyond a single org context
- Payments and subscriptions
- Marketplace
- Scheduling
- Invoicing
- CRM
- Advanced real-time collaboration
- Full automatic measuring engine (quantity extraction from geometry)

## Product principles

1. **Subcontractor-first** — Tables, rates, and exports match how small trade businesses actually tender.
2. **Manual before AI** — Manual takeoff and pricing workflows must work end-to-end before AI draft features ship.
3. **Draft only** — AI outputs are proposals. Nothing is “final” until a user reviews and approves.
4. **One vertical at a time** — Ship complete flows (auth → data → UI → export), not isolated screens.
5. **Organisation isolation** — Every record belongs to an organisation; no cross-tenant data leakage.
6. **Simple over clever** — Prefer editable tables and clear totals over automation that users cannot audit.

## Success criteria (MVP)

A subcontractor can:

1. Sign in and set up their organisation profile and default rates.
2. Create a project, upload tender documents, and open a project workspace.
3. Enter quantities in a manual takeoff table, then materials and labour build-ups.
4. Apply pricing, margins, and markups with visible calculations.
5. Document exclusions, assumptions, and RFIs on the tender.
6. Export a structured Excel pack suitable for review or submission.
7. See an audit trail of changes and approvals.

Optional in MVP (after manual path): generate an AI-assisted takeoff draft, review it, and merge approved lines into the live tables.

## Related documents

- [mvp-feature-lock.md](./mvp-feature-lock.md) — Locked feature list
- [build-roadmap.md](./build-roadmap.md) — Phased delivery plan
- [user-flows.md](./user-flows.md) — End-to-end journeys
- [database-schema.md](./database-schema.md) — Data model
- [security-rules.md](./security-rules.md) — Access and safety rules
