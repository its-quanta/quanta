# Definition of done

A feature is **done** when it meets the criteria below. Applies to every vertical slice in [build-sequence.md](./build-sequence.md).

## Global done criteria

Every shipped feature must satisfy:

### Product

- [ ] Matches [mvp-feature-lock.md](./mvp-feature-lock.md) for that capability (or documented deferral with user approval)
- [ ] British English in all user-visible strings
- [ ] Subcontractor-relevant labels and defaults (trade language, not ERP jargon)
- [ ] Empty, loading, and error states implemented
- [ ] AI features (if any) labelled as draft; no auto-publish to live tables

### Data

- [ ] Persisted in Supabase PostgreSQL — not mock data when table exists
- [ ] `organisation_id` (or join via `project_id`) on all tenant rows
- [ ] RLS policies enabled and manually tested (own org ✓, other org ✗)
- [ ] Migrations committed; no manual-only production schema drift
- [ ] Destructive actions audited in `audit_events` where applicable

### Application

- [ ] TypeScript strict — no `any` without justified comment
- [ ] Server-side validation on writes (Zod or equivalent)
- [ ] Auth required; organisation resolved from session, not client-supplied IDs alone
- [ ] No API keys or service role in client bundle
- [ ] Reusable components where the same pattern appears twice

### UX

- [ ] Follows [design-system.md](./design-system.md)
- [ ] Keyboard-focusable controls; forms labelled
- [ ] Totals and pricing visible and explainable to user
- [ ] Works on desktop Chrome/Edge/Safari latest (MVP target)

### Quality

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Manual test notes in PR or task (steps + expected result)
- [ ] No unrelated file changes

## Feature-specific done criteria

### Authentication

- [ ] Sign up, sign in, sign out, session refresh
- [ ] Protected routes redirect unauthenticated users
- [ ] Sign-out clears session

### Organisation profile

- [ ] Create/edit organisation details
- [ ] Data visible only to org members
- [ ] Logo upload optional with Storage policy

### Organisation settings (defaults)

- [ ] Default labour rate, margin %, markup % saved
- [ ] New projects inherit defaults (user can override per project)

### Project creation and workspace

- [ ] Create, list, open, archive/edit project metadata
- [ ] Workspace navigation across all tabs (content may be empty in earlier phases)
- [ ] Project list sorted by recent activity

### Document upload

- [ ] Upload, list, download, delete per project
- [ ] File type and size limits enforced with clear errors
- [ ] Storage path matches org/project isolation

### Manual takeoff table

- [ ] Full CRUD + reorder on `takeoff_items`
- [ ] Quantities and units validated
- [ ] Survives page refresh; audit on changes

### Material takeoff table

- [ ] CRUD on `material_lines`; line totals correct
- [ ] Optional link to takeoff item
- [ ] Subtotal matches sum of lines

### Labour build-up table

- [ ] CRUD on `labour_lines`; default rate from settings
- [ ] Subtotal matches sum of lines

### Pricing engine

- [ ] Direct cost = materials + labour
- [ ] Margin and markup applied per documented formula
- [ ] `project_pricing_summary` matches UI and export

### Assemblies / pricing packages (basic)

- [ ] Phases 4–6 complete before this slice ships
- [ ] CRUD on `pricing_packages`, `pricing_package_material_components`, `pricing_package_labour_components`
- [ ] References on `pricing_package_references` (NZS 3604, building code clauses, specs, drawings, manufacturer guides, custom)
- [ ] Package unit, wastage, cost/sell, markup, margin, notes, and assumptions editable
- [ ] Apply package on `takeoff_items`; explosion creates/updates linked lines with `source = package_explosion`
- [ ] Exploded quantities = takeoff quantity × component per package unit (with wastage on materials)
- [ ] User can edit exploded project lines without changing org package template
- [ ] Re-apply requires explicit confirm if overwriting existing exploded lines
- [ ] `project_pricing_summary` includes exploded lines; audit on package create/update/apply
- [ ] Organisation RLS on all package tables

### Clarifications (exclusions, assumptions, RFIs)

- [ ] CRUD with type discriminator
- [ ] RFI status workflow (open / answered / closed)
- [ ] Included in Excel export

### Excel export

- [ ] Server-generated file from current DB state
- [ ] Sheets: Summary, Takeoff, Materials, Labour, Pricing, Clarifications
- [ ] Totals match in-app figures
- [ ] Export audited

### Audit trail

- [ ] Create/update/delete on takeoff, materials, labour, pricing, packages, clarifications logged
- [ ] Activity view per project with timestamp and user
- [ ] AI accept/reject logged

### AI-assisted takeoff draft

- [ ] Draft rows isolated in `takeoff_draft_items`
- [ ] Accept/reject/edit-before-accept flows complete
- [ ] Accepted lines appear in live takeoff with `source = ai_approved`
- [ ] Rejected lines never affect pricing
- [ ] Disclaimer shown before run
- [ ] Phase 4–8 manual path already done

## Not required for MVP done

- Automated E2E test suite (unless introduced project-wide)
- Mobile responsive polish
- Performance benchmarks
- Team invitations
- Billing
- AI-suggested packages without user acceptance
- Shared cross-tenant package marketplace
- Package versioning / effective-date schedules
- Supplier live pricing inside packages

## PR checklist (copy for reviewers)

1. Which user flow from [user-flows.md](./user-flows.md) does this complete?
2. Which build phase from [build-sequence.md](./build-sequence.md)?
3. RLS tested?
4. Audit events where needed?
5. AI draft-only rules respected?
6. Screenshot or short Loom optional but encouraged for UI slices

## Related documents

- [build-sequence.md](./build-sequence.md)
- [security-rules.md](./security-rules.md)
- [mvp-feature-lock.md](./mvp-feature-lock.md)
