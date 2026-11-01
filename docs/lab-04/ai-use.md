# Lab 4 — AI Use and Reflection

**Course:** CPE 334 Software Engineering — KMUTT  
**Student:** Nara Kosiyaporn (Student ID: 67070505218) — GitHub: [@narakosi-dev](https://github.com/narakosi-dev)  
**LLM / AI Agent System:** Google Antigravity IDE (Gemini 2.5 Pro Agentic Pair-Programming System)

---

## 1. Selected Key Prompts (10 Prompts)

| # | Prompt (Summarized) | What I Did with the Result |
|---|---------------------|----------------------------|
| **1** | *"Establish Sprint 4 engineering contract, data model extensions (ActionTaken, Ticket.version), 8-status Finite State Machine, and test traceability matrix."* | Authored `specification.md` (FR-01–FR-15, BR-01–BR-06, AC-01–AC-10), `api-spec.md`, `ui-spec.md`, and `tests.md` in `docs/lab-04/` establishing baseline contracts for Issue #49 (PR #62). |
| **2** | *"Evolve PostgreSQL schema via Prisma to introduce the ActionTaken model, Ticket.version monotonic counter, indexes, and generate clean migration."* | Implemented Prisma schema migration `20261029090000_lab4_actions_taken_and_versioning` and verified schema drift safety for Issue #50 (PR #65). |
| **3** | *"Implement comprehensive, idempotent database seed script populating canonical tickets across all 8 workflow statuses with realistic technical actions taken and audit logs."* | Updated `server/prisma/seed.ts` with 15 canonical tickets, linked ActionTaken lines, follow-up flags, and activity log entries for Issue #51 (PR #66). |
| **4** | *"Implement Actions Taken REST APIs (`GET`, `POST`, `PATCH /api/tickets/:id/actions-taken`) with RBAC isolation, strict payload validation, and activity logging."* | Developed `server/src/routes/actions.routes.ts`, verified requester data isolation (HTTP 404 on cross-ticket access), and wrote 22 automated tests for Issue #52 (PR #68). |
| **5** | *"Implement ticket status workflow transition handler (`PATCH /api/tickets/:id/status`), Status Transition Matrix rules, resolution prerequisite gate (AC-07), and Optimistic Concurrency Control (AC-06)."* | Created `server/src/routes/workflow.routes.ts` and automated test suite for Issue #53 (PR #69). |
| **6** | *"Address peer review feedback on PR #69 from @Sxr1n: transform OCC from in-memory comparison to atomic `updateMany` inside `prisma.$transaction`, require mandatory `version`, close legacy route bypass, unify canonical statuses, and make activity logging transactional."* | Refactored `workflow.routes.ts`, updated `staff.routes.ts` and `app.ts` to increment `version` across all mutating endpoints, moved client to `/api/tickets/:id/status`, and added race-condition concurrency tests. |
| **7** | *"Implement role-specific dashboard metrics APIs and Zen Green UI widgets for IT Staff, Administrators, and Requesters."* | Created `dashboard.routes.ts` and responsive summary card components displaying unassigned queues, urgent tickets, status distributions, and active follow-up actions (PR #72, PR #73, PR #74). |
| **8** | *"Address peer review feedback on PR #74 from @Sxr1n: disambiguate 'open' grouped filter collision with OPEN_GROUP, wire drill-down filter props in AppShell, and implement comprehensive AppShell drill-down integration tests."* | Defined `OPEN_GROUP_STATUS = "OPEN_GROUP"`, updated server/client routing, and authored `DashboardDrilldown.test.tsx` (PR #74). |
| **9** | *"Build Playwright E2E multi-viewport test suite verifying complete end-to-end ticket lifecycle (actions-taken-flow, ticket-resolution, dashboards) across Desktop (1280px), Tablet (768px), and Mobile (375px) with zero horizontal overflow."* | Authored `e2e/lab-04/actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, and `dashboards.spec.ts`. Captured 15 responsive screenshots into `artifacts/lab-04/screenshots/` (PR #75). |
| **10** | *"Address peer review feedback on PR #75 from @Sxr1n: convert E2E suite to describe.serial, pass shared ticket number, assert action existence before read-only check, scroll actions section into view, and fix mobile horizontal overflow on StaffDashboard."* | Refactored `actions-taken-flow.spec.ts` with deterministic serial execution, added timeline existence assertions, and fixed CSS flexbox layout in `StaffDashboard.tsx` (PR #75). |

---

## 2. My Reflection

### 2.1 Specification-Agent Collaboration
During Sprint 4, using AI as a specification partner prior to code generation was instrumental in crystallizing non-trivial enterprise invariants. The primary architectural challenge was formalizing the **Resolution Invariant Gate (AC-07)** and **Optimistic Concurrency Control (AC-06)**:
- Establishing the exact **Status Transition Matrix (FSM)** with terminal states (`Closed`, `Cancelled`) prevented invalid workflow states (e.g., jumping from `New` directly to `Resolved`).
- Specifying the prerequisite that transitioning to `Resolved` strictly demands at least one documented `ActionTaken` record eliminated the possibility of premature ticket closure without verifiable technical service.
- Designing the OCC protocol with an explicit `version` counter upfront allowed seamless detection of concurrent technician collisions in high-volume IT support environments.

### 2.2 Coding-Agent Use & Human/Peer Review Oversight
Pair programming with the agent dramatically accelerated the implementation of complex transactional operations and comprehensive unit test coverage. However, the peer review conducted by `@Sxr1n` on PR #69 provided an invaluable masterclass on subtle concurrency pitfalls in distributed web applications:

1. **Eliminating In-Memory Concurrency Check Vulnerability:**
   - *Observation:* The agent's initial implementation read the ticket from the database, compared `expectedVersion` with `ticket.version` in Node.js memory, and then executed an unconditional `ticket.update({ where: { id } })`.
   - *Pitfall:* Under high concurrency, two requests submitting the exact same version could both pass the in-memory `if` check before either update committed, leading to a silent lost update race condition.
   - *Correction:* Following `@Sxr1n`'s review, I refactored the status transition to execute an atomic compare-and-swap (CAS) via `tx.ticket.updateMany({ where: { id: ticketId, version: expectedVersion }, data: { status, version: { increment: 1 } } })` inside an atomic `prisma.$transaction`. If `updateResult.count === 0`, the transaction safely rolls back and immediately responds with HTTP 409 Conflict (`CONCURRENCY_CONFLICT`).

2. **Closing the Client Route Bypass:**
   - *Observation:* The frontend UI was still calling the legacy endpoint `PATCH /api/staff/tickets/:id/status`, which bypassed the resolution prerequisite check and OCC.
   - *Correction:* I unified the client API (`client/src/api.ts`) to target `PATCH /api/tickets/:id/status` with `ticket.version`, while also hardening the legacy endpoint in `staff.routes.ts` to enforce the resolution invariant gate and OCC.

3. **Atomic Audit Logging:**
   - *Observation:* `activityLog` was previously created outside the database transaction with errors suppressed by `console.warn`, allowing status updates to succeed even if audit trail creation failed.
   - *Correction:* I moved `tx.activityLog.create` inside the exact same `prisma.$transaction`, guaranteeing that status transitions and their immutable audit records commit atomically or not at all.

4. **Realistic Concurrency Race Testing:**
   - *Observation:* Initial test suites mocked `ticket.update` without inspecting `where.version`, making it impossible to verify concurrency collisions in automated unit testing.
   - *Correction:* I updated the mock to simulate true atomic query execution and added a `Promise.all` race-condition test demonstrating that when two technicians attempt concurrent updates with identical versions, exactly one succeeds (HTTP 200) and one receives HTTP 409 Conflict (`CONCURRENCY_CONFLICT`).

### 2.3 Round-2 Peer Review: Mathematical FSM Conformance & Production Hardening
In Round 2 of the peer review on PR #69, `@Sxr1n` delivered another round of incisive architectural critiques that refined the implementation to complete industrial standard:

1. **Cell-by-Cell BR-06 Matrix Conformance & Exhaustive Table-Driven Testing:**
   - *Observation:* The workflow matrix still retained legacy aliases (`Assigned`, `Pending_Requester`) and permitted transitions outside BR-06 (e.g. `New ➔ In_Progress`, `Resolved ➔ In_Progress`, `In_Progress ➔ Cancelled`).
   - *Correction:* Aligned `VALID_STATUS_TRANSITIONS` to match BR-06 cell by cell across the 8 canonical statuses. Mapped legacy aliases (`pending_requester` $\rightarrow$ `Waiting_for_Requester`, `assigned` $\rightarrow$ `Open`) on input in `normalizeStatus` and added a database migration script. Added an exhaustive 64-pair table-driven test suite in `ticket-workflow.api.test.ts` verifying every possible state pair.

2. **Complete Route Delegation & Removal of Mock Fallback Branches:**
   - *Observation:* Having a separate `handleStatus` implementation in `staff.routes.ts` maintained a maintenance burden and potential bypass, while branches like `else executeTx(prisma)` and `hasActionsSupport && actionsCount === 0` created the risk of failing open.
   - *Correction:* Fully removed the duplicate `handleStatus` and delegated `staffRouter.patch("/tickets/:id/status")` directly to `handleUpdateTicketStatus`. Cleaned production code by strictly requiring `prisma.$transaction` and relying directly on `ticket._count.actionsTaken`.

3. **Empirical PostgreSQL Concurrency Integration Test:**
   - *Observation:* Mock-based single-threaded tests cannot definitively prove PostgreSQL row-level behavior or concurrency serialization.
   - *Correction:* Added `ticket-workflow.db.test.ts` that executes concurrent requests via `Promise.all` against live PostgreSQL, asserting that the database-level atomic CAS succeeds for exactly 1 request and returns HTTP 409 Conflict for the second.

### 2.4 Dashboard Filter Disambiguation & Responsive Reflow (PR #74)
In PR #74, `@Sxr1n` identified a critical data query collision:
- When a user clicked "My Open Tickets" on the Requester Dashboard, the client emitted `status: "open"`. Because `app.ts` performed a case-insensitive check after `.toLowerCase()`, selecting the specific status `"Open"` collided with the grouped filter `"open"`, returning all active open statuses (`New`, `Open`, `In_Progress`, `Waiting_for_Requester`, `Reopened`) instead of strictly tickets with status `"Open"`.
- We resolved this by introducing the explicit `OPEN_GROUP_STATUS = "OPEN_GROUP"` constant across backend and frontend, preserving strict equality checks on individual statuses.
- Furthermore, connecting `initialStatus` and `initialAssignee` props from `AppShell` into `<StaffTicketQueue>` and `<MyTickets>` ensured that clicking any dashboard metric card immediately navigated to the correctly filtered queue view.

### 2.5 E2E Test Determinism & Viewport Hardening (PR #75)
In PR #75, peer review feedback prompted improvements in test reliability and mobile responsiveness:
- **Test Determinism:** Transitioning from `tbody tr.first()` to `test.describe.serial` and passing `sharedTicketNumber` eliminated fragile dependencies on prior test execution and database ordering.
- **Verification of Action Presence:** Explicitly asserting that actions exist on the timeline before asserting read-only constraints guaranteed that the test truly validated the rendered actions and not just an empty container.
- **Responsive Overflow Fix:** On a 375px mobile viewport, `StaffDashboard.tsx` had an initial overflow of 68px. Applying `flex-wrap` and `minWidth: 0, flexGrow: 1` eliminated all horizontal overflow, fulfilling the strict zero-overflow requirement across all viewports.

### 2.6 Conclusion
The evolutionary journey across Sprint 4 demonstrates the synergy between autonomous AI pair-programming and rigorous peer code review. While AI generated initial implementations with remarkable speed, human scrutiny caught subtle concurrency races, data collisions, and test dependencies. The resulting TokTickIT codebase is resilient, fully documented, and backed by a 100% green regression test suite.
