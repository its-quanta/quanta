# User flows

End-to-end journeys for Quanta MVP. Each flow assumes an authenticated user with an organisation already created (see onboarding flow).

## 1. Onboarding and organisation setup

**Actor:** New subcontractor owner

**Goal:** Sign in and configure defaults before first tender.

```mermaid
flowchart LR
    A[Landing] --> B[Sign up / Sign in]
    B --> C{Has organisation?}
    C -->|No| D[Create organisation profile]
    C -->|Yes| E[Dashboard]
    D --> F[Set default rates and margins]
    F --> E
```

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Opens Quanta, chooses sign up | Supabase Auth creates user |
| 2 | Completes email verification if required | Session established |
| 3 | Enters company name and contact details | `organisations` + `organisation_members` created |
| 4 | Sets default labour rate, margin %, markup % | `organisation_settings` saved |
| 5 | (Later) Opens Packages library under org settings | Optional; Phase 7 — create reusable assemblies |
| 6 | Lands on project dashboard | Empty state with “Create project” |

**Success:** User can create a project with org defaults applied.

---

## 2. Create project and open workspace

**Actor:** Estimator or owner

**Goal:** Start a new tender job in the workspace.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Clicks “New project” | Form: name, client, reference, due date |
| 2 | Submits | `projects` row created (`status = draft`) |
| 3 | Opens project | Workspace tabs load (empty states) |
| 4 | Optionally edits overview metadata | Audit event `update` on project |

**Success:** Project appears in list; workspace URL is shareable within org (single-user MVP: bookmark for self).

---

## 3. Upload tender documents

**Actor:** Estimator

**Goal:** Attach drawings and specs for reference (and later AI).

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Goes to Documents tab | Lists existing uploads |
| 2 | Uploads PDF or image, picks type (drawing/spec/schedule) | File to Storage; `project_documents` row |
| 3 | Views or downloads file | Signed URL or proxy download |
| 4 | Deletes wrong file | Storage + row removed; audit logged |

**Success:** All tender files visible per project; no cross-project leakage.

---

## 4. Manual takeoff entry (primary path)

**Actor:** Estimator, trade lead

**Goal:** Build quantity schedule without AI.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Opens Takeoff tab | Editable table of `takeoff_items` |
| 2 | Adds rows: description, unit, quantity, location | Rows persisted; sort order maintained |
| 3 | Edits or deletes rows | Immediate save; audit per change |
| 4 | Reorders rows | `sort_order` updated |
| 5 | (Phase 7) Selects a package for a row | `pricing_package_id` set; unit should align with package unit |

**Success:** Takeoff table reflects ground truth quantities; refresh does not lose data.

---

## 5. Material and labour build-up

**Actor:** Estimator

**Goal:** Price the job from takeoff and trade knowledge.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Opens Materials tab | Table of `material_lines` |
| 2 | Adds materials manually (optional link to takeoff line) | Unit cost × qty (+ wastage) → line total |
| 3 | Opens Labour tab | Table of `labour_lines` |
| 4 | Adds labour manually; rate prefilled from org settings | User can override rate per line |
| 5 | (Phase 7) Applies package on takeoff → “Explode” or auto on apply | Material and labour rows created with `source = package_explosion` |
| 6 | Edits exploded lines if needed | Changes stay on project rows; org package template unchanged |
| 7 | Reviews section subtotals | Materials + labour subtotals shown |

**Success:** Direct cost build-up complete and linked to project; package-driven lines are auditable and editable.

---

## 6. Pricing, margin and markup

**Actor:** Owner, estimator

**Goal:** Arrive at sell price for tender.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Opens Pricing tab | Shows direct cost total |
| 2 | Sets or accepts margin % and markup % | Project-level overrides optional |
| 3 | Reviews sell price and breakdown | `project_pricing_summary` updated |
| 4 | Saves | Audit records pricing snapshot |

**Success:** Sell price visible on project header; calculation transparent (show formula labels in UI).

---

## 7. Exclusions, assumptions and RFIs

**Actor:** Estimator

**Goal:** Document tender qualifications.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Opens Clarifications tab | Filter or sections by type |
| 2 | Adds exclusion (“Not included: …”) | Row `type = exclusion` |
| 3 | Adds assumption (“Measured from IFC drawings”) | Row `type = assumption` |
| 4 | Adds RFI, marks answered when known | `status` on RFI rows |

**Success:** Clarifications ready for export and client communication.

---

## 8. Excel export

**Actor:** Estimator, QS reviewer

**Goal:** Offline review or submission pack.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Opens Export tab | Summary of sheets included |
| 2 | Clicks “Export to Excel” | Server builds workbook from DB |
| 3 | Downloads file | Audit `export` event |
| 4 | Reviews in Excel | No Quanta account required for reviewer |

**Sheets (MVP):** Summary, Takeoff, Materials, Labour, Pricing, Clarifications.

**Success:** File matches in-app totals; exported at point in time.

---

## 9. AI-assisted takeoff draft (post-manual MVP)

**Actor:** Estimator

**Goal:** Speed up first draft; user remains in control.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Selects documents for AI run | `ai_generation_runs` queued |
| 2 | Waits for completion | Draft rows in `takeoff_draft_items` |
| 3 | Reviews draft table side-by-side or inline | Confidence/source shown where available |
| 4 | Accepts, edits, or rejects each line | Accepted → copy to `takeoff_items`; rejected → no live impact |
| 5 | Continues with materials/pricing manually | Live tables unchanged for rejected lines |

**Success:** No AI line affects pricing until accepted; audit shows approve/reject actions.

---

## 10. Organisation package library (Phase 7)

**Actor:** Owner, senior estimator

**Goal:** Maintain reusable priced build-ups for the company.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Opens Packages (org settings) | Lists `pricing_packages` for organisation |
| 2 | Creates package: name, unit (m², lm, each), trade | Header row saved |
| 3 | Adds material components per unit | `pricing_package_material_components` rows |
| 4 | Adds labour components per unit | `pricing_package_labour_components` rows |
| 5 | Sets wastage, cost rate, sell rate, markup, margin | Stored on package; defaults may come from org settings |
| 6 | Adds notes, assumptions | Text on package header |
| 7 | Links references (e.g. NZS 3604, drawing A-101, manufacturer guide) | `pricing_package_references` rows |
| 8 | Saves and marks active | Package available on project takeoff |

**Example packages:** framed wall per m², suspended ceiling per m², demolition wall per lm/m², door install per each, flooring per m², joinery per each, GIB lining per m².

**Success:** Package can be applied on a project takeoff line without re-entering component breakdown each tender.

---

## 11. Apply package to takeoff (Phase 7)

**Actor:** Estimator

**Goal:** Explode a standard build-up from quantities already in takeoff.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | On takeoff row, chooses “Apply package” | Package picker filtered by trade/unit where possible |
| 2 | Confirms apply (overwrite if lines exist) | `takeoff_items.pricing_package_id` + `package_applied_at` |
| 3 | System explodes components | `material_lines` / `labour_lines` qty = takeoff qty × per-unit component |
| 4 | Reviews Materials and Labour tabs | User adjusts unit costs or rates if tender-specific |
| 5 | Opens Pricing tab | Totals include exploded direct cost |

**Success:** One takeoff quantity drives full material and labour allowance; margin/markup flow from existing pricing engine.

**Future:** AI suggests packages from takeoff description; user accepts suggestion before explosion (draft only).

---

## 12. Review activity and corrections

**Actor:** Owner, QS

**Goal:** See what changed before approving tender.

| Step | User action | System response |
|------|-------------|-----------------|
| 1 | Opens Activity tab | Chronological `audit_events` (includes package apply / re-apply) |
| 2 | Filters by entity or user | List updates |
| 3 | Corrects data in source table | New audit entry; export re-run for latest truth |

**Success:** Full traceability for takeoff and pricing changes.

---

## Flow priority for build

1. Onboarding (1)
2. Project create + workspace (2)
3. Documents (3)
4. Manual takeoff (4)
5. Materials + labour — manual path (5)
6. Pricing (6)
7. Packages library + apply to takeoff (10, 11) — after 4–6
8. Clarifications (7)
9. Export + activity (8, 12)
10. AI takeoff draft (9) — last; AI package suggestions after packages stable

## Related documents

- [build-sequence.md](./build-sequence.md)
- [ai-workflows.md](./ai-workflows.md)
- [product-scope.md](./product-scope.md)
