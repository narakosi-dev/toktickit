# Lab 3 UI & Design Specification

**Project:** TokTickIT — IT Service Desk Application  
**Sprint:** Lab 3 — Users, Roles, IT Staff Ticketing, and Admin Screens  
**Course:** CPE 334 Software Engineering — KMUTT (1/2026)  
**Author:** Nara Kosiyaporn (67070505218)  
**Status:** Approved UI Specification  

---

## 1. Design Philosophy & Zen Green Theme

Lab 3 seamlessly extends the **Zen Green Design System** established in Lab 2. All screens, forms, tables, modals, and badges maintain visual harmony, clear visual hierarchy, accessible contrast ratios (WCAG 2.1 AA), and zero-clipping responsive layouts.

### 1.1. Color Tokens

| Token Name | Hex Code | Semantic Purpose |
|:---|:---:|:---|
| `--zen-primary` | `#006B3C` | Application header, primary action buttons, active navigation indicator |
| `--zen-secondary` | `#0B7A46` | Hover states, secondary action buttons, interactive borders |
| `--zen-pale` | `#EAF6EF` | Selected item highlights, success callout backgrounds, badge backgrounds |
| `--zen-bg` | `#F5F7F6` | Global page background |
| `--zen-card-bg` | `#FFFFFF` | Form containers, data tables, modals, cards |
| `--zen-border` | `#D0E0D8` | Structural container borders, input field borders |
| `--zen-text` | `#1B3A2A` | Primary body text (Dark Charcoal-Green, never pure black) |
| `--zen-muted` | `#556E60` | Secondary labels, table column headers, helper notes |
| `--zen-readonly-bg` | `#F2F4F1` | Background for non-editable form inputs |
| `--zen-error` | `#B02A37` | Validation errors, inactive status badges, destructive actions |
| `--zen-warning` | `#B58105` | Internal Notes border & badge, High priority indicator |
| `--zen-notes-bg` | `#FFF9E6` | Internal Notes card background (warm amber tint) |
| `--zen-comments-bg` | `#F0F8F3` | Public Comments card background (subtle green tint) |

### 1.2. Status & Priority Badges

Badges share consistent typography (font size 12px / 0.75rem, bold, uppercase, rounded-pill with 4px vertical / 10px horizontal padding):
- **Ticket Status Badges:**
  - `New`: Blue badge (`#E7F1FF` bg, `#0D6EFD` text)
  - `Open`: Cyan badge (`#E0F7FA` bg, `#00838F` text)
  - `In Progress`: Amber badge (`#FFF3CD` bg, `#856404` text)
  - `Waiting for Requester`: Purple badge (`#F3E5F5` bg, `#6A1B9A` text)
  - `Resolved`: Green badge (`#D1E7DD` bg, `#0F5132` text)
  - `Closed`: Gray badge (`#E9ECEF` bg, `#495057` text)
  - `Reopened`: Orange badge (`#FFE5D0` bg, `#C05621` text)
  - `Cancelled`: Red badge (`#F8D7DA` bg, `#842029` text)
- **Priority Badges (Requested Priority & IT Priority):**
  - `Low`: Pale Green (`#D1E7DD` bg, `#0F5132` text)
  - `Medium`: Pale Amber (`#FFF3CD` bg, `#856404` text)
  - `High`: Pale Orange (`#FFE5D0` bg, `#C05621` text)
  - `Critical`: Pale Red (`#F8D7DA` bg, `#842029` text)
- **Role Badges:**
  - `Requester`: Green badge (`#D1E7DD` bg, `#0F5132` text)
  - `IT Staff`: Blue badge (`#CCE5FF` bg, `#004085` text)
  - `Administrator`: Dark Slate badge (`#E2E3E5` bg, `#383D41` text)

---

## 2. Application Shell & Role Navigation

The persistent header adapts dynamically to the authenticated user's role:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TokTickIT   [My Tickets]  [Ticket Queue]  [User Management]  [Create Ticket]    │
│                                                   (👤 Jennifer Anderson [Role] ▼)│
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Brand Logo:** `TokTickIT` with leaf/ticket glyph in primary green.
- **Role-Based Nav Links:**
  - `Requester`: Shows **My Tickets** and **Create Ticket**.
  - `IT Staff`: Shows **Ticket Queue** and **Create Ticket**.
  - `Administrator`: Shows **User Management**, **Ticket Queue**, and **Create Ticket**.
- **User Profile Menu:**
  - Displays user avatar initials, user name, and role pill.
  - Dropdown menu:
    - User email and role.
    - **Change Password** action (opens change password modal/view).
    - **Logout** action (clears session and redirects to login).
- **No Requester Selector:** The temporary Development Requester Selector from Lab 2 is completely removed.

---

## 3. Screen Specifications

### 3.1. Login Screen (`Login.tsx`)
- **Layout:** Centered single-column Zen Green card (max-width 440px) on `#F5F7F6` background.
- **Controls:**
  - Header: `TokTickIT` branding and subtitle "Sign in to your account".
  - `Email Address` input (type `email`, placeholder `user@example.com`).
  - `Password` input (type `password`, with visibility toggle glyph).
  - Submit Button: Full-width `btn-zen-primary` with text "Sign In".
- **States:**
  - *Default:* Ready for input.
  - *Busy:* Button shows spinner, inputs disabled.
  - *Validation Error:* Inline red text below empty fields.
  - *Invalid Credentials / Inactive Account:* Dismissible alert banner above form with clear, safe feedback.

### 3.2. Mandatory First-Login Password Change Screen (`ChangePassword.tsx`)
- **Layout:** Centered Zen Green card with information banner: *"You must change your password to continue"*.
- **Controls:**
  - `Current (Temporary) Password` input.
  - `New Password` input with show/hide toggle.
  - `Confirm New Password` input.
  - **Live Password Policy Checklist:**
    - [x] At least 8 characters
    - [x] Include uppercase and lowercase letters
    - [x] Include a number and a special character
  - Action Button: "Save New Password & Continue" (disabled until all checklist items are satisfied and confirmation matches).
- **Success Behavior:** Automatically clears mandatory flag, shows toast, and enters the main application according to role.

### 3.3. IT Staff Ticket Queue (`StaffTicketQueue.tsx`)
- **Layout:** Page title "IT Support Queue", count badge (`X Total Tickets`), search/filter toolbar, data table on desktop, and pagination bar.
- **Filter Toolbar:**
  - Search input: Real-time search across Ticket Number and Summary.
  - Category dropdown (`All Categories`, `Hardware`, `Software`, etc.).
  - Status dropdown (`All Statuses`, `New`, `Open`, `In Progress`, etc.).
  - IT Priority dropdown (`All Priorities`, `Low`, `Medium`, etc.).
  - Assignment dropdown (`All Tickets`, `Unassigned`, `Assigned to Me`, `Specific Staff`).
  - Clear Filters button.
- **Queue Table Columns:**
  - `Ticket No`: Monospace formatted link (`TKT-YYYY-NNNNNN`).
  - `Created Date`: Date & time formatted for readability.
  - `Summary`: Truncated at 50 chars with tooltip for full text.
  - `Category`: Category name.
  - `Req Priority`: Priority badge.
  - `IT Priority`: IT Priority badge.
  - `Status`: Current status badge.
  - `Owner`: Owner name pill or italicized *"Unassigned"*.
  - `Actions`: "Open Detail" button.
- **Mobile Adaptive View (375px):** Table converts into stacked cards displaying Ticket Number, Summary, Status & Priority badges, and an Open Detail button. Zero horizontal overflow.

### 3.4. IT Staff Ticket Detail (`StaffTicketDetail.tsx`)
- **Layout:** Two-column layout on desktop (Metadata & Controls on left/top; Comments & Notes on right/bottom).
- **Header:** Breadcrumb `Ticket Queue > Ticket Detail`, Back to Queue button, Ticket Number header with Status badge.
- **Operational Workflow Controls:**
  - `Claim Ticket`: Button to immediately assign current staff user as Owner.
  - `Reassign Owner`: Dropdown listing active IT Staff and Admin users.
  - `IT Priority`: Dropdown selector with Save confirmation.
  - `Status Transition`: Dropdown showing only permitted next statuses according to the Status Transition Matrix (BR-13), with confirmation modal.
  - `Resolution Indicator`: If Requester marked "Problem Appears Resolved", prominent green banner: *"Requester indicated this issue appears resolved. Review and confirm formal closure."*
- **Communication Center (Tabbed):**
  - **Tab 1: Public Comments:**
    - Background tint: `#F0F8F3`, border `#0B7A46`.
    - Message thread showing author name, role pill, and formatted timestamp.
    - Textarea input (1–1,000 chars) with "Post Public Comment" button.
  - **Tab 2: Internal Notes:**
    - Background tint: `#FFF9E6`, border `#B58105`.
    - Clear label: *"Internal Notes (Visible only to IT Staff and Administrators)"*.
    - Note thread showing author name, role pill, timestamp, and note content.
    - Textarea input with "Save Internal Note" button.
- **Attachments Card:** Lists existing active attachments with download link and soft-remove modal button (reason ≥ 5 chars).

### 3.5. Administrator User Management (`UserManagement.tsx`)
- **Layout:** Page title "User Management", toolbar with Search, Role filter dropdown, and "+ Create User" button.
- **User Table Columns:**
  - `Full Name`: User's display name.
  - `Email Address`: User's login email.
  - `Role`: Colored role pill (`Requester`, `IT Staff`, `Administrator`).
  - `Status`: Green `Active` pill or Red `Inactive` pill.
  - `Password Status`: Badge indicating `Normal` or `Must Change`.
  - `Actions`: "Edit" button and "Reset Password" button.
- **Create User Modal:**
  - Inputs: Full Name, Email, Role selector, Active switch (default on), Initial Password.
  - Inline error validation for duplicate email or empty fields.
  - Save button with spinner state.
- **Edit User Modal:**
  - Inputs: Full Name, Email, Role selector, Active toggle.
  - **Safety Invariant Protection:**
    - If editing logged-in Administrator: Active toggle is disabled with tooltip: *"You cannot deactivate your own account."*
    - If editing the sole remaining active Administrator: Role selector and Active toggle are disabled with tooltip: *"Cannot deactivate or demote the last active Administrator."*
- **Reset Password Modal:**
  - Input for new initial password.
  - Notice that user will be forced to change this password upon their next login.

---

## 4. Responsive Viewport Specifications

| Element | Desktop (1200px) | Tablet (800px) | Mobile (375px) |
|:---|:---|:---|:---|
| **AppShell Navbar** | Horizontal links + user menu | Horizontal scroll / compact links | Wrapped links or mobile toggle menu |
| **Login Card** | 440px centered card | 400px centered card | 100% width with 16px margins |
| **Ticket Queue** | 9-column data table | Compact 6-column table | Stacked card view (zero table overflow) |
| **Ticket Detail** | 2-column split (Info / Chat) | Stacked 2 sections | Single-column stacked cards |
| **User Management** | Full 6-column table | 5-column table | Stacked user cards with action buttons |
| **Modals / Drawers** | 560px centered modal | 500px centered modal | Full-width bottom sheet or modal |

---

## 5. Visual Checklist for Acceptance Testing

- [x] Header uses `--zen-primary` (`#006B3C`); primary buttons use `--zen-primary` and hover to `--zen-secondary`.
- [x] Editable fields are white with `#D0E0D8` border; read-only fields use `#F2F4F1`.
- [x] Required fields show a red asterisk (`*`) and render inline error messages directly below input.
- [x] Submit buttons display spinner and enter `disabled` state during network transit.
- [x] Public Comments card uses gentle green tint (`#F0F8F3`); Internal Notes card uses amber tint (`#FFF9E6`).
- [x] Status and Priority badges match between Queue, Detail, and User Management.
- [x] Active and Inactive user status pills are visibly distinct with clear contrast.
- [x] Focus rings (`outline: 2px solid var(--zen-secondary)`) visible on keyboard navigation.
- [x] Touch targets are at least 44px on mobile viewports.
- [x] Zero horizontal page scroll at 1200px, 800px, and 375px.
