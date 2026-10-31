# Lab 4 Sprint Engineering Specification

**Project:** TokTickIT — IT Service Desk Application  
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — KMUTT (Semester 1/2026)  
**Author:** Nara Kosiyaporn (Student ID: 67070505218)  
**Status:** Approved Engineering Contract (Pre-Implementation Baseline)  

---

## 1. Sprint Goal
Complete the core TokTickIT enterprise service-desk application by implementing a granular parent-child work-tracking system (**Actions Taken**) under each Ticket, enforcing the authoritative **Ticket Status Transition Matrix** and resolution gate, delivering role-appropriate **Operational Dashboards** for Requesters, IT Staff, and Administrators with interactive drill-down navigation, and hardening the entire full-stack system across Labs 1 to 4 with 100% regression stability, responsive multi-viewport layouts, and WCAG accessibility compliance under the Zen Green design language.

---

## 2. Stakeholder Request Interpretation
The service desk stakeholder emphasizes that while communication channels (Public Comments and Internal Notes) exist from Lab 3, IT operations still lack structured planning, assignment, and execution tracking for actual technical labor. The stakeholder requirements mandate:
1. **Granular Technical Action Tracking:** Under each Ticket, IT Staff must record discrete work items ("Actions Taken") detailing: Action Date/Time, Action Description, Result, Performed by (auto-attributed or assigned), Follow-Up Required toggle, Follow-up Note (conditionally required), and Attachment Notes referencing diagnostic images/logs.
2. **Flexible Multi-Staff Collaboration:** While a Ticket has a single primary Ticket Owner responsible for overall coordination, multiple different IT Staff members must be able to perform and log Actions Taken on the same Ticket.
3. **Formal Resolution Governance:** Requesters may indicate that their issue appears resolved (`resolvedIndicated = true`), but this indicator is purely advisory. Only permitted IT Staff/Administrators can formally transition a Ticket to `Resolved` after reviewing the Actions Taken.
4. **Role-Appropriate Operational Dashboards:**
   - **Requesters** require a personalized dashboard summarizing their open, waiting, recently updated, and resolved tickets.
   - **IT Staff & Administrators** require an operational dashboard showing unassigned tickets, tickets owned by the current user, queue breakdown by status and IT priority, and recently updated tickets.
   - All metrics must be computed authoritatively by the backend and provide direct drill-down links to filtered lists.
5. **Concurrency & Safe Failure Hardening:** The system must detect stale updates and prevent concurrent overwrites when multiple technicians coordinate tickets. All features from Labs 1–3 must remain fully intact.

---

## 3. Scope

### 3.1. Included in Lab 4
1. **Actions Taken Data Model & REST APIs:** Create, read, and update technical action lines under tickets with automated actor binding, role authorization, and validation.
2. **Actions Taken UI in Ticket Detail:** Chronological action list/table, create and edit modal/inline forms for IT Staff, and read-only presentation for Requesters.
3. **Authoritative Ticket Status Transition Matrix:** Strict server-side enforcement across 8 statuses (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).
4. **Advisory Resolution Gate:** Decoupling of Requester resolution feedback from authoritative formal resolution.
5. **Optimistic Concurrency Control:** Version-based stale update detection (`version` counter) returning HTTP 409 Conflict with client-side recovery.
6. **IT Staff & Administrator Operational Dashboard:** Backend metric aggregations and responsive frontend dashboard with drill-down links to filtered queue views.
7. **Requester Personal Dashboard:** Ownership-isolated metric aggregations and responsive frontend dashboard with drill-down links to My Tickets.
8. **Database Increment & Backfill:** Safe Prisma migration adding `ActionTaken` model and `version` column to `Ticket` with zero loss of legacy data.
9. **Idempotent Seeding:** Rich seed dataset with realistic tickets covering zero, one, and multiple Actions Taken across all statuses.
10. **Full Regression Continuity:** Verified stability across Authentication, User Management, Ticket Creation, Attachments, Comments, Notes, Categories, and Systems.
11. **Responsive & Accessible Polish:** Zen Green design language maintained across Desktop (1280px), Tablet (768px), and Mobile (375px) viewports with zero horizontal overflow.

### 3.2. Explicitly Excluded from Lab 4 (Handout Section 4.2)
1. Automatic SLA clocks, countdown escalation engines, on-call scheduling, and breach alerts.
2. External notification dispatchers (Email, SMS, LINE, Webhooks, Push notifications).
3. Inventory consumption, spare-parts management, asset barcodes, or vendor purchasing.
4. Time-sheet billing, payroll tracking, or labor-cost financial calculations.
5. Multi-level approval workflows and cryptographic electronic signatures.
6. Advanced Business Intelligence (BI) tools, ad-hoc report builders, or external data warehouses.
7. Multi-tenant multi-organization partitioning or cloud multi-region clusters.
8. Unapproved feature extensions outside the Sprint 4 engineering contract.

---

## 4. Functional Requirements (FR)

### Actions Taken Management
- **FR-01 (Actions Taken Creation):** Authenticated IT Staff and Administrators can create an Action Taken record under any accessible Ticket by providing Action Date/Time, Description, Result, Follow-Up Required flag, Follow-Up Note (if required), and Attachment Notes.
- **FR-02 (Actor Attribution & Primary Ownership):** The system automatically records the authenticated technician as the creator/performed-by user (`performedById`). The Ticket Owner coordinates the Ticket, while Actions Taken may be performed by different IT Staff members.
- **FR-03 (Actions Taken Update):** Permitted IT Staff and Administrators can edit existing Actions Taken records (e.g., updating result or follow-up note) to reflect ongoing diagnostic findings.
- **FR-04 (Requester Read-Only Visibility):** Authenticated Requesters can view the list of Actions Taken on their owned tickets to understand work progress. Requesters are strictly prohibited from creating, updating, or deleting Actions Taken.

### Ticket Status Workflow & Concurrency
- **FR-05 (Permitted Status Transitions):** Ticket status transitions must strictly adhere to the approved Status Transition Matrix. Invalid transitions must be rejected by the server with HTTP 400 Bad Request.
- **FR-06 (Advisory Resolution Gate):** A Requester's indication that the problem appears resolved (`resolvedIndicated = true`) is stored as an advisory signal and does NOT automatically change the Ticket status to `Resolved`. Formal transition to `Resolved` requires explicit action by IT Staff/Admin.
- **FR-07 (Optimistic Concurrency Control):** Every Ticket status and workflow update must include the known `version` integer. If the record in the database has a higher `version` (stale update), the server must reject the operation with HTTP 409 Conflict.

### Role-Based Dashboards
- **FR-08 (IT Staff & Admin Dashboard):** Provides authoritative metrics for IT Staff: Unassigned Tickets, Tickets Owned by Current User, Tickets by Status, Tickets by IT Priority, and Urgent Tickets requiring attention, complete with drill-down routes to the Staff Queue.
- **FR-09 (Requester Dashboard):** Provides personal metrics for Requesters: Total Open Tickets, Tickets Waiting for Requester, Recently Updated Tickets, and Recently Resolved Tickets, with drill-down routes to filtered My Tickets views.
- **FR-10 (Authoritative Aggregation):** All dashboard metrics must be computed by backend database queries with clear time boundaries, avoiding client-side collection scanning.

### Hardening & Regression
- **FR-11 (Full Regression Continuity):** All previous features (Login, First-login Password Change, Admin User Management, My Tickets, Staff Queue, Attachments, Public Comments, Internal Notes) must continue functioning without error.
- **FR-12 (Responsive & Accessible Design):** Dashboards and Actions Taken UI must seamlessly render on Desktop (1280px), Tablet (768px), and Mobile (375px), maintaining visible focus and keyboard accessibility.

---

## 5. Business Rules (BR)

### Actions Taken Rules
- **BR-01 (Parent-Child Integrity):** Every Action Taken record belongs to exactly one Ticket (`ticketId NOT NULL`). Deleting or archiving a ticket cascades to its actions.
- **BR-02 (Staff Action Attribution):** An Action Taken may be performed by any active IT Staff member or Administrator, regardless of who currently holds the primary Ticket Owner role (`assignedToId`).
- **BR-03 (Follow-Up Note Validation):**
  - If `followUpRequired === true`, `followUpNote` is **mandatory** and must contain at least 5 non-whitespace characters.
  - If `followUpRequired === false`, `followUpNote` is optional or nullified.
- **BR-04 (Actions Taken Role Restrictions):**
  - `Administrator` and `IT_Staff`: Can create and edit Actions Taken on any ticket.
  - `Requester`: Can view Actions Taken on tickets they own (`ticket.requesterId === user.id`). Cannot view actions on other users' tickets (404/403). Write operations return 403 Forbidden.
- **BR-05 (Chronological Action Ordering):** Actions Taken must be returned in deterministic chronological order by `actionDateTime ASC`, with ties broken by `id ASC`.

### Ticket Lifecycle & Workflow Rules
- **BR-06 (Permitted Ticket Status Matrix):**
  The system allows only the following explicit status transitions:
  | Current Status | Permitted Next Statuses | Authorized Roles |
  | :--- | :--- | :--- |
  | `New` | `Open`, `Cancelled` | IT_Staff, Administrator |
  | `Open` | `In_Progress`, `Waiting_for_Requester`, `Resolved`, `Cancelled` | IT_Staff, Administrator |
  | `In_Progress` | `Waiting_for_Requester`, `Resolved`, `Open` | IT_Staff, Administrator |
  | `Waiting_for_Requester` | `In_Progress`, `Resolved`, `Cancelled` | IT_Staff, Administrator |
  | `Resolved` | `Closed`, `Reopened` | IT_Staff, Administrator |
  | `Reopened` | `In_Progress`, `Resolved`, `Cancelled` | IT_Staff, Administrator |
  | `Closed` | *(Terminal State — No transitions allowed)* | None |
  | `Cancelled` | *(Terminal State — No transitions allowed)* | None |
- **BR-07 (Formal Resolution Gate):**
  - Requester resolve indication (`POST /api/tickets/:id/resolve-indication`) sets `resolvedIndicated = true` and logs an activity log, but leaves `status` unchanged.
  - Only IT Staff / Administrator can transition status to `Resolved` via the workflow API.
- **BR-08 (Optimistic Locking & Concurrency Protection):**
  - Each `Ticket` record has an integer `version` field starting at 1.
  - Any update to ticket workflow fields (`status`, `assignedToId`, `itPriority`, `resolvedIndicated`) must increment `version = version + 1`.
  - If an update payload supplies a `version` that does not match the database, the update fails with HTTP 409 Conflict.
- **BR-09 (Terminal Immutability):**
  - Tickets in `Closed` or `Cancelled` status cannot receive new Actions Taken, comments, or status modifications.

### Dashboard Calculation Rules
- **BR-10 (Requester Dashboard Isolation):**
  - `totalOpen`: Tickets owned by the authenticated Requester with `status IN ('New', 'Open', 'In_Progress', 'Waiting_for_Requester', 'Reopened')`.
  - `waitingForRequester`: Tickets owned by the Requester with `status = 'Waiting_for_Requester'`.
  - `recentlyResolved`: Tickets owned by the Requester with `status = 'Resolved'` updated in the past 30 days.
  - `closedCount`: Tickets owned by the Requester with `status = 'Closed'`.
- **BR-11 (IT Staff Dashboard Aggregation):**
  - `unassignedCount`: Tickets with `assignedToId IS NULL` and `status NOT IN ('Closed', 'Cancelled')`.
  - `myAssignedCount`: Tickets where `assignedToId = currentUser.id` and `status NOT IN ('Closed', 'Cancelled')`.
  - `statusBreakdown`: Counts grouped by each active status (`New`, `Open`, `In_Progress`, `Waiting_for_Requester`, `Resolved`, `Reopened`).
  - `priorityBreakdown`: Active tickets grouped by effective priority (`Critical`, `High`, `Medium`, `Low`).
  - `urgentTickets`: Top 5 tickets with `itPriority = 'Critical'` or `priority = 'Critical'` sorted by `createdAt ASC` (oldest first).

---

## 6. UI Specification Summary

### Screen Layouts & Extensions
1. **IT Staff Dashboard (`/staff/dashboard`):**
   - Header: Personalized greeting ("Welcome back, {name}!"), quick refresh button.
   - Metrics Banner: 5 concise metric cards: **New**, **Open**, **In Progress**, **Waiting for Requester**, and **My Assigned**.
   - Two-Column Operations Layout:
     - Left Column: "Urgent & Recent Tickets" list with ticket number, summary, priority badge, status badge, and date.
     - Right Column: "Quick Actions" navigation panel (Create Ticket, Search Tickets, View My Queue) and status breakdown chart/table.
   - Drill-down: Clicking any metric card routes to `/staff/tickets` pre-filtered by that status or assignee.
2. **Requester Dashboard (`/requester/dashboard`):**
   - Header: Greeting and summary banner.
   - Metric Cards: **My Open Tickets**, **In Progress**, **Resolved**, and **Closed**.
   - Recent Tickets List: 5 most recent tickets owned by requester with clickable links to `/tickets/:id`.
   - Quick Actions: "Create Ticket" shortcut and "View All My Tickets".
3. **Actions Taken in Ticket Detail (`/tickets/:id`):**
   - Placed as a dedicated tab/panel alongside Public Comments and Internal Notes.
   - List View: Clean card/table presentation displaying Date/Time, Performed By name, Result summary, Follow-Up badge, and Attachment Notes.
   - Create/Edit Modal or Inline Form:
     - Action Description (textarea, required)
     - Result (textarea, required)
     - Performed By (pre-filled with current technician; option to reattribute to another active IT staff member)
     - Follow-Up Required toggle (checkbox/switch)
     - Follow-Up Note (input, dynamically required if toggle is checked)
     - Attachment Notes (input, optional)
   - Requester Mode: Clean read-only timeline without action buttons or edit controls.
4. **Ticket Status Controls:**
   - Dedicated workflow toolbar on IT Staff Ticket Detail.
   - Dropdown or button group displaying strictly valid transitions according to BR-06.
   - Real-time status update with visual confirmation and refresh.
   - Concurrency error modal with a "Refresh Ticket" button if an update conflict (409) occurs.

### Design System & Accessibility (Zen Green)
- **Palette:** Forest green headers (`#1B4332`), emerald primary accents (`#2D6A4F`), light sage background (`#D8F3DC` / `#F0FFF4`), slate neutral text (`#2D3748`).
- **Responsive Breakpoints:**
  - Desktop: $\ge 1200\text{px}$ (multi-column grid, expanded tables)
  - Tablet: $768\text{px} - 1199\text{px}$ (stacked dashboard widgets, scrollable cards)
  - Mobile: $\le 767\text{px}$ (single-column layout, touch-friendly tap targets $\ge 44\text{px}$, no horizontal scroll)
- **Accessibility:** ARIA live regions for async status updates, semantic landmarks (`<nav>`, `<main>`, `<section>`), visible focus rings, non-color cues for statuses.

---

## 7. Data Changes & Design Decisions

### 7.1. Database Schema Additions

```prisma
model ActionTaken {
  id               Int       @id @default(autoincrement())
  ticketId         Int
  ticket           Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedById    Int
  performedBy      User      @relation("ActionTakenStaff", fields: [performedById], references: [id])
  actionDateTime   DateTime  @default(now())
  description      String
  result           String
  followUpRequired Boolean   @default(false)
  followUpNote     String?
  attachmentNotes  String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([ticketId])
  @@index([performedById])
}
```

### 7.2. Ticket Schema Update
```prisma
model Ticket {
  // Existing fields ...
  version          Int           @default(1)
  actionsTaken     ActionTaken[]
  // ...
}
```

### 7.3. Justification of Database Design Decisions (Handout Section 5.1)
1. **Decision 1: Dedicated Parent-Child Entity (`ActionTaken`) vs Generic ActivityLog / JSON Column:**
   - *Justification:* Storing Actions Taken as a dedicated strongly-typed relational entity provides strict foreign-key integrity between `Ticket` and `User` (`performedById`), explicit SQL-level validation (e.g. non-null constraints on description and result), and indexed lookups (`@@index([ticketId])`). In contrast, storing actions in a loose JSON array or generic audit log would prevent database-level integrity, make join queries inefficient, and blur the distinction between system audit trails and formal technical actions.
2. **Decision 2: Optimistic Concurrency Control via Version Counter & Mutating Scope:**
   - *Justification:* In an enterprise service desk, multiple IT technicians or automated tools may view and update the same Ticket concurrently. Implementing optimistic locking through an integer `version` field (incremented on each write) eliminates the risk of silent overwrite ("lost updates") without resorting to heavy pessimistic database row locks, which degrade concurrency and introduce deadlocks in a stateless HTTP REST architecture.
   - *Scope of Version Counter & Design Intent:*
     - **Status Transitions (`PATCH /api/tickets/:id/status` and `PATCH /api/staff/tickets/:id/status`):** Strictly **requires** `version` in the request body (HTTP 400 `VERSION_REQUIRED` if missing). Status transitions advance the finite state machine (FSM) and enforce hard gates (e.g. resolution requires documented actions taken; terminal states are immutable). Stale updates here cause workflow corruption; thus, explicit version checking with atomic CAS (`updateMany({ where: { id, version } })`) is mandatory.
     - **Triage Mutations (`assign` and `priority`):** Automatically increment `version: { increment: 1 }` in the database without mandating `version` in the payload. Triage is a rapid operational task; requiring version could block quick reassignments, but incrementing `version` in the DB immediately invalidates stale views held by other technicians, protecting downstream status transitions from race conditions.
     - **Requester Resolution Indication (`POST /api/tickets/:id/resolve-indication`):** Increments `version: { increment: 1 }` upon setting `resolvedIndicated = true`.
   - *Known Limitation & Design Trade-off on Triage Operations:*
     Because `assign` and `priority` endpoints do not mandate `version` in the incoming client request payload (in order to avoid blocking high-velocity queue triage), concurrent rapid updates between multiple staff members updating assignment or priority simultaneously without checking versions will exhibit last-write-wins behavior, and lost updates are possible on those specific triage fields. Full OCC enforcement across all triage endpoints is deferred to a future milestone.
   - *Standard Machine-Readable Error Codes:* `VERSION_REQUIRED`, `INVALID_VERSION`, `STATUS_REQUIRED`, `INVALID_STATUS_TRANSITION`, `ACTION_TAKEN_REQUIRED`, `CONCURRENCY_CONFLICT`, `TICKET_NOT_FOUND`.

### 7.4. Migration & Backfill Strategy (Handout Section 5.2)
- Existing legacy tickets from Labs 1–3 are preserved completely.
- A new migration `20261029000000_lab4_actions_taken_and_version` creates the `ActionTaken` table and adds `version = 1` to `Ticket`.
- Existing tickets naturally have zero Actions Taken, which is explicitly handled by the application and dashboard calculations without requiring synthetic backfill.

### 7.5. Seed Strategy (Handout Section 5.3)
- Seed script is completely idempotent (uses `upsert`).
- Seeds tickets with:
  - Zero Actions Taken (e.g. brand new unassigned ticket)
  - One Action Taken (e.g. assigned ticket with diagnostic completed)
  - Multiple Actions Taken performed by different technicians (demonstrating multi-staff collaboration on a single ticket)
- Seeds tickets across all 8 statuses to demonstrate accurate non-zero dashboard metrics.

---

## 8. REST API Contract Summary

The complete endpoint schemas, parameters, and error formats are detailed in `docs/lab-04/api-spec.md`. The major additions for Sprint 4 are:

| Method | Endpoint | Authorized Roles | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tickets/:id/actions-taken` | Requester (owner), IT_Staff, Admin | Fetch list of Actions Taken for ticket |
| `POST` | `/api/tickets/:id/actions-taken` | IT_Staff, Admin | Record new Action Taken |
| `PATCH` | `/api/tickets/:id/actions-taken/:actionId` | IT_Staff, Admin | Update existing Action Taken |
| `PATCH` | `/api/tickets/:id/status` | IT_Staff, Admin | Perform permitted status transition with version check |
| `GET` | `/api/dashboard/staff` | IT_Staff, Admin | Operational metrics for IT Staff |
| `GET` | `/api/dashboard/requester` | Requester, Admin | Personalized metrics for Requester |
| `POST` | `/api/tickets/:id/resolve-indication` | Requester (owner) | Set advisory problem resolved indicator |

---

## 9. Acceptance Criteria (AC)

- **AC-01 (Action Taken Creation):** Given an authenticated IT Staff member and valid action payload, when creating an Action Taken, then it is saved with the correct `ticketId`, `actionDateTime`, and `performedById` equal to the authenticated user.
- **AC-02 (Follow-up Note Enforcement):** Given an Action Taken payload with `followUpRequired = true` and an empty `followUpNote`, when submitted, then the API rejects with HTTP 400 and validation error message.
- **AC-03 (Multiple Staff Actions on Single Ticket):** Given a Ticket owned by Staff A, when Staff B creates an Action Taken on that ticket, then the action is successfully logged with `performedById = Staff B` while the ticket owner remains Staff A.
- **AC-04 (Requester Read-Only Access):** Given an authenticated Requester viewing their own ticket, when requesting Actions Taken, then all records are returned; when attempting `POST` or `PATCH`, the server returns HTTP 403 Forbidden.
- **AC-05 (Cross-Requester Action Isolation):** Given Requester A attempting to view Actions Taken on a ticket owned by Requester B, the server returns HTTP 404 Not Found.
- **AC-06 (Permitted Status Transition):** Given an IT Staff member updating a ticket from `New` to `Open`, the server accepts the change, updates `status = 'Open'`, and increments `version`.
- **AC-07 (Illegal Status Transition Rejection):** Given an update attempt from `New` directly to `Resolved` (bypassing workflow), the server rejects the request with HTTP 400 Bad Request.
- **AC-08 (Optimistic Concurrency Conflict):** Given two clients attempting to update the same ticket status with the same starting `version = 1`, the first succeeds (version becomes 2), and the second is rejected with HTTP 409 Conflict.
- **AC-09 (Advisory Resolution Gate):** Given a Requester calling `/resolve-indication`, the ticket's `resolvedIndicated` becomes `true`, but `status` remains unchanged.
- **AC-10 (Staff Dashboard Metrics Accuracy):** Given seeded tickets in database, when calling `/api/dashboard/staff`, the returned counts for unassigned, my assigned, and status groups match exact SQL aggregations.
- **AC-11 (Requester Dashboard Isolation):** Given Requester A, when calling `/api/dashboard/requester`, metrics reflect only tickets where `requesterId = Requester A`.
- **AC-12 (Dashboard Drill-Down Navigation):** Given a user clicking a metric card on the dashboard, the application navigates to the detailed list view with corresponding filter query parameters applied.
- **AC-13 (Zen Green Responsive Layout):** Given Desktop, Tablet, and Mobile viewport sizes, dashboards and Actions Taken sections render cleanly without overlapping controls or horizontal scrollbars.
- **AC-14 (Accessibility Compliance):** All form controls, buttons, and status indicators have visible focus outlines, accessible labels, and non-color cues.
- **AC-15 (Regression Continuity):** All existing test suites for Labs 1, 2, and 3 pass with 100% success rate on the updated codebase.

---

## 10. Product Definition of Done (DoD)

A feature or sprint increment is considered **Done** only when all of the following criteria are verified:
1. **Specification Pre-requisite:** Engineering specification and contract documents committed prior to implementation.
2. **Schema & Migration:** Prisma migrations applied cleanly, backward-compatible, and database seed runs idempotently.
3. **Backend Coverage:** 100% of REST API routes covered by automated Vitest integration tests in `server/tests/lab-04/`.
4. **Frontend Coverage:** All UI components tested with React Testing Library in `client/tests/lab-04/` covering loading, empty, success, and error states.
5. **E2E Automation:** Full Playwright multi-viewport test suite passing across Desktop, Tablet, and Mobile.
6. **No Regressions:** All tests from Labs 1, 2, and 3 continue to pass without modification.
7. **Code Quality:** Zero TypeScript compilation errors (`tsc`), zero linter warnings, and clean console logs.
8. **Responsive & A11y Verification:** Visual inspection confirming no horizontal overflow on mobile ($\le 375\text{px}$) and compliant keyboard navigation.
9. **Peer Review:** Code reviewed and approved by peer reviewer (`@Leviathan-c137`) with documentation in `reviewer.md`.
10. **CI Green:** GitHub Actions CI workflow runs 100% green on staging and main branches.
11. **Comprehensive Documentation:** Final report PDF generated and verified covering Parts 1 through 9.

---

## 11. Assumptions and Architectural Decisions

1. **Date/Time Standard:** All timestamps (`actionDateTime`, `createdAt`, `updatedAt`) are transmitted and stored in ISO 8601 UTC format. Client components render dates using the local browser locale.
2. **Real-Time Dynamic Queries:** Dashboard calculations execute live database queries rather than relying on stale caching mechanisms to ensure technicians see real-time queue states.
3. **Optimistic Locking Granularity:** The `version` field resides on `Ticket`. Actions Taken modifications do not update the ticket's `version` counter unless the action also transitions the ticket's status.
4. **Advisory Resolution UI:** When `resolvedIndicated = true`, the ticket detail screen displays a prominent informational banner alerting the technician that the requester has signaled satisfaction, prompting formal verification.
