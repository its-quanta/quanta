# Product scope

## What Quanta is

Quanta is an AI-assisted estimating and tender workspace for small contractors and subcontractors. It helps teams turn drawings and specifications into structured takeoffs, priced build-ups, and exportable tender outputs — without enterprise estimating software complexity.

Dashboard Principle:
The dashboard must function as a Tender Command Centre, not a generic admin dashboard. It should help users quickly understand tender deadlines, project status, pricing progress, missing review items, RFIs, exclusions, risks and next actions.

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
- Reuse company-specific priced build-ups (assemblies / packages) on tender lines

## Product concept: Assemblies / packages

**Assemblies** (also called **packages** in the UI) are reusable, organisation-scoped priced build-ups that subcontractors use across tenders. A package defines how much material and labour is required per unit of measure, plus pricing behaviour, notes, assumptions, and references to standards or specifications.

Example package name:

> 90×45 H1.2 Framed Wall with 13mm Standard GIB and Insulation

Priced per m², a package can include per unit:

- Material components required per m² (or per lm, each, etc.)
- Labour components required per m²
- Wastage
- Cost rate, sell rate, markup, and margin
- Notes and assumptions
- Linked building standards or references (e.g. NZS 3604 where applicable)

### What packages enable

| Capability | Description |
|------------|-------------|
| Reusable build-ups | Create once; apply on many projects and takeoff lines |
| Component breakdown | Material and labour defined per package unit |
| Apply to takeoff | User selects a package on a takeoff item; quantities drive exploded lines |
| Auto-explosion | Generate material takeoff and labour allowance rows from takeoff quantity × package rates |
| Pricing | Calculate cost, sell, margin, and markup from package and org defaults |
| Standards & references | Attach NZ standards, code clauses, specs, drawings, or custom references |
| Company pricing system | Encode trade-specific pricing logic the way the business already tenders |

### Example packages (future library)

These illustrate the kind of assemblies subcontractors will maintain — not an exhaustive MVP catalogue:

| Package | Typical unit |
|---------|----------------|
| Framed wall (e.g. 90×45 H1.2 + 13mm GIB + insulation) | m² |
| Suspended ceiling | m² |
| Demolition — wall removal | lm or m² |
| Door install | each |
| Flooring install | m² |
| Joinery install | each |
| GIB lining | m² |

### Standards and references

Packages and package applications should support linking or citing:

- **NZS 3604** and other NZ standards
- **NZ Building Code** clauses
- **Project specifications** (from uploaded spec documents)
- **Architectural drawing** references
- **Structural drawing** references
- **Manufacturer installation guides**
- **Custom user references** (free text or internal codes)

References are for estimator clarity and tender defensibility; they do not auto-validate compliance in MVP.

### Build order (do not overbuild)

1. **Manual takeoff** — quantity schedule is source of truth.
2. **Materials, labour, and pricing** — line-by-line build-up and sell price.
3. **Basic packages / assemblies** — org library, apply to takeoff, explode to material and labour lines.
4. **AI-assisted takeoff** — draft quantities; later, AI may **suggest** assemblies from takeoff context (post-MVP enhancement).

Full package libraries, supplier-linked rates, and AI package matching are out of scope for the first package slice. Ship editable tables and auditable calculations before automation.

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
| Assemblies / packages | Basic org package library; apply package to takeoff item; explode material and labour per unit (after manual takeoff and pricing path work) |
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
- Full assembly catalogue / marketplace shared across tenants
- AI auto-selection of packages without user review (suggestions only, when introduced)

## Product principles

1. **Subcontractor-first** — Tables, rates, and exports match how small trade businesses actually tender.
2. **Manual before AI** — Manual takeoff and pricing workflows must work end-to-end before AI draft features ship.
3. **Draft only** — AI outputs are proposals. Nothing is “final” until a user reviews and approves.
4. **One vertical at a time** — Ship complete flows (auth → data → UI → export), not isolated screens.
5. **Organisation isolation** — Every record belongs to an organisation; no cross-tenant data leakage.
6. **Simple over clever** — Prefer editable tables and clear totals over automation that users cannot audit.
7. **Packages after manual path** — Assemblies extend manual takeoff and pricing; they do not replace quantity entry or review.

## Success criteria (MVP)

A subcontractor can:

1. Sign in and set up their organisation profile and default rates.
2. Create a project, upload tender documents, and open a project workspace.
3. Enter quantities in a manual takeoff table, then materials and labour build-ups.
4. Apply pricing, margins, and markups with visible calculations.
5. (When packages ship) Create or pick an organisation package, apply it to a takeoff line, and review exploded material and labour with correct cost and sell totals.
6. Document exclusions, assumptions, and RFIs on the tender.
7. Export a structured Excel pack suitable for review or submission.
8. See an audit trail of changes and approvals.

Optional in MVP (after manual path): generate an AI-assisted takeoff draft, review it, and merge approved lines into the live tables.

Post-MVP (packages stable): AI suggests matching assemblies from takeoff item descriptions; user accepts or overrides before explosion.

## Related documents

- [mvp-feature-lock.md](./mvp-feature-lock.md) — Locked feature list
- [build-roadmap.md](./build-roadmap.md) — Phased delivery plan
- [user-flows.md](./user-flows.md) — End-to-end journeys
- [database-schema.md](./database-schema.md) — Data model
- [security-rules.md](./security-rules.md) — Access and safety rules
