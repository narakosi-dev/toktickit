# Lab 3 Sprint Engineering Specification

**Project:** TokTickIT — IT Service Desk Application  
**Sprint:** Lab 3 — Users, Roles, IT Staff Ticketing, and Admin Screens  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — KMUTT (1/2026)  
**Author:** Nara Kosiyaporn (67070505218)  
**Status:** Approved Engineering Specification  

---

## 1. Sprint Goal
Deliver an enterprise-grade authentication and role-based ticketing platform for TokTickIT that replaces the temporary Development Requester selector with secure credentials, introduces a shared IT Staff Ticket Queue with operational workflow controls (claim/reassign, IT Priority, status transitions, Public Comments, and role-restricted Internal Notes), and equips Administrators with a minimalist User Management screen to govern user accounts under strict safety invariants, all while preserving 100% of Lab 2 Requester capabilities and the Zen Green visual language.

---

## 2. Stakeholder Request Interpretation
The stakeholder requires a complete transition from the simulation harness of Lab 2 to a secure multi-role system. The requirements demand:
1. **Real Authentication & Credential Security:** Real users authenticate with email and password. Initial passwords created by an Administrator must enforce a mandatory password change on first login before allowing access to any application features.
2. **Server-Enforced Role-Based Authorization (RBAC):** Three distinct roles (`Requester`, `IT Staff`, `Administrator`) must be enforced strictly at the database and API layer. Hiding or disabling buttons on the frontend is a UX aid, never a security control.
3. **IT Staff Operational Queue & Ticket Lifecycle:** IT Staff need a centralized, shared queue to locate and prioritize work across all company tickets, claim or reassign ticket ownership, adjust IT Priority, record public communication and private operational notes, and transition tickets through an approved workflow.
4. **Minimalist Administrator User Management:** Administrators must be able to view, create, edit, activate/deactivate accounts, and assign a single permitted role, governed by critical safety invariants (an Administrator cannot deactivate themselves or the last active Administrator).
5. **Data & Regression Integrity:** All Lab 2 ticket, attachment, category, and related system data must be safely migrated to the new `User` model with zero data loss or broken foreign keys.

---

## 3. Scope

### 3.1. Included in Lab 3
1. **Secure Authentication:** Email/password login, secure token-based session management (`Authorization: Bearer <token>`), password hashing with `bcryptjs`, and clean logout.
2. **Mandatory First-Login Password Change:** Block normal application entry for users flagged with `mustChangePassword = true` until a compliant new password is saved.
3. **Role-Based Navigation & Access Control:** Role-restricted application shell and server-side authorization guards for `Requester`, `IT Staff`, and `Administrator`.
4. **Requester Regression Continuity:** Requesters create, view, search, filter, paginate, and manage attachments on their own tickets using their authenticated account.
5. **IT Staff Ticket Queue:** Global queue showing tickets across all requesters with search, multi-filtering (Category, System, Status, Requested Priority, IT Priority, Owner), multi-column sorting, and pagination.
6. **IT Staff Ticket Detail & Workflow:** Claim/reassign ownership, IT Priority overrides, status transitions according to the Status Transition Matrix, Public Comments, and Internal Notes.
7. **Collaborative Communication:**
   - **Public Comments:** Visible to Requester, IT Staff, and Administrator (append-only).
   - **Internal Notes:** Visible strictly to IT Staff and Administrator (append-only, 403 Forbidden to Requesters).
8. **Requester Resolution Indication:** Requesters can flag that their issue "Appears Resolved", leaving formal resolution to IT Staff.
9. **Minimalist Administrator User Management:** Single screen for viewing users, searching by name/email, filtering by role, creating users, editing basic details, toggling active status, and issuing initial passwords.
10. **Safety Invariants:** Email uniqueness, self-deactivation prevention, last-active-admin preservation, soft deactivation (no deletion).
11. **Zen Green Design Language:** Reusable components, consistent badge colors and geometries, inline validation, and responsive layouts across 1200px (Desktop), 800px (Tablet), and 375px (Mobile).

### 3.2. Explicitly Excluded from Lab 3
1. Email delivery, invitations, password-reset emails, or verification links.
2. Multi-factor authentication (MFA), OAuth2/social login, or single sign-on (SSO).
3. Self-registration and public account sign-up.
4. User deletion, bulk user operations, user import/export, and audit log history screens.
5. Multiple roles assigned to one user (strictly one role per user).
6. Department, organizational hierarchy, profile photos, or extended profile fields.
7. Actions Taken by IT Staff (deferred to Lab 4).
8. Formal SLA calculations, countdown timers, escalation policies, and notifications.
9. Executive dashboards and KPI analytics beyond basic queue counts.
10. Multi-tenant organizations or external customer administration.

---

## 4. Functional Requirements (FR)

### Authentication & Password Management
- **FR-01 (Authentication):** Users must authenticate using their registered email address and password. Successful authentication returns an authenticated session/token and user profile.
- **FR-02 (Invalid Credentials & Inactive Accounts):** The system must reject invalid credentials with a generic error message ("Invalid email or password"). Accounts flagged as inactive (`active: false`) must be rejected without exposing unnecessary account details.
- **FR-03 (Mandatory First-Login Password Change):** When a user with `mustChangePassword = true` authenticates, the system must restrict their access exclusively to the Change Password screen until a new password meeting policy is saved.
- **FR-04 (Password Validation):** The Change Password form must validate that the new password has at least 8 characters, includes uppercase and lowercase letters, a number, a special character, and matches the confirmation input.
- **FR-05 (Logout):** The application must provide a Logout action that immediately invalidates the active session on the client and redirects to the Login screen.
- **FR-06 (Current User Retrieval):** The system must provide a `/api/auth/me` endpoint to retrieve the current user's profile and permissions on application launch or page reload.

### Role-Based Access Control (RBAC) & Application Shell
- **FR-07 (Role-Specific Navigation):** The application shell must display the authenticated user's name and role badge, and present only the navigation destinations permitted for their role:
  - `Requester`: My Tickets, Create Ticket.
  - `IT Staff`: Ticket Queue, Create Ticket.
  - `Administrator`: User Management, Ticket Queue, Create Ticket.
- **FR-08 (Server-Side Authorization):** Every API endpoint must enforce role permissions on the backend. Attempting an unauthorized action must yield HTTP 403 Forbidden.
- **FR-09 (Requester Identity Binding):** For all Requester operations (ticket creation, listing, attachment upload/removal), the backend must derive the requester identity strictly from the authenticated user session, rejecting or ignoring any client-supplied `requesterId`.

### IT Staff Shared Ticket Queue
- **FR-10 (Queue Retrieval):** IT Staff and Administrators must be able to view a shared queue of all tickets across all requesters.
- **FR-11 (Queue Search):** The queue must support keyword search across Ticket Number and Ticket Summary.
- **FR-12 (Queue Multi-Filtering):** The queue must support filtering by Category, Related System, Status, Requested Priority, IT Priority, and Assignment (All, Unassigned, Assigned to Me, or Specific Staff).
- **FR-13 (Queue Sorting):** The queue must support sorting by Created Date, Updated Date, Ticket Number, Priority, and Status.
- **FR-14 (Queue Pagination):** The queue must display paginated results (default 10 per page) with total ticket count, page count, and Next/Previous navigation controls.
- **FR-15 (Queue Responsive Views):** The queue must present a full data table on desktop/tablet (≥768px) and responsive stacked cards on mobile (375px) with zero horizontal overflow.

### IT Staff Ticket Detail & Operational Workflows
- **FR-16 (IT Staff Ticket Detail View):** IT Staff must be able to open any ticket from the queue to view full metadata, requester details, category, system, requested priority, IT priority, status, attachments, comments, and internal notes.
- **FR-17 (Ticket Claim):** IT Staff must be able to claim an unassigned or assigned ticket, immediately assigning themselves as the primary Ticket Owner.
- **FR-18 (Ticket Reassignment):** IT Staff and Administrators must be able to reassign a ticket to any active IT Staff member from a dropdown.
- **FR-19 (IT Priority Override):** IT Staff and Administrators must be able to adjust the ticket's `IT Priority` independently of the Requester's `Requested Priority`.
- **FR-20 (Status Transitions):** IT Staff and Administrators must be able to update ticket status strictly following the approved Status Transition Matrix.
- **FR-21 (Requester Problem Appears Resolved):** Requesters must be able to click "Problem Appears Resolved" on their owned tickets, setting `resolvedByRequester: true` to signal IT Staff without bypassing formal resolution.

### Comments & Internal Notes
- **FR-22 (Public Comments Retrieval):** Public Comments must be visible to the ticket's Requester, all IT Staff, and Administrators.
- **FR-23 (Public Comment Creation):** Requesters (for their owned tickets), IT Staff, and Administrators must be able to post append-only Public Comments (1–1,000 characters).
- **FR-24 (Internal Notes Retrieval):** Internal Notes must be visible strictly to IT Staff and Administrators. Any request by a Requester to fetch internal notes must return HTTP 403 Forbidden.
- **FR-25 (Internal Note Creation):** IT Staff and Administrators must be able to append private operational Internal Notes (1–1,000 characters) to any ticket.
- **FR-26 (Audit Metadata):** Every Public Comment and Internal Note must record its author's name, role, and creation timestamp from the backend.

### Administrator User Management
- **FR-27 (User Listing):** Administrators must be able to view a list of all user accounts showing Full Name, Email Address, Role badge, Status badge (`Active` / `Inactive`), and an Edit action.
- **FR-28 (User Search & Filter):** Administrators must be able to search users by name or email keyword and optionally filter by role.
- **FR-29 (User Creation):** Administrators must be able to create a user by supplying Name, Email Address, one permitted Role, initial Active state, and an Initial Password. Newly created users are flagged with `mustChangePassword = true`.
- **FR-30 (User Editing):** Administrators must be able to update a user's Name, Email Address, Role, and Active status.
- **FR-31 (Reset Initial Password):** Administrators must be able to set a new initial password for any user account, resetting `mustChangePassword` to `true`.
- **FR-32 (Non-Admin Access Prevention):** Any non-Administrator user attempting to access `/api/admin/*` endpoints must receive HTTP 403 Forbidden.

---

## 5. Business Rules (BR)

### Credential & Authentication Rules
- **BR-01 (Active Account Prerequisite):** Only active users (`active = true`) with valid password credentials may authenticate. Inactive users are rejected with: `"Account is inactive. Please contact an administrator."`
- **BR-02 (Mandatory First Password Change):** Any user with `mustChangePassword = true` cannot access normal application screens or endpoints until a new password meeting policy is saved.
- **BR-03 (Password Complexity Policy):** New passwords must be at least 8 characters in length and include at least one uppercase letter, one lowercase letter, one number, and one special character (`[!@#$%^&*(),.?":{}|<>]`).
- **BR-04 (No Plaintext Passwords):** Passwords must never be stored, logged, or transmitted in plaintext. Passwords must be hashed using `bcrypt` (work factor 10).
- **BR-05 (Single Permitted Role):** Every user has exactly one role: `Requester`, `IT_Staff`, or `Administrator`. Multiple roles per user are forbidden.

### Authorization & Ownership Rules
- **BR-06 (Server-Side Ownership Enforcement):** Authenticated session identity governs ownership. Client-provided requester IDs in request payloads or query parameters are ignored or validated strictly against `req.user.id`.
- **BR-07 (Requester Ticket Isolation):** Requesters may only view, search, and manage tickets they created (`requesterId = user.id`). Accessing another requester's ticket returns HTTP 404 Not Found (to prevent ID enumeration).
- **BR-08 (Public Comments Visibility):** Public Comments are visible to the Ticket Requester, all IT Staff, and Administrators.
- **BR-09 (Internal Notes Isolation):** Internal Notes are operational records visible strictly to IT Staff and Administrators. Requesters are blocked with HTTP 403 Forbidden without disclosing note existence.
- **BR-10 (Append-Only Communications):** Public Comments and Internal Notes are append-only. Editing and deletion are disallowed in Lab 3. Content must be non-empty, trimmed, between 1 and 1,000 characters.

### IT Workflow, Priority & Status Rules
- **BR-11 (Ticket Ownership):** Each ticket has at most one primary Ticket Owner (`ownerId`) who must be an active `IT_Staff` or `Administrator`. Newly created tickets have `ownerId = null` (Unassigned).
- **BR-12 (IT Priority Separation):**
  - `Requested Priority` is set by the Requester upon creation (`Low`, `Medium`, `High`, `Critical`) and is immutable.
  - `IT Priority` initially defaults to the `Requested Priority` value.
  - Only IT Staff and Administrators may alter `IT Priority`.
- **BR-13 (Status Transition Matrix):**
  The permitted lifecycle statuses are: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`.
  Permitted transitions are restricted as follows:

| Current Status | Permitted Next Statuses | Permitted Roles | Notes / Conditions |
|:---|:---|:---|:---|
| **New** | `Open`, `In Progress`, `Cancelled` | IT Staff, Administrator | `Open` upon claim or review |
| **Open** | `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled` | IT Staff, Administrator | Active work begun |
| **In Progress** | `Waiting for Requester`, `Resolved`, `Cancelled` | IT Staff, Administrator | Ready for verification |
| **Waiting for Requester** | `In Progress`, `Resolved`, `Cancelled` | IT Staff, Administrator | Resumes upon feedback |
| **Resolved** | `Closed`, `Reopened` | IT Staff, Administrator | Formal resolution by Staff |
| **Reopened** | `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled` | IT Staff, Administrator | Issue recurred |
| **Closed** | `Reopened` | IT Staff, Administrator | Final archival |
| **Cancelled** | *None* | IT Staff, Administrator | Terminal state |

- **BR-14 (Requester Resolution Limitation):** Requesters cannot transition a ticket to `Resolved` or `Closed`. A Requester may only set `resolvedByRequester = true` via the "Problem Appears Resolved" action. Only IT Staff or Admin may formally change the status to `Resolved` or `Closed`.

### Administrator Safety Rules
- **BR-15 (Unique Email Constraint):** User emails must be unique across all accounts (case-insensitive). Duplicate creation or update attempts must return HTTP 400 Bad Request.
- **BR-16 (Self-Deactivation Prevention):** An Administrator cannot deactivate their own active account. Attempts return HTTP 400 Bad Request: `"Administrators cannot deactivate their own account."`
- **BR-17 (Last Active Administrator Invariant):** The system must never be left without an active Administrator. Any action that would deactivate or demote the sole remaining active Administrator must be blocked with HTTP 400 Bad Request: `"Cannot deactivate or change role of the last active Administrator."`
- **BR-18 (Deactivation Over Deletion):** User deletion is excluded. Accounts are preserved and soft-deactivated (`active: false`).

---

## 6. UI Specification Summary

The Lab 3 interface strictly extends the **Zen Green Design System**:
- **Color Tokens:**
  - Header & Brand Primary: `#006B3C` (Forest Green)
  - Interactive & Hover: `#0B7A46` (Medium Green)
  - Pale Accent / Selected: `#EAF6EF` (Pale Green)
  - Page Background: `#F5F7F6` (Off-white / Soft Gray)
  - Cards & Modals: `#FFFFFF` with border `#D0E0D8` and subtle elevation shadow
  - Body Text: `#1B3A2A` (Dark Charcoal-Green)
  - Internal Notes Accent: `#B58105` / Background `#FFF9E6` (Warm Amber Callout)
  - Public Comments Accent: `#0B7A46` / Background `#F0F8F3` (Gentle Green Callout)
- **Role Navigation Rules:**
  - `Requester`: Links to **My Tickets**, **Create Ticket**, and User profile menu (Logout, Change Password).
  - `IT Staff`: Links to **Ticket Queue**, **Create Ticket**, and User profile menu (Logout, Change Password).
  - `Administrator`: Links to **User Management**, **Ticket Queue**, **Create Ticket**, and User profile menu.
- **Form Conventions:**
  - Required fields marked with red asterisk (`*`).
  - Validation error messages appear immediately below the input.
  - Buttons enter busy state with spinner and `disabled` attribute during asynchronous operations.
- **Responsive Layouts:**
  - **Desktop (1200px):** Full-width data tables, filter toolbars, multi-column detail panels.
  - **Tablet (800px):** Compact tables, collapsible filters, 2-column forms.
  - **Mobile (375px):** Stacked responsive cards, full-width touch targets (≥44px), zero horizontal overflow (`scrollWidth <= clientWidth`).

---

## 7. Data Changes (Prisma & PostgreSQL)

### 7.1. Prisma Schema Evolution
The schema evolves to introduce the `User` model, linking existing tickets to Requesters while adding ownership, comments, and internal notes:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  Requester
  IT_Staff
  Administrator
}

model User {
  id                 Int       @id @default(autoincrement())
  email              String    @unique
  passwordHash       String
  name               String
  role               Role      @default(Requester)
  active             Boolean   @default(true)
  mustChangePassword Boolean   @default(true)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  requestedTickets   Ticket[]  @relation("TicketRequester")
  ownedTickets       Ticket[]  @relation("TicketOwner")
  publicComments     PublicComment[]
  internalNotes      InternalNote[]

  @@index([role])
  @@index([active])
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
  tickets   Ticket[]
}

model RelatedSystem {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  tickets   Ticket[]
}

model Ticket {
  id                   Int           @id @default(autoincrement())
  ticketNumber         String        @unique
  ticketDate           DateTime      @default(now())
  summary              String
  description          String
  priority             String        // Low | Medium | High | Critical (Requested Priority)
  itPriority           String        // Low | Medium | High | Critical (IT Priority)
  status               String        @default("New")
  resolvedByRequester  Boolean       @default(false)
  requesterId          Int
  ownerId              Int?
  categoryId           Int
  relatedSystemId      Int
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  requester            User          @relation("TicketRequester", fields: [requesterId], references: [id])
  owner                User?         @relation("TicketOwner", fields: [ownerId], references: [id])
  category             Category      @relation(fields: [categoryId], references: [id])
  relatedSystem        RelatedSystem @relation(fields: [relatedSystemId], references: [id])
  attachments          Attachment[]
  publicComments       PublicComment[]
  internalNotes        InternalNote[]

  @@index([requesterId])
  @@index([ownerId])
  @@index([status])
  @@index([categoryId])
  @@index([itPriority])
}

model Attachment {
  id            Int       @id @default(autoincrement())
  filename      String
  originalName  String
  mimeType      String
  sizeBytes     Int
  active        Boolean   @default(true)
  removalReason String?
  removedAt     DateTime?
  ticketId      Int
  createdAt     DateTime  @default(now())

  ticket        Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@index([active])
}

model PublicComment {
  id        Int      @id @default(autoincrement())
  content   String
  ticketId  Int
  authorId  Int
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  @@index([ticketId])
}

model InternalNote {
  id        Int      @id @default(autoincrement())
  content   String
  ticketId  Int
  authorId  Int
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  @@index([ticketId])
}
```

### 7.2. Idempotent Seed Data (`server/prisma/seed.ts`)
The seed script will be safe to execute repeatedly without duplicating data:
- **Requesters (at least 4 active + 1 inactive):**
  - Nara Kosiyaporn (`nara.kosi@kmutt.ac.th`, active: true)
  - Sunny farmhouse (`nara2012sun@gmail.com`, active: true)
  - Jennifer Anderson (`jennifer.anderson@example.com`, active: true)
  - Alex Thompson (`alex.thompson@example.com`, active: true)
  - Inactive Requester (`inactive.requester@example.com`, active: false)
- **IT Staff (at least 3 active + 1 inactive):**
  - Michael Brown (`michael.brown@toktickit.com`, active: true)
  - Sarah Johnson (`sarah.johnson@toktickit.com`, active: true)
  - David Lee (`david.lee@toktickit.com`, active: true)
  - Inactive Staff (`inactive.staff@toktickit.com`, active: false)
- **Administrators (at least 1 active):**
  - System Administrator (`admin@toktickit.com`, active: true)
- **Initial Password:** All seeded accounts have initial password `Password123!` with `mustChangePassword = true` (except verified test accounts configured for automated testing).

---

## 8. REST API Contract

### Authentication Endpoints
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Response (200): `{ token, user: { id, email, name, role, active, mustChangePassword } }`
  - Response (401): `{ error: "Invalid email or password" }`
  - Response (403): `{ error: "Account is inactive. Please contact an administrator." }`
- `POST /api/auth/logout`
  - Headers: `Authorization: Bearer <token>`
  - Response (200): `{ message: "Logged out successfully" }`
- `GET /api/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Response (200): `{ user: { id, email, name, role, active, mustChangePassword } }`
  - Response (401): `{ error: "Unauthorized" }`
- `POST /api/auth/change-password`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ currentPassword, newPassword, confirmPassword }`
  - Response (200): `{ message: "Password updated successfully", user }`
  - Response (400): `{ error: "<validation error>" }`

### IT Staff Queue & Operational Endpoints
- `GET /api/staff/tickets`
  - Role: `IT_Staff`, `Administrator`
  - Query: `search`, `categoryId`, `relatedSystemId`, `priority`, `itPriority`, `status`, `ownerId`, `page`, `limit`, `sortBy`, `sortOrder`
  - Response (200): `{ tickets: [...], pagination: { page, limit, total, totalPages } }`
- `GET /api/staff/tickets/:id`
  - Role: `IT_Staff`, `Administrator`
  - Response (200): Ticket detail with relations, attachments, comments, and internal notes.
- `PATCH /api/staff/tickets/:id/assign`
  - Role: `IT_Staff`, `Administrator`
  - Body: `{ ownerId: number | null }`
  - Response (200): Updated ticket with new owner.
- `PATCH /api/staff/tickets/:id/priority`
  - Role: `IT_Staff`, `Administrator`
  - Body: `{ itPriority: "Low" | "Medium" | "High" | "Critical" }`
  - Response (200): Updated ticket.
- `PATCH /api/staff/tickets/:id/status`
  - Role: `IT_Staff`, `Administrator`
  - Body: `{ status: string }`
  - Response (200): Updated ticket.
  - Response (400): Invalid transition attempt per Status Transition Matrix.

### Comments & Notes Endpoints
- `GET /api/tickets/:id/comments`
  - Role: Requester (owned ticket), IT Staff, Administrator
  - Response (200): `[{ id, content, author: { id, name, role }, createdAt }]`
- `POST /api/tickets/:id/comments`
  - Role: Requester (owned ticket), IT Staff, Administrator
  - Body: `{ content: string }`
  - Response (201): Created public comment.
- `GET /api/tickets/:id/notes`
  - Role: `IT_Staff`, `Administrator` (403 Forbidden for Requester)
  - Response (200): `[{ id, content, author: { id, name, role }, createdAt }]`
- `POST /api/tickets/:id/notes`
  - Role: `IT_Staff`, `Administrator` (403 Forbidden for Requester)
  - Body: `{ content: string }`
  - Response (201): Created internal note.
- `PATCH /api/tickets/:id/resolve-indication`
  - Role: Requester (owned ticket)
  - Body: `{ resolved: boolean }`
  - Response (200): `{ id, resolvedByRequester: true, status }`

### Administrator User Management Endpoints
- `GET /api/admin/users`
  - Role: `Administrator`
  - Query: `search`, `role`
  - Response (200): `[{ id, name, email, role, active, mustChangePassword, createdAt }]`
- `POST /api/admin/users`
  - Role: `Administrator`
  - Body: `{ name, email, role, active, initialPassword }`
  - Response (201): Created user profile.
  - Response (400): Duplicate email or validation failure.
- `PATCH /api/admin/users/:id`
  - Role: `Administrator`
  - Body: `{ name, email, role, active }`
  - Response (200): Updated user profile.
  - Response (400): Self-deactivation violation or last active admin violation.
- `POST /api/admin/users/:id/reset-password`
  - Role: `Administrator`
  - Body: `{ newInitialPassword }`
  - Response (200): Password reset confirmation with `mustChangePassword = true`.

---

## 9. Acceptance Criteria (AC)

- **AC-01 (Valid Authentication):** Given an active user with valid credentials, when they submit the login form, the backend establishes an authenticated session and returns user identity and role.
- **AC-02 (Mandatory Password Change):** Given a user flagged with `mustChangePassword = true`, when login succeeds, normal application screens remain inaccessible until a valid new password is saved.
- **AC-03 (Inactive Account Rejection):** Given an account flagged `active = false`, when login is attempted, the backend rejects the request with HTTP 403 and message `"Account is inactive"`.
- **AC-04 (Role-Based Shell Navigation):** Given an authenticated user, the application shell displays only the navigation options authorized for their role (`Requester`, `IT Staff`, or `Administrator`).
- **AC-05 (Requester Ownership Continuation):** Given an authenticated Requester, when creating or viewing tickets, the backend enforces ownership using the authenticated user identity and strictly isolates tickets from other requesters.
- **AC-06 (IT Staff Ticket Queue Browsing):** Given an authenticated IT Staff user, when accessing the Ticket Queue, the system returns tickets across all requesters with working search, filtering, sorting, and pagination.
- **AC-07 (Ticket Ownership Claim & Reassignment):** Given an IT Staff user on Ticket Detail, when claiming a ticket, `ownerId` updates to the current user; when reassigning, the ticket ownership updates to the chosen active staff member.
- **AC-08 (IT Priority Adjustment):** Given an IT Staff user on Ticket Detail, when updating IT Priority, the ticket's `itPriority` updates without modifying `priority` (Requested Priority).
- **AC-09 (Status Transition Enforcement):** Given an IT Staff user on Ticket Detail, when updating status, the backend enforces the Status Transition Matrix, permitting valid transitions and rejecting invalid jumps with HTTP 400.
- **AC-10 (Requester Resolution Indication):** Given an authenticated Requester viewing their ticket, when clicking "Problem Appears Resolved", the system updates `resolvedByRequester = true` while keeping formal status transition restricted to IT Staff.
- **AC-11 (Public Comments Sharing):** Given a ticket, when a Requester or IT Staff posts a Public Comment, it appears in the comment thread with author name, role badge, and creation timestamp.
- **AC-12 (Internal Notes Role Restriction):** Given an authenticated Requester, any attempt to read or post an Internal Note is rejected with HTTP 403 Forbidden without disclosing note content.
- **AC-13 (Admin User Listing & Search):** Given an Administrator, when opening User Management, the screen displays users with name, email, role, and active status, filterable by role and searchable by keyword.
- **AC-14 (Admin User Creation):** Given an Administrator, when creating a user with valid inputs and role, the system persists the account with `mustChangePassword = true` and rejects duplicate emails with HTTP 400.
- **AC-15 (Admin Self-Deactivation Prevention):** Given an Administrator editing their own account, attempting to toggle active status to false is rejected with HTTP 400: `"Administrators cannot deactivate their own account."`
- **AC-16 (Last Active Administrator Invariant):** Given the sole remaining active Administrator account, attempting to deactivate it or change its role is rejected with HTTP 400: `"Cannot deactivate or change role of the last active Administrator."`
- **AC-17 (Non-Admin User Management Forbidden):** Given a Requester or IT Staff user, attempting to access `/api/admin/users` returns HTTP 403 Forbidden.
- **AC-18 (Zen Green Responsiveness):** Given any Lab 3 screen, the layout renders cleanly and without horizontal page scroll across 1200px (Desktop), 800px (Tablet), and 375px (Mobile).

---

## 10. Product Definition of Done (DoD)

1. **Specification Approved:** Complete `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` created on `feature/lab3-spec-docs` and merged to `lab3-staging` before feature code.
2. **Database Migrated:** Prisma schema evolved with `User`, `PublicComment`, `InternalNote`, relations, indexes, and idempotent seed script with 0 data loss.
3. **Authentication & RBAC Fully Functional:** Login, mandatory password change, logout, and server-side route guards working end-to-end.
4. **IT Staff Workflows Operational:** Queue filtering, search, sorting, pagination, ticket claiming/reassignment, IT Priority updates, status transitions, and comments/notes working flawlessly.
5. **Admin Screen Compliant:** User management operational with all safety invariants verified.
6. **Automated Test Coverage:**
   - 6+ server test suites in `server/tests/lab-03/` passing with 0 failures.
   - 5+ client test suites in `client/src/tests/lab-03/` passing with 0 failures.
   - 3+ Playwright E2E test suites in `e2e/lab-03/` passing with 0 failures.
   - Regression: All Lab 1 and Lab 2 tests continuing to pass.
7. **Git Discipline:** 6 GitHub Issues, feature branches, reviewed PRs into `lab3-staging`, and final Release PR to `main`.
8. **Final Deliverable:** Official Lab 3 Report generated in `.docx` and PDF covering Answer Part 1 to Answer Part 9.

---

## 11. Assumptions and Architectural Decisions

1. **Token Transport:** We use Bearer tokens transmitted via the standard `Authorization: Bearer <token>` HTTP header. This decouples client state from cookie restrictions in local cross-port development.
2. **Password Hashing:** `bcryptjs` is selected as the hashing implementation because it is 100% pure JavaScript, completely eliminating native compilation and node-gyp issues on Windows environments.
3. **Internal Note Safety:** Requesters are forbidden from viewing or creating internal notes. Responses return HTTP 403 without disclosing the count or presence of internal notes.
4. **Status Independence:** The "Problem Appears Resolved" flag is a boolean indicator on the Ticket model (`resolvedByRequester: boolean`). It provides actionable feedback to IT Staff without altering the official ticket status prematurely.
