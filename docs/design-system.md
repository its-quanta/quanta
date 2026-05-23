# Design system

Visual, interaction, and copy standards for Quanta. Based on **Quanta Brand & Product Playbook v0.1** (*Quanta Brand Overview for AI Development*).

**Core standard:** Precise. Calm. Technical. Editable. Traceable. Estimator-controlled.

**Development instruction:** Every design and product decision should help the estimator produce a faster, more complete, more defensible tender. Avoid hype, decoration, excessive colour, generic AI styling, and enterprise complexity.

**Stack:** Tailwind CSS, Shadcn UI, Radix primitives, Hugeicons where icons are needed.

---

## Brand essence

- **What Quanta is:** A modern estimating and tender workspace for subcontractors and small-to-medium commercial contractors.
- **What Quanta does:** Turns drawings, specifications, and tender documents into structured pricing workflows — takeoffs, labour allowances, pricing, exclusions, assumptions, risk flags, and branded tender exports.
- **Product philosophy:** AI-assisted estimating with human oversight. The AI assists the estimator; it does not replace them.
- **Core promise:** Faster, more complete, more defensible bids while keeping the estimator in control of every quantity.

---

## Brand personality

| Trait | In practice |
|-------|-------------|
| **Precise** | Say what is meant; measure what is shipped; avoid vague benefits. |
| **Calm** | Do not shout, oversell, or use exaggerated claims. |
| **Technical** | Respect construction terminology and the estimator’s intelligence. |
| **Respectful** | The estimator is the expert; the product serves them. |
| **Considered** | Every screen, word, state, and interaction must have a purpose. |
| **Truthful** | Surface missing, ambiguous, low-confidence, or risky information openly. |

**British English** in all product copy: organisation, labour, metre, specialise, etc.

---

## Tone of voice

- Short, direct, verb-led language.
- Use construction terminology correctly: takeoff, BoQ, RFI, addendum, exclusions, assumptions, margin, scope, tender, revision.
- Use concrete numbers where available: `412.4 m²`, not “a large area”.
- Avoid AI hype, SaaS clichés, exclamation marks, and overly friendly microcopy.
- Error states must be honest and short.

| Use | Avoid |
|-----|-------|
| Generate takeoff. | Unleash powerful AI estimating intelligence. |
| Confirm quantity. | Let our AI do the estimating for you. |
| Flagged: Spec §08.21 unclear. Recommend RFI. | Heads up! We spotted something interesting! |
| Drawing A-302 failed to index. Re-upload or split into pages. | Something went wrong. Please try again. |
| You stay in control of every quantity. | Revolutionary automation for construction. |

---

## Visual direction

- Restrained, premium, technical, and highly functional.
- Generous whitespace, clean hierarchy, dense but readable data, structured tables.
- Reference blueprint precision, measured data, professional estimating rooms, and auditable workflows.
- Feel closer to **Linear**, **Stripe**, **Notion**, and **Figma** than to traditional construction software.
- **Avoid:** hard-hat graphics, cartoon construction icons, generic AI sparkles, colourful decoration, enterprise-heavy styling.

---

## Colour system

**Rule:** Use colour sparingly. **Ink** and **Paper** should carry ~85% of the UI. If the screen feels colourful, it is wrong.

Use semantic CSS variables in `app/globals.css` (Shadcn pattern). Avoid hard-coded hex in feature code — map brand colours into tokens below.

### Brand palette

| Name | Hex | Role |
|------|-----|------|
| Quanta Ink | `#0A0E1A` | Primary text, dark surfaces, logo mark |
| Quanta Paper | `#FAFBFC` | Main app background |
| Paper Mute | `#F4F6FA` | Cards, panels, table headers |
| Line | `#E5E8EE` | Borders and dividers |
| Quanta Blue | `#3B82F6` | Primary actions, links, focus states |
| Quanta Cyan | `#00C2EA` | AI surfaces and data highlights — use sparingly |
| Quanta Violet | `#7C5CFF` | AI rationale, suggestions, agent activity |
| Verified Green | `#10B981` | Confirmed, complete, approved |
| Caution Amber | `#F59E0B` | Flags, RFIs, review required |
| Critical Red | `#EF4444` | Errors, blockers, overdue deadlines |
| Steel | `#6B7280` | Secondary text and labels |
| Steel 2 | `#9AA3B2` | Tertiary text and captions |

### Shadcn token mapping (implementation target)

| Brand | Suggested CSS variable |
|-------|-------------------------|
| Quanta Paper | `--background` |
| Quanta Ink | `--foreground` |
| Paper Mute | `--card`, `--muted` |
| Line | `--border`, `--input` |
| Quanta Blue | `--primary`, `--ring` |
| Steel / Steel 2 | `--muted-foreground` |
| Critical Red | `--destructive` |
| Quanta Violet / Cyan / Amber / Green | Named tokens or `--chart-*` / badge variants — not primary UI chrome |

### Status colours

| State | Colour | Example use |
|-------|--------|-------------|
| Draft | Muted / Steel | Grey badge on project or line |
| Review / Flagged | Caution Amber | RFI, low confidence, needs review |
| Verified / Complete | Verified Green | Accepted quantity or export-ready |
| Blocker / Error | Critical Red | Failed index, overdue deadline |
| AI draft | Quanta Violet or Cyan | Distinct from saved/verified — never same as “saved” |
| Submitted / In progress | Quanta Blue | Tender sent, active workflow |

AI-generated rows must be visually distinct from approved live rows until the user verifies them.

---

## Typography

| Font | Use |
|------|-----|
| **Inter** | Primary UI, headings, marketing, readable text (`next/font`) |
| **JetBrains Mono** | Quantities, drawing references, IDs, confidence values, table labels, measured data, technical metadata |
| **Arial** | Fallback for exported Word/PDF when Inter cannot be embedded |

**Measured data should look measured.** Quantities, rates, drawing references, and confidence scores use monospace + `tabular-nums`.

### Scale

| Element | Classes |
|---------|---------|
| Page title | `text-2xl font-semibold` |
| Section title | `text-lg font-medium` |
| Body | `text-sm` (dense tables) to `text-base` (empty states, onboarding) |
| Table data | `text-sm font-mono tabular-nums` for quantities and money |
| Captions | `text-xs text-muted-foreground` (Steel 2 tone) |

---

## Layout

| Region | Size | Role |
|--------|------|------|
| Left sidebar | ~244px | Persistent navigation |
| Top bar | ~56px | Context, actions, org/project scope |
| Main canvas | Flexible | Active estimating task |
| Right rail (optional) | ~320px | AI rationale, properties, comments, risk flags |

- **Workspace tables:** full width; sticky table headers on long takeoffs.
- **Auth / onboarding:** constrained width (`max-w-md` / `max-w-lg`).
- **Project workspace tabs:** Overview, Documents, Takeoff, Materials, Labour, Pricing, Clarifications, Export, Activity (align with [user-flows.md](./user-flows.md)).

### Radius

| Element | Radius |
|---------|--------|
| Buttons, inputs, pills | 6px |
| Cards | 10px |
| Panels | 14px |
| Promotional / marketing surfaces | 20px |

### Focus and motion

- **Focus:** 2px Quanta Blue outline + 4px soft blue halo (`ring` + `ring-offset` or `ring/30` pattern in Shadcn).
- **Motion:** 120–180ms standard interactions; 240ms layout shifts. No bounce, overshoot, or playful movement.
- **Touch:** 44px minimum target where mobile is considered; MVP is desktop-first.

---

## UI and UX principles

- **Calm density:** Information-rich screens that do not feel cluttered.
- **Estimator-controlled:** The AI proposes; the user verifies, edits, overrides, or rejects.
- **Traceability everywhere:** Every quantity links to a drawing, spec clause, measurement source, or rationale.
- **Fast and practical:** Keyboard shortcuts, bulk actions, quick verification, low-latency interactions.
- **Construction-native:** Correct estimating terminology; no visual construction clichés.
- **Trustworthy:** Numbers and totals visible; no hidden calculations.

---

## AI interface

- AI must be **visible but not performative**.
- Every AI output shows **source references**, **rationale**, **confidence**, **review state**, and a **verification action** where relevant.
- Never present AI output as final truth — verification is part of the workflow.
- **States:** Draft, Review, Flagged, Verified, Overridden, Locked.
- **Override** is a first-class action, not buried in settings.
- Copy: “Draft only — review and accept lines before pricing.” Primary CTA is user verification, not “trust the AI”.

---

## Product screens (direction)

| Screen | Key elements |
|--------|----------------|
| **Dashboard** | Live bids, estimated value, AI hours saved, risk flags, deadlines, activity feed |
| **Project workspace** | Documents, drawings, takeoff, pricing, exclusions, export tabs |
| **AI takeoff** | Drawing viewer, scope table, drawing references, confidence, verification controls |
| **Pricing table** | Monospaced quantities, rates, margins, totals, overrides, bid summary |
| **Exclusions & assumptions** | Accept, edit, reject, replace with template, insert into tender export |
| **Tender export** | Branded PDF, BoQ, scope letter, exclusions, assumptions, recipients, version stamp |

---

## Components (Shadcn)

Use primitives from `components/ui/`:

| Pattern | Components |
|---------|------------|
| Actions | `Button` (primary/default/outline/ghost) |
| Forms | `Input`, `Textarea`, `Label`, `Select` |
| Data | `Table` inside `Card` |
| Overlays | `Dialog`, `Sheet` |
| Navigation | `Tabs` for workspace sections |
| Feedback | `Badge` for status; toast via Sonner when added |
| Menus | `DropdownMenu` for row actions |

### Buttons

- One primary action per screen section (Quanta Blue).
- Destructive actions require confirmation `Dialog`.
- “Generate AI draft” is secondary/outline with disclaimer nearby — not primary until the user opts in.

### Tables (core UI)

Takeoff, materials, and labour are **editable grids**:

- Inline edit where possible; row add at bottom.
- Row actions: Edit, Delete, Override (dropdown).
- Empty state: short explanation + “Add first line” CTA.
- Loading: skeleton rows, not full-page spinners.

### Money and units

- Currency from organisation settings (symbol/code).
- Unit beside quantity column header.
- Margin/markup: show **both** percentage and calculated amount.

---

## Icons

- `@hugeicons/react` — outline style, 20–24px inline with labels.
- Use sparingly: navigation, upload, export, activity.
- **Do not** use generic AI sparkles, hard-hat motifs, or cartoon construction icons.

---

## Copy patterns

| Context | Pattern |
|---------|---------|
| Empty projects | “No projects yet. Create your first tender estimate.” |
| AI disclaimer | “Draft only — review and accept lines before pricing.” |
| Export | “Export reflects saved data as of now.” |
| Errors | Honest and specific: “Drawing A-302 failed to index. Re-upload or split into pages.” |

Avoid: “Leverage”, “Synergy”, “Unleash”, “Revolutionary”, exclamation marks in product UI.

---

## Accessibility

- All form fields have `Label`.
- Focus visible on interactive elements (Quanta Blue ring).
- Table headers use `<th scope="col">`.
- Status not conveyed by colour alone — include text in badges.
- `Dialog` traps focus; Esc closes.

---

## Dark mode

Defer unless trivial with Shadcn CSS variables. MVP: **light mode only** (Ink on Paper). Brand palette is optimised for light estimating workspaces.

---

## File structure convention

```
app/                    # Routes (App Router)
components/ui/          # Shadcn primitives
components/             # Quanta-specific (project-table, pricing-summary)
```

Feature components compose `components/ui` — do not fork Button styles per page.

---

## Related documents

- [product-scope.md](./product-scope.md)
- [user-flows.md](./user-flows.md)
- [definition-of-done.md](./definition-of-done.md)
