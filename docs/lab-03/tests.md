# TokTickIT Lab 3: Test Plan & Traceability Matrix

## 1. Test Strategy & Architecture

The testing strategy for TokTickIT Lab 3 spans four complementary testing levels to ensure functional correctness, security enforcement, responsive UI fidelity, and business invariant preservation across all roles.

```
       +-------------------------------------------------------+
       |             End-to-End (Playwright)                   |
       |  Cross-browser full user flows across 3 viewports    |
       +-------------------------------------------------------+
                   |                               |
       +-----------------------+       +-----------------------+
       | Client Component Unit |       | Server API / Inegr.   |
       | Vitest + RTL (React)  |       | Vitest + Supertest    |
       | Forms, Guards, Modals |       | RBAC, DB Invariants   |
       +-----------------------+       +-----------------------+
                   \                               /
       +-------------------------------------------------------+
       |               Prisma Seed & Schema Check              |
       |      In-memory / Test Postgres DB Verification        |
       +-------------------------------------------------------+
```

### 1.1 Test Levels & Frameworks

| Level | Framework / Runner | Target Area | Execution Command |
|---|---|---|---|
| **Server API & Integration** | Vitest + Supertest | REST endpoints, JWT auth, RBAC middleware, Prisma DB transactions, status transition matrix, internal note forbidden checks | `npm.cmd --prefix server test` |
| **Client Component Unit** | Vitest + React Testing Library + jsdom | UI components, form validation, error states, responsive layout assertions, role-guarded views | `npm.cmd --prefix client test` |
| **End-to-End (E2E)** | Playwright (Chromium/Firefox/WebKit) | Complete end-user journeys (Login ➔ Queue ➔ Detail ➔ Comments/Notes ➔ Admin) across Desktop (1200px), Tablet (800px), Mobile (375px) | `npx.cmd playwright test` |
| **Static & Schema Validation** | TypeScript (`tsc`) & Prisma Validate | Type safety, schema integrity, zero compilation errors | `npm.cmd run build` |

---

## 2. Requirements & Business Rules Traceability Matrix

This matrix maps every Acceptance Criterion (AC-01 to AC-18) and Business Rule (BR-01 to BR-18) from `docs/lab-03/specification.md` directly to its verifying automated test file and test suite.

| Req ID | Description | Primary Test Level | Verifying Test File | Test Case / Suite Name |
|---|---|---|---|---|
| **AC-01** | Valid credentials return JWT & user profile | Server API / Integration | `server/tests/lab-03/auth.api.test.ts` | `POST /api/auth/login - valid credentials` |
| **AC-02** | Invalid credentials return 401 with generic error | Server API / Integration | `server/tests/lab-03/auth.api.test.ts` | `POST /api/auth/login - invalid email/password` |
| **AC-03** | Inactive user login returns 403 Forbidden | Server API / Integration | `server/tests/lab-03/auth.api.test.ts` | `POST /api/auth/login - inactive account blocked` |
| **AC-04** | Initial password login forces password change flow | Client Component / E2E | `client/src/test/Login.test.tsx` / `e2e/authentication.spec.ts` | `Login redirects mustChangePassword to /change-password` |
| **AC-05** | Successful password change clears flag & allows app access | Server API / E2E | `server/tests/lab-03/auth.api.test.ts` / `e2e/authentication.spec.ts` | `POST /api/auth/change-password clears mustChangePassword` |
| **AC-06** | IT Staff queue displays all tickets with metadata | Server API / Client | `server/tests/lab-03/staff-queue.api.test.ts` | `GET /api/staff/tickets returns complete ticket list` |
| **AC-07** | IT Staff queue multi-filter (status, priority, assignee, category) | Server API / Client | `server/tests/lab-03/staff-queue.api.test.ts` | `GET /api/staff/tickets filters by multiple criteria` |
| **AC-08** | IT Staff queue sorting and pagination | Server API / Client | `server/tests/lab-03/staff-queue.api.test.ts` | `GET /api/staff/tickets handles sort order & page pagination` |
| **AC-09** | Claim ticket assigns ticket to current IT Staff | Server API / E2E | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `POST /api/staff/tickets/:id/assign claims ticket` |
| **AC-10** | Reassign ticket changes assignee to another active IT Staff | Server API / Client | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `POST /api/staff/tickets/:id/assign reassigns to staff member` |
| **AC-11** | IT Priority override updates priority without changing user impact | Server API / Client | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `PATCH /api/staff/tickets/:id/priority updates itPriority` |
| **AC-12** | Valid status transitions succeed | Server API / E2E | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `PATCH /api/staff/tickets/:id/status allows valid transitions` |
| **AC-13** | Invalid status transitions return 400 Bad Request | Server API / Integration | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `PATCH /api/staff/tickets/:id/status rejects invalid transitions` |
| **AC-14** | Public comments visible to both Requester & Staff | Server API / E2E | `server/tests/lab-03/comments-notes.api.test.ts` | `Public comments accessible to Requester and Staff` |
| **AC-15** | Internal notes strictly forbidden (403) to Requesters | Server API / Integration | `server/tests/lab-03/comments-notes.api.test.ts` | `Internal notes API returns 403 Forbidden for Requester` |
| **AC-16** | Admin user list displays all users with roles and status | Server API / Client | `server/tests/lab-03/users-admin.api.test.ts` | `GET /api/admin/users lists all users` |
| **AC-17** | Admin creates user with temporary password & mustChangePassword | Server API / E2E | `server/tests/lab-03/users-admin.api.test.ts` | `POST /api/admin/users creates user with mustChangePassword=true` |
| **AC-18** | Safety invariant: Self-deactivation and last admin deactivation blocked | Server API / Client | `server/tests/lab-03/users-admin.api.test.ts` | `PATCH /api/admin/users/:id blocks self and last admin deactivation` |
| **BR-01** | Role exclusivity (User belongs to exactly one role) | Database / Server | `server/tests/lab-03/users-admin.api.test.ts` | `Prisma schema single enum Role enforcement` |
| **BR-02** | Mandatory first-login password change | Server / Middleware | `server/tests/lab-03/auth.api.test.ts` | `Password change guard blocks API access when mustChangePassword=true` |
| **BR-03** | Inactive account lockout | Server API / Middleware | `server/tests/lab-03/auth.api.test.ts` | `Auth middleware rejects inactive token holders with 403` |
| **BR-04** | Requester ticket scope isolation | Server API / Integration | `server/tests/lab-03/authorization.api.test.ts` | `Requester GET /api/tickets returns only own tickets` |
| **BR-05** | IT Staff shared queue visibility | Server API / Integration | `server/tests/lab-03/staff-queue.api.test.ts` | `IT Staff sees tickets created by all requesters` |
| **BR-06** | IT Staff assignment eligibility (only active IT Staff/Admin) | Server API / Integration | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `Cannot assign ticket to Requester or inactive staff` |
| **BR-07** | Dual priority separation (user impact vs. itPriority) | Server API / Database | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `Ticket keeps original impactPriority while itPriority changes` |
| **BR-08** | Status Transition Matrix enforcement | Server API / Integration | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `Exhaustive matrix validation for all status pairs` |
| **BR-09** | Public comment append-only rule | Server API / Database | `server/tests/lab-03/comments-notes.api.test.ts` | `Comments cannot be updated or deleted via API` |
| **BR-10** | Internal note total confidentiality | Server API / Security | `server/tests/lab-03/comments-notes.api.test.ts` | `Zero leakage of internal notes count or existence in requester APIs` |
| **BR-11** | Problem Appears Resolved indication | Server API / Client | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | `Requester can flag problem resolved when in In_Progress` |
| **BR-12** | Unique email constraint | Database / Server API | `server/tests/lab-03/users-admin.api.test.ts` | `POST /api/admin/users rejects duplicate email with 409 Conflict` |
| **BR-13** | Self-deactivation prevention | Server API / Integration | `server/tests/lab-03/users-admin.api.test.ts` | `Admin cannot deactivate own account (400 Bad Request)` |
| **BR-14** | Last active administrator protection | Server API / Integration | `server/tests/lab-03/users-admin.api.test.ts` | `Admin cannot deactivate the only remaining active admin (400)` |
| **BR-15** | Soft deactivation only (No hard delete) | Server API / Database | `server/tests/lab-03/users-admin.api.test.ts` | `No DELETE /api/admin/users endpoint; users preserved for ticket audit` |
| **BR-16** | Admin password reset flags mandatory change | Server API / Integration | `server/tests/lab-03/users-admin.api.test.ts` | `POST /api/admin/users/:id/reset-password sets mustChangePassword=true` |
| **BR-17** | Password complexity requirements (8+ chars, upper, lower, digit/sym) | Server / Client | `server/tests/lab-03/auth.api.test.ts` | `Password validation rejects weak passwords` |
| **BR-18** | Responsive layout without horizontal overflow | E2E / Visual | `e2e/staff-ticket-flow.spec.ts` | `Viewports 375px, 800px, 1200px have scrollWidth <= clientWidth` |

---

## 3. Server Integration Test Plan (`server/tests/lab-03/`)

### 3.1 Test Suite 1: Authentication & Password Lifecycle (`auth.api.test.ts`)
- **TC-AUTH-01 (AC-01):** `POST /api/auth/login` with valid email and password returns HTTP 200, JWT token, and sanitized user object (without passwordHash).
- **TC-AUTH-02 (AC-02):** `POST /api/auth/login` with non-existent email returns HTTP 401 with `{ error: "Invalid email or password" }`.
- **TC-AUTH-03 (AC-02):** `POST /api/auth/login` with wrong password returns HTTP 401 with `{ error: "Invalid email or password" }`.
- **TC-AUTH-04 (AC-03, BR-03):** `POST /api/auth/login` for deactivated user (`isActive: false`) returns HTTP 403 with `{ error: "Account has been deactivated" }`.
- **TC-AUTH-05 (AC-04, BR-02):** `POST /api/auth/login` with `mustChangePassword: true` returns `{ mustChangePassword: true, token: "..." }`.
- **TC-AUTH-06 (BR-02):** Requesting protected endpoint (e.g. `GET /api/staff/tickets`) with token having `mustChangePassword: true` returns HTTP 403 `{ code: "PASSWORD_CHANGE_REQUIRED" }`.
- **TC-AUTH-07 (AC-05, BR-17):** `POST /api/auth/change-password` with valid current password and strong new password updates passwordHash and sets `mustChangePassword: false`. Subsequent login works with new password.
- **TC-AUTH-08 (BR-17):** `POST /api/auth/change-password` with new password < 8 characters or lacking character diversity returns HTTP 400 Bad Request.
- **TC-AUTH-09:** `POST /api/auth/logout` clears session/token invalidation and returns HTTP 200.
- **TC-AUTH-10:** `GET /api/auth/me` with valid Bearer token returns current user profile; missing token returns HTTP 401.

### 3.2 Test Suite 2: Role-Based Access Control (`authorization.api.test.ts`)
- **TC-RBAC-01 (BR-04):** Requester calling `GET /api/tickets` receives HTTP 200 containing only tickets where `requesterId == req.user.id`.
- **TC-RBAC-02:** Requester calling `GET /api/staff/tickets` receives HTTP 403 Forbidden.
- **TC-RBAC-03:** Requester calling `GET /api/admin/users` receives HTTP 403 Forbidden.
- **TC-RBAC-04 (BR-05):** IT Staff calling `GET /api/staff/tickets` receives HTTP 200 with tickets across all requesters.
- **TC-RBAC-05:** IT Staff calling `GET /api/admin/users` receives HTTP 403 Forbidden.
- **TC-RBAC-06:** Administrator calling `GET /api/admin/users` receives HTTP 200.
- **TC-RBAC-07:** Administrator calling `GET /api/staff/tickets` receives HTTP 200.
- **TC-RBAC-08:** Tampered or expired JWT returns HTTP 401 Unauthorized across all endpoints.

### 3.3 Test Suite 3: IT Staff Shared Queue (`staff-queue.api.test.ts`)
- **TC-QUEUE-01 (AC-06):** `GET /api/staff/tickets` returns paginated list with total count, items array, and nested requester/assignee relations.
- **TC-QUEUE-02 (AC-07):** Filter by `status=New` returns only tickets with status `New`.
- **TC-QUEUE-03 (AC-07):** Filter by `priority=High` returns tickets matching `itPriority=High` or fallback `impactPriority=High`.
- **TC-QUEUE-04 (AC-07):** Filter by `assigneeId=unassigned` returns tickets where `assignedToId IS NULL`.
- **TC-QUEUE-05 (AC-07):** Filter by `assigneeId=:staffId` returns only tickets assigned to that staff member.
- **TC-QUEUE-06 (AC-07):** Search query `q=printer` performs case-insensitive substring search on `title`, `description`, and `ticketNumber`.
- **TC-QUEUE-07 (AC-08):** Sort by `createdAt` in `asc` and `desc` order returns properly ordered items.
- **TC-QUEUE-08 (AC-08):** Pagination `page=2&limit=5` correctly offsets records and calculates `totalPages`.

### 3.4 Test Suite 4: IT Staff Ticket Operations (`staff-ticket-detail.api.test.ts`)
- **TC-OP-01 (AC-09):** `POST /api/staff/tickets/:id/assign` with `{ staffId: req.user.id }` assigns ticket to self and creates activity entry.
- **TC-OP-02 (AC-10):** `POST /api/staff/tickets/:id/assign` with another active IT Staff user ID updates assignee.
- **TC-OP-03 (BR-06):** `POST /api/staff/tickets/:id/assign` with a Requester user ID returns HTTP 400 `{ error: "Assignee must be an active IT Staff or Administrator" }`.
- **TC-OP-04 (BR-06):** `POST /api/staff/tickets/:id/assign` with an inactive staff user ID returns HTTP 400 Bad Request.
- **TC-OP-05 (AC-11, BR-07):** `PATCH /api/staff/tickets/:id/priority` with `{ itPriority: "Critical" }` updates `itPriority` while keeping `impactPriority` unchanged.
- **TC-OP-06 (AC-12, BR-08):** Valid status transition `New ➔ Assigned` succeeds with HTTP 200.
- **TC-OP-07 (AC-12, BR-08):** Valid status transition `Assigned ➔ In_Progress` succeeds with HTTP 200.
- **TC-OP-08 (AC-12, BR-08):** Valid status transition `In_Progress ➔ Pending_Requester` succeeds with HTTP 200.
- **TC-OP-09 (AC-12, BR-08):** Valid status transition `In_Progress ➔ Resolved` succeeds with HTTP 200.
- **TC-OP-10 (AC-12, BR-08):** Valid status transition `Resolved ➔ Closed` succeeds with HTTP 200.
- **TC-OP-11 (AC-12, BR-08):** Valid status transition `Resolved ➔ In_Progress` (Reopen) succeeds with HTTP 200.
- **TC-OP-12 (AC-13, BR-08):** Invalid status transition `New ➔ Resolved` returns HTTP 400 with descriptive error message.
- **TC-OP-13 (AC-13, BR-08):** Invalid status transition `Closed ➔ In_Progress` returns HTTP 400 (Closed is terminal).
- **TC-OP-14 (AC-13, BR-08):** Invalid status transition `Closed ➔ Resolved` returns HTTP 400.
- **TC-OP-15 (AC-13, BR-08):** Invalid status transition `New ➔ Closed` returns HTTP 400.
- **TC-OP-16 (BR-11):** Requester calling `POST /api/tickets/:id/resolve-indication` sets `resolvedIndicated: true` and logs activity.

### 3.5 Test Suite 5: Public Comments & Confidential Internal Notes (`comments-notes.api.test.ts`)
- **TC-COMM-01 (AC-14):** Requester posts public comment on own ticket; receives HTTP 201; comment saved.
- **TC-COMM-02 (AC-14):** IT Staff posts public comment on ticket; receives HTTP 201.
- **TC-COMM-03 (AC-14):** Requester fetches ticket comments via `GET /api/tickets/:id/comments`; receives all public comments.
- **TC-COMM-04 (AC-15, BR-10):** IT Staff posts internal note via `POST /api/staff/tickets/:id/internal-notes`; receives HTTP 201.
- **TC-COMM-05 (AC-15, BR-10):** IT Staff fetches internal notes via `GET /api/staff/tickets/:id/internal-notes`; receives notes list.
- **TC-COMM-06 (AC-15, BR-10):** Requester calls `GET /api/staff/tickets/:id/internal-notes`; receives HTTP 403 Forbidden.
- **TC-COMM-07 (AC-15, BR-10):** Requester calls `POST /api/staff/tickets/:id/internal-notes`; receives HTTP 403 Forbidden.
- **TC-COMM-08 (BR-10):** Requester calling `GET /api/tickets/:id` receives ticket payload with zero internal notes fields or counts.
- **TC-COMM-09 (BR-09):** Calling `PUT /api/tickets/:id/comments/:commentId` returns HTTP 405 Method Not Allowed or 404 (append-only).

### 3.6 Test Suite 6: Administrator User Management (`users-admin.api.test.ts`)
- **TC-ADMIN-01 (AC-16):** `GET /api/admin/users` returns full list of users with roles, status, and created dates.
- **TC-ADMIN-02 (AC-16):** `GET /api/admin/users?role=IT_Staff` returns only IT Staff users.
- **TC-ADMIN-03 (AC-16):** `GET /api/admin/users?search=alice` filters users by name or email.
- **TC-ADMIN-04 (AC-17, BR-02):** `POST /api/admin/users` with valid details creates user, sets `mustChangePassword: true`, and returns HTTP 201.
- **TC-ADMIN-05 (BR-12):** `POST /api/admin/users` with duplicate email returns HTTP 409 Conflict.
- **TC-ADMIN-06:** `PATCH /api/admin/users/:id` updates user name and role.
- **TC-ADMIN-07 (AC-18, BR-13):** Admin calling `PATCH /api/admin/users/:id` to deactivate own account returns HTTP 400 `{ error: "You cannot deactivate your own account" }`.
- **TC-ADMIN-08 (AC-18, BR-14):** Admin calling `PATCH /api/admin/users/:id` to deactivate the last active admin returns HTTP 400 `{ error: "Cannot deactivate the only active Administrator" }`.
- **TC-ADMIN-09 (BR-15):** Calling `DELETE /api/admin/users/:id` returns HTTP 405 Method Not Allowed or 404 (hard delete forbidden).
- **TC-ADMIN-10 (BR-16):** `POST /api/admin/users/:id/reset-password` generates temporary password, hashes it, sets `mustChangePassword: true`, and returns HTTP 200.

---

## 4. Client Component Test Plan (`client/src/test/`)

### 4.1 Test Suite 1: Login & Authentication Guard (`Login.test.tsx`)
- **TC-CLI-LOGIN-01:** Renders email, password input, and Submit button in Zen Green theme.
- **TC-CLI-LOGIN-02:** Shows client-side validation error when email is empty or invalid format.
- **TC-CLI-LOGIN-03:** Shows client-side validation error when password is blank.
- **TC-CLI-LOGIN-04:** Displays server-returned error message banner upon 401 Unauthorized.
- **TC-CLI-LOGIN-05:** Redirects user with `mustChangePassword: true` to `/change-password` route.
- **TC-CLI-LOGIN-06:** Redirects Requester to `/tickets` and IT Staff/Admin to `/staff/queue` upon successful login.

### 4.2 Test Suite 2: Mandatory Password Change Screen (`ChangePassword.test.tsx`)
- **TC-CLI-PWD-01:** Displays notice explaining first-time password change requirement.
- **TC-CLI-PWD-02:** Validates password match between "New Password" and "Confirm Password".
- **TC-CLI-PWD-03:** Shows dynamic complexity checklist (8+ chars, uppercase, lowercase, digit/symbol) updating as user types.
- **TC-CLI-PWD-04:** Submits new password and navigates to appropriate landing page upon success.

### 4.3 Test Suite 3: IT Staff Shared Queue UI (`StaffTicketQueue.test.tsx`)
- **TC-CLI-QUEUE-01:** Renders ticket table with columns: ID, Title, Requester, Category, Status badge, Priority badge, Assignee badge, Created At.
- **TC-CLI-QUEUE-02:** Search input triggers debounced API fetch with query parameter.
- **TC-CLI-QUEUE-03:** Filter dropdowns for Status, Priority, Assignee, Category properly update request state.
- **TC-CLI-QUEUE-04:** Pagination buttons navigate pages and display "Page X of Y (Total Z tickets)".
- **TC-CLI-QUEUE-05:** Displays empty state illustration when filters return zero results.
- **TC-CLI-QUEUE-06:** In mobile viewport (375px), renders responsive card list instead of horizontal table.

### 4.4 Test Suite 4: IT Staff Ticket Detail & Operations UI (`StaffTicketDetail.test.tsx`)
- **TC-CLI-DETAIL-01:** Displays ticket metadata header, Requester information card, and operational action panel.
- **TC-CLI-DETAIL-02:** "Claim Ticket" button is visible when unassigned; clicking claims ticket for current staff.
- **TC-CLI-DETAIL-03:** Status dropdown only presents valid next states according to current status and transition matrix.
- **TC-CLI-DETAIL-04:** IT Priority dropdown allows selecting Critical, High, Medium, Low.
- **TC-CLI-DETAIL-05:** Tab switcher toggles between "Public Conversation" and "Internal Notes (Confidential)".
- **TC-CLI-DETAIL-06:** Internal Notes tab has prominent amber warning banner: "Staff Eyes Only".
- **TC-CLI-DETAIL-07:** Submitting comment adds comment to timeline without full page refresh.

### 4.5 Test Suite 5: Administrator User Management UI (`UserManagement.test.tsx`)
- **TC-CLI-ADMIN-01:** Renders user table with Name, Email, Role badge, Status badge, Created Date, Actions.
- **TC-CLI-ADMIN-02:** "Add User" button opens modal with form fields (Name, Email, Role, Temp Password).
- **TC-CLI-ADMIN-03:** "Edit User" modal allows changing name, role, and active status toggle.
- **TC-CLI-ADMIN-04:** Deactivate toggle is disabled or shows alert for current user (self-deactivation prevention).
- **TC-CLI-ADMIN-05:** "Reset Password" button triggers confirmation dialog and displays newly generated temporary password.

---

## 5. End-to-End (E2E) Test Plan (`e2e/`)

### 5.1 E2E Suite 1: Authentication & Mandatory Change Flow (`authentication.spec.ts`)
- **Journey 1: Clean First-Time Login:**
  1. Open `/login` on Desktop (1200px).
  2. Log in as new user with initial seed credentials (`Password123!`).
  3. Verify automatic redirection to `/change-password`.
  4. Attempt navigation to `/tickets` or `/staff/queue` ➔ intercepted back to `/change-password`.
  5. Enter mismatched passwords ➔ verify error banner.
  6. Enter new strong password (`TokTickSecure2026!`) and submit.
  7. Verify success toast and landing page navigation.
  8. Log out. Log in with old password ➔ verify 401 error. Log in with new password ➔ success.
- **Journey 2: Inactive User Block:**
  1. Attempt login with inactive user credentials (`inactive.user@toktick.local`).
  2. Verify error banner: "Account has been deactivated. Contact IT Administrator."

### 5.2 E2E Suite 2: IT Staff End-to-End Ticketing Lifecycle (`staff-ticket-flow.spec.ts`)
- **Journey 1: Ticket Creation to Resolution:**
  1. **Requester Action:** Log in as Requester (`sarah.requester@toktick.local`). Submit new ticket "VPN disconnecting every 10 minutes". Attach screenshot. Log out.
  2. **IT Staff Queue:** Log in as IT Staff (`charlie.staff@toktick.local`). View `/staff/queue`. Verify ticket appears with status `New`.
  3. **Claim & Status Update:** Open ticket detail. Click "Claim Ticket" (assignee becomes Charlie). Change status to `Assigned`, then `In_Progress`.
  4. **Priority Override:** Change IT Priority to `High` while leaving Requester Impact as `Medium`.
  5. **Internal Collaboration:** Post internal note: "Verified server logs; DHCP lease timeout issue on Gateway 4". Switch to Public Comments and reply: "We are investigating the VPN gateway logs".
  6. **Requester Verification:** Log in as Sarah. Open ticket detail. Verify public comment from Charlie is visible. Verify internal notes tab does NOT exist and no notes leaked.
  7. **Resolve & Close:** Charlie marks status as `Resolved` with resolution comment. Sarah clicks "Problem Appears Resolved". Charlie changes status to `Closed`.

### 5.3 E2E Suite 3: Administrator User Lifecycle & Safety Invariants (`user-administration.spec.ts`)
- **Journey 1: User Provisioning & Invariant Protection:**
  1. Log in as Admin (`admin@toktick.local`). Navigate to `/admin/users`.
  2. Click "Create User". Fill form: Name: "David Tech", Email: "david.tech@toktick.local", Role: `IT_Staff`. Submit.
  3. Verify user appears in table with `Active` and `Must Change Password` tags.
  4. Attempt creating user with same email ➔ verify 409 Conflict error message.
  5. Attempt to deactivate own admin account ➔ verify action is blocked with warning dialog.
  6. Reset password for "David Tech". Copy temporary password.
  7. In an incognito window / new session, log in as David with temp password. Verify forced password change prompt.

### 5.4 Responsive Multi-Viewport Matrix (Automated Screenshots)
Every E2E test will capture screenshots across 3 viewports:
- **Mobile:** 375 x 667 px (iPhone SE emulation)
- **Tablet:** 800 x 1024 px (iPad Mini emulation)
- **Desktop:** 1200 x 800 px (Standard Laptop)

Screenshots will be stored in `artifacts/lab-03/screenshots/` and embedded in the final lab report.

---

## 6. Edge Cases & Boundary Conditions

| Scenario | Condition / Edge Case | Expected System Behavior | Test Level |
|---|---|---|---|
| **Invalid Status Jump** | Trying to change `New` directly to `Closed` | API returns 400 Bad Request; UI dropdown disables invalid options | Server & Client |
| **Terminal State Edit** | Trying to modify status or assignee of `Closed` ticket | API returns 400 Bad Request; operational controls disabled | Server & Client |
| **Self Deactivation** | Admin attempts to deactivate their own account | API returns 400 Bad Request; toggle disabled in UI | Server & Client |
| **Last Admin Guard** | Deactivating the only remaining active Admin user | API returns 400 Bad Request with invariant protection message | Server API |
| **Duplicate Email** | Admin creates user with email already in database | API returns 409 Conflict; form highlights email field | Server & Client |
| **Empty Public Comment** | Submitting comment with whitespace only | Blocked on client; API returns 400 Bad Request | Server & Client |
| **Internal Note Snooping** | Requester calls `GET /api/staff/tickets/:id/internal-notes` | Returns 403 Forbidden; zero note data or count in response | Server API |
| **Concurrent Status Change**| Two staff members update ticket status simultaneously | Database transaction ensures last valid transition or concurrency error | Server API |
| **XSS in Comments/Notes** | Submitting `<script>alert(1)</script>` in comment | React escapes HTML by default; server sanitizes/stores as raw text | E2E & Client |
| **Large Attachment / Long Text** | Title > 200 chars or comment > 5000 chars | Validation error returned before database insertion | Server API |
| **Horizontal Overflow** | Render complex table or long string on 375px mobile | CSS `overflow-x: hidden`, word-break, and card layout guarantee no page blowout | E2E Playwright |

---

## 7. Verification & CI Run Commands

To verify all test suites across the repository, execute:

```powershell
# 1. Server Integration & API Tests
npm.cmd --prefix server test

# 2. Client Unit & Component Tests
npm.cmd --prefix client test

# 3. Full E2E Test Suite (All viewports)
npx.cmd playwright test

# 4. Type check and schema validation
npm.cmd --prefix server run build; npm.cmd --prefix client run build
```
