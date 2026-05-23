# Design system

Visual and interaction standards for Quanta. Goal: **clean, modern, premium**, and **subcontractor-focused** — a professional tool that feels faster than spreadsheets, not like enterprise ERP.

Stack: **Tailwind CSS**, **Shadcn UI**, **Radix** primitives, **Hugeicons** where icons are needed.

## Brand tone

- **Trustworthy** — Numbers and totals are always visible; no hidden calculations.
- **Calm** — Neutral surfaces; colour used for status and actions, not decoration.
- **Direct** — Labels use trade language (takeoff, labour rate, sell price) not abstract SaaS jargon.
- **British English** — Organisation, labour, metre, specialise, etc.

## Colour

Use CSS variables in `app/globals.css` (Shadcn pattern). Semantic tokens only in components — avoid hard-coded hex in feature code.

| Token | Usage |
|-------|--------|
| `background` / `foreground` | Page and body text |
| `card` / `card-foreground` | Panels, workspace sections |
| `muted` / `muted-foreground` | Secondary text, table headers |
| `primary` | Primary actions (Save, Create project, Export) |
| `destructive` | Delete row, remove document |
| `border` / `input` | Tables, forms, dividers |
| `ring` | Focus states (keyboard accessibility) |

### Status colours

| Status | Example use |
|--------|-------------|
| Draft | Grey/muted badge on project |
| In review | Amber |
| Submitted | Blue |
| Won / Lost | Green / muted red |
| AI draft pending | Distinct violet or amber badge — never same as “saved” |

AI-generated rows must be visually distinct from approved live rows until accepted.

## Typography

- **Font:** System UI stack or single web font via `next/font` — prefer fast load over brand novelty.
- **Scale:**
  - Page title: `text-2xl font-semibold`
  - Section title: `text-lg font-medium`
  - Body: `text-sm` (dense tables) to `text-base` (marketing/empty states)
  - Table data: `text-sm tabular-nums` for quantities and money
- **Numbers:** Always `tabular-nums` on quantity, rate, and currency columns.

## Spacing and layout

- Page max width: full width for workspace tables; constrained width for auth and onboarding forms (`max-w-md` / `max-w-lg`).
- Project workspace: persistent **sidebar or top nav** for tabs (Overview, Documents, Takeoff, Materials, Labour, Pricing, Clarifications, Export, Activity).
- Sticky table header on long takeoff sheets.
- Minimum touch target 44px where mobile is later considered; MVP is desktop-first.

## Components (Shadcn)

Use existing primitives from `components/ui/`:

| Pattern | Components |
|---------|------------|
| Actions | `Button` (primary/default/outline/ghost) |
| Forms | `Input`, `Textarea`, `Label`, `Select` |
| Data | `Table` inside `Card` |
| Overlays | `Dialog`, `Sheet` (mobile-friendly panels later) |
| Navigation | `Tabs` for workspace sections |
| Feedback | `Badge` for status; toast via Sonner when added |
| Menus | `DropdownMenu` for row actions |

### Buttons

- One primary action per screen section.
- Destructive actions require confirmation `Dialog`.
- “Generate AI draft” is secondary style with explicit disclaimer nearby — not primary until user opts in.

### Tables (core UI)

Takeoff, materials, and labour are **editable grids**:

- Inline edit where possible; row add at bottom.
- Row actions: Edit, Delete (dropdown on row).
- Empty state: short explanation + “Add first line” CTA.
- Loading: skeleton rows, not spinners over entire page.

### Money and units

- Display currency with organisation symbol/code from settings.
- Show unit beside quantity column header.
- Margin/markup: show **both** percentage and calculated amount.

## Icons

- `@hugeicons/react` — outline style, 20–24px inline with labels.
- Use sparingly: navigation, upload, export, activity, AI sparkles (draft only).

## Copy patterns

| Context | Pattern |
|---------|---------|
| Empty projects | “No projects yet. Create your first tender estimate.” |
| AI disclaimer | “Draft only — review and accept lines before pricing.” |
| Export | “Export reflects saved data as of now.” |
| Errors | Plain language: “Could not save takeoff line. Try again.” |

Avoid: “Leverage”, “Synergy”, “Workspace collaboration” (not in MVP).

## Accessibility

- All form fields have `Label`.
- Focus visible on interactive elements.
- Table headers use `<th scope="col">`.
- Status not conveyed by colour alone — include text in badges.
- Dialog traps focus; Esc closes.

## Dark mode

Defer unless trivial with Shadcn CSS variables. MVP: **light mode only** unless already configured in `globals.css`.

## File structure convention

```
app/                    # Routes (App Router)
components/ui/          # Shadcn primitives
components/             # Quanta-specific (project-table, pricing-summary)
```

Feature components compose `components/ui` — do not fork Button styles per page.

## Related documents

- [product-scope.md](./product-scope.md)
- [user-flows.md](./user-flows.md)
- [definition-of-done.md](./definition-of-done.md)
