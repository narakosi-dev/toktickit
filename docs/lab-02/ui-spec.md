# Lab 2 UI Specification — Zen Green Design System

## 1. Visual Theme & Color Tokens

The UI implements the **Zen Green Design System** designed for high clarity, ergonomic reading comfort, and professional enterprise aesthetics.

| Token Name | Hex Code | Semantic Role & Application |
|------------|----------|-----------------------------|
| `--zen-primary` | `#006B3C` | App brand header, primary actions (Save, Submit, Continue), strong emphasis |
| `--zen-secondary` | `#0B7A46` | Active navigation tabs, link hover, focus outlines, secondary buttons |
| `--zen-pale` | `#EAF6EF` | Selected card backgrounds, success banners, light table row highlights |
| `--zen-bg` | `#F5F7F6` | Quiet, comfortable near-white application canvas background |
| `--zen-surface` | `#FFFFFF` | Form cards, modal dialogs, data table container surfaces |
| `--zen-border` | `#D0E0D8` | Subtle card borders, table dividers, input borders |
| `--zen-text-primary`| `#1B3A2A` | Deep charcoal-green for high-contrast, comfortable body & headings |
| `--zen-text-muted`  | `#556E60` | Secondary metadata labels, timestamps, placeholder text |
| `--zen-read-only`   | `#F0F5F2` | Read-only input shading, disabled control fill |
| `--zen-danger`      | `#B02A37` | Validation error text, error borders, destructive action warnings |
| `--zen-danger-bg`   | `#FDF2F2` | Error alert backgrounds, invalid input subtle background tint |
| `--zen-warning`     | `#B58105` | Warning alerts, medium priority badges |
| `--zen-warning-bg`  | `#FFF9EB` | Warning callout background |

---

## 2. Typography & Spacing
- **Font Family:** System UI stack: `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Headings:**
  - `H1 / App Brand:` 1.5rem (24px), font-weight 700, color: `#FFFFFF` inside header
  - `H2 / Page Title:` 1.35rem (22px), font-weight 700, color: `#1B3A2A`
  - `H3 / Section Title:` 1.1rem (18px), font-weight 600, color: `#1B3A2A`
- **Body & Labels:**
  - Standard text: 0.95rem (15px), line-height 1.5
  - Field labels: 0.875rem (14px), font-weight 600, color: `#1B3A2A`, with mandatory red asterisk `*` for required fields
  - Validation messages: 0.8125rem (13px), color: `#B02A37`, placed immediately below the corresponding input
  - Help text: 0.8125rem (13px), color: `#556E60`

---

## 3. Component States & Behavior

### 3.1 Buttons
- **Primary (`btn-zen-primary`):** Background `#006B3C`, text white, hover `#0B7A46`.
- **Secondary (`btn-zen-secondary`):** Background transparent, border `#006B3C`, text `#006B3C`, hover `#EAF6EF`.
- **Destructive / Soft Remove (`btn-zen-danger`):** Background `#FFF0F0`, border `#E0A8AB`, text `#B02A37`, hover `#F8D7DA`.
- **Disabled State:** Opacity 0.65, cursor `not-allowed`, background `#D0E0D8`, text `#7D9387`.
- **Busy / Submitting State:** Displays loading spinner icon, button text changes (e.g. "Submitting..."), button is disabled to prevent duplicate submissions.

### 3.2 Form Inputs
- **Default:** Background white, border 1px solid `#D0E0D8`, border-radius 6px, height 40px (single line).
- **Focus:** Border color `#0B7A46`, box-shadow `0 0 0 0.2rem rgba(11, 122, 70, 0.2)`.
- **Invalid / Error:** Border color `#B02A37`, background tint `#FDF2F2`, validation message displayed directly underneath.
- **Read-Only / Disabled:** Background `#F0F5F2`, text `#1B3A2A`, border `#D8E4DE`, cursor `default`.
- **Textarea (Description):** Minimum height 120px, vertical resize only, width 100%.

### 3.3 Priority & Status Badges
- **Status Badges:**
  - `New`: Background `#EAF6EF`, text `#006B3C`, border 1px solid `#A3D9B8`
  - `In Progress`: Background `#EBF3FC`, text `#0D6EFD`, border 1px solid `#B6D4FE`
  - `Resolved`: Background `#D1E7DD`, text `#0F5132`, border 1px solid `#BADBCC`
- **Priority Badges:**
  - `Critical`: Background `#F8D7DA`, text `#842029` (Dark Red)
  - `High`: Background `#FDE8E8`, text `#C81E1E` (Light Red/Coral)
  - `Medium`: Background `#FFF3CD`, text `#664D03` (Warm Amber)
  - `Low`: Background `#E8F4F8`, text `#055160` (Soft Teal)

---

## 4. Screen Layouts & Responsive Breakpoints

### Viewport Targets:
1. **Desktop (≥992px):**
   - Application shell with top navbar: Brand logo, "My Tickets", "Create Ticket", current Requester dropdown, "Change Requester" button.
   - Container maximum width: 1140px, centered with generous padding.
   - Create Ticket: 2-column layout for classification fields (Category, Related System, Priority), full-width for Summary and Description.
   - My Tickets: Full responsive table showing columns (Ticket No, Date, Summary, Category, Priority, Status, Details action).
2. **Tablet (768px – 991px):**
   - 2-column forms adapt to available width.
   - Compact table with secondary columns wrapping or responsive scrolling.
3. **Mobile (<768px):**
   - Top navbar collapses into hamburger menu or compact stack.
   - Create Ticket: Single-column full-width controls with 44px minimum touch targets.
   - My Tickets: Data table transforms into structured card list to prevent awkward horizontal scrolling.
   - Touch-friendly action buttons.

---

## 5. Visual Inspection Checklist
- [ ] Primary Green `#006B3C` and Secondary Green `#0B7A46` applied consistently.
- [ ] Contrast ratio between text (`#1B3A2A`) and background (`#FFFFFF`/`#F5F7F6`) exceeds WCAG AA standard (≥ 4.5:1).
- [ ] Required asterisks visible on mandatory fields (`Category`, `Related System`, `Priority`, `Summary`, `Description`).
- [ ] Error messages display immediately beneath the respective invalid inputs with red borders.
- [ ] Submitting forms visibly disables submit button and presents loading indicator.
- [ ] Zero horizontal page overflow at 375px viewport.
- [ ] Attachments section displays file size in human-readable units (KB/MB) and file format icon/badge.
- [ ] Soft-removed attachments clearly show "Removed" status badge and the recorded reason.
