# Lab 4 UI Specification & Design Guide

**Project:** TokTickIT — IT Service Desk Application  
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — KMUTT (Semester 1/2026)  
**Author:** Nara Kosiyaporn (Student ID: 67070505218)  
**Status:** Approved Engineering Contract  

---

## 1. Zen Green Design Language & Theme Foundations

Lab 4 maintains and completes the Zen Green design system established in Labs 2 and 3. The interface evokes calmness, operational clarity, and high legibility.

### 1.1. Color Palette Tokens
| Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| `primary-dark` | `#1B4332` | Top navigation header, primary headings, high-contrast dark accents |
| `primary` | `#2D6A4F` | Primary action buttons, active navigation pills, brand elements |
| `primary-light` | `#40916C` | Hover states, secondary action buttons |
| `primary-subtle` | `#D8F3DC` | Active card borders, metric background washes, subtle badges |
| `surface-bg` | `#F8FAF9` | General application canvas background |
| `card-bg` | `#FFFFFF` | Dashboard cards, table surfaces, modal containers |
| `text-primary` | `#1A202C` | Body text, table data, primary metric numbers (high contrast) |
| `text-muted` | `#4A5568` | Field labels, timestamps, secondary hints |
| `border-color` | `#E2E8F0` | Structural dividers, input outlines, table row borders |
| `status-new` | `#3182CE` | New ticket badge (Blue cue) |
| `status-open` | `#DD6B20` | Open ticket badge (Amber cue) |
| `status-progress`| `#805AD5` | In Progress badge (Purple cue) |
| `status-waiting` | `#D69E2E` | Waiting for Requester badge (Yellow-gold cue) |
| `status-resolved`| `#38A169` | Resolved ticket badge (Forest green cue) |
| `status-closed`  | `#718096` | Closed ticket badge (Neutral gray cue) |
| `status-conflict`| `#E53E3E` | Conflict / Error alert banner (Crimson red cue) |

---

## 2. Responsive Breakpoints & Multi-Viewport Guidelines

All components and screens must seamlessly scale across the three standard viewports:

| Viewport Category | Target Dimension | Layout Strategy |
| :--- | :---: | :--- |
| **Desktop** | **$1280 \times 800$** | Multi-column grids (5 metric cards horizontal, 2-column dashboard layout), spacious data tables, side-by-side action forms. |
| **Tablet** | **$768 \times 1024$** | 2-3 column wrapped metric cards, full-width stacked list widgets, collapsible action panels, visible focus tabs. |
| **Mobile** | **$375 \times 667$** | Single-column stacked cards, vertically flowing forms, card-based action lists instead of horizontal tables, minimum $44\text{px}$ tap targets, zero horizontal scrolling. |

---

## 3. IT Staff & Administrator Dashboard (`/staff/dashboard`)

### 3.1. Header & Welcome Area
- **Greeting Banner:** Personalized welcome ("Welcome back, {User Name}!").
- **Subtitle:** "Here's what's happening across your support queue today."
- **Action Toolbar:** Quick "Refresh" button with spin indicator on loading.

### 3.2. Metrics Cards Grid
A horizontal row of 5 prominent metric cards:
1. **New:** Count of unhandled tickets in `New` status.
2. **Open:** Count of triaged tickets awaiting active labor.
3. **In Progress:** Count of tickets actively being investigated.
4. **Waiting for Requester:** Count of tickets blocked on user feedback.
5. **My Assigned:** Count of active tickets assigned to the logged-in technician.

*Card Anatomy:*
- Top: Metric label (uppercase, subtle color).
- Center: Large numeric metric ($32\text{px}$ bold, high-contrast text).
- Bottom: Small indicator (e.g. "+2 from yesterday" or "Requires attention") and subtle arrow icon indicating drill-down affordance.
- **Interaction:** Clicking any metric card routes to `/staff/tickets` pre-filtered by that specific status or owner.

### 3.3. Main Two-Column Layout
- **Left Column (Operational Highlights):**
  - Section title: "Urgent & Recent Tickets" with a "View all" link to queue.
  - Ticket item rows showing: Ticket Number pill (e.g. `TKT-2026-000014`), Summary preview, Priority badge (`Critical`/`High`), Status badge, and elapsed time ("2h ago").
  - Clicking any row navigates directly to that ticket's detail view (`/tickets/:id`).
- **Right Column (Quick Actions & Priority Breakdown):**
  - **Quick Actions Panel:** Prominent shortcut buttons:
    - `+ Create Ticket` (opens ticket creation form)
    - `🔍 Search Tickets` (focuses global search)
    - `📋 My Queue` (routes to `/staff/tickets?owner=me`)
  - **Priority Breakdown:** Visual progress/bar breakdown of active tickets by priority level (`Critical`, `High`, `Medium`, `Low`).

---

## 4. Requester Dashboard (`/requester/dashboard`)

### 4.1. Header Area
- **Greeting:** "Welcome, {Requester Name}!"
- **Subtitle:** "Here's the latest update on your support requests."

### 4.2. Metric Cards Grid
Row of 4 focused metric cards:
1. **My Open Tickets:** Total count of active tickets.
2. **In Progress:** Tickets currently undergoing technician diagnosis.
3. **Resolved:** Recently resolved tickets awaiting requester confirmation.
4. **Closed:** Historical completed tickets.

### 4.3. Recent Tickets & Quick Actions
- **Recent Tickets List:** 5 most recently updated tickets owned by the requester with Ticket Number, Summary, Status badge, and Last Update date.
- **Quick Actions Card:**
  - `+ Create New Ticket` button (primary Zen green button).
  - `📂 View All My Tickets` link (navigates to `/tickets`).

---

## 5. Actions Taken UI on Ticket Detail (`/tickets/:id`)

### 5.1. Location & Placement
- Resides as a primary tab or dedicated section directly below Ticket Overview, positioned harmoniously with **Public Comments** and **Internal Notes**.
- Header displays: "Actions Taken ({count})" with an `+ Add Action Taken` button (visible only to IT Staff and Administrators).

### 5.2. Actions Taken List View
Each Action Taken item renders as a clean chronological card with:
- **Header Line:**
  - Date & Time formatted clearly (e.g., "Oct 29, 2026, 08:30 AM").
  - "Performed by" badge showing technician's name and role (`IT_Staff` / `Administrator`).
  - Follow-up status pill: Red/Amber badge `Follow-Up Required` or Green badge `No Follow-Up Needed`.
  - Edit button (icon button, IT Staff/Admin only).
- **Body Section:**
  - **Action Description:** Complete text describing labor performed.
  - **Result:** Distinct blockquote/sub-panel highlighting the diagnostic or repair outcome.
  - **Follow-Up Note (if required):** Prominently styled callout box detailing next steps (e.g., "Order spare battery pack").
  - **Attachment References:** Small paperclip icon followed by referenced filenames (e.g. `diagnostic_log.txt`).

### 5.3. Create / Edit Action Taken Form (Modal or Inline Drawer)
- **Title:** "Record Action Taken" or "Edit Action Taken #X".
- **Fields:**
  1. `Action Date/Time`: Datetime picker or prefilled with current date/time.
  2. `Performed By`: Dropdown pre-selected with logged-in user; allows selecting another active IT Staff member if logging on their behalf.
  3. `Action Description`: Textarea (minimum 5 chars), placeholder "Describe technical steps executed...".
  4. `Result`: Textarea (minimum 5 chars), placeholder "What was the diagnostic outcome or fix result?".
  5. `Follow-Up Required?`: Toggle switch or checkbox.
  6. `Follow-Up Note`: Textarea that dynamically appears and becomes **mandatory** when toggle is ON. Displays clear error helper if left blank.
  7. `Attachment Notes`: Input text field for referencing uploaded diagnostic logs or photos.
- **Action Buttons:** "Save Action Taken" (Primary Green) and "Cancel" (Neutral Gray).

### 5.4. Requester View (Read-Only Mode)
- Requesters viewing their own ticket see the complete Actions Taken timeline so they are kept informed of repair work.
- All "Add Action", "Edit", and form controls are completely omitted from the DOM.

---

## 6. Ticket Status Workflow Controls & Resolution Feedback

### 6.1. Status Transition Toolbar
- Positioned in the header/actions card of the IT Staff Ticket Detail view.
- Current status displayed with high-visibility Zen Green status badge.
- **Transition Dropdown / Button Group:**
  - Displays **strictly permitted** next statuses according to BR-06.
  - For example, if current status is `New`, only `Open` and `Cancelled` are available choices.
  - Changing status triggers optimistic update with immediate visual feedback.

### 6.2. Advisory Resolution Banner
- When a Requester indicates the problem appears resolved (`resolvedIndicated === true`), a prominent informational banner renders at the top of the ticket:
  > **Requester Feedback:** The requester has signaled that this issue appears resolved. Please verify the Actions Taken and formally set the status to **Resolved** or follow up if further work is required.
- The status remains in its current state until IT Staff formally transitions it.

### 6.3. Concurrency Conflict Dialog (HTTP 409)
- If an update fails due to a version mismatch (stale update), a modal dialog alerts the user:
  - **Title:** "Ticket Updated Concurrently"
  - **Message:** "Another technician modified this ticket while you were working. To prevent overwriting their changes, please refresh to load the latest data."
  - **Button:** "Refresh Ticket" (re-fetches ticket detail and closes modal without losing local notes).

---

## 7. Accessibility and Visual Polish Checklist

1. **Contrast Ratio:** Text and interactive controls exceed WCAG 2.1 AA requirement ($\ge 4.5:1$ for normal text, $\ge 3:1$ for large text and badge borders).
2. **Keyboard Navigation:** Full keyboard navigation support (Tab order, Enter/Space activation, Esc closes modals).
3. **Focus Indicators:** Unbroken $2\text{px}$ emerald focus rings (`outline: 2px solid #2D6A4F; outline-offset: 2px`).
4. **Non-Color Status Cues:** Badges pair color with explicit text labels and icon indicators.
5. **Horizontal Overflow Prevention:** All tables and grid layouts convert to flexible card stacks on mobile devices ($\le 375\text{px}$) with `overflow-x: hidden` enforced on page containers.
6. **Error Placement:** Form validation errors appear directly adjacent to the offending input with `role="alert"` and clear contrast.
