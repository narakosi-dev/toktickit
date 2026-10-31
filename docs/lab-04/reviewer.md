# Lab 4 — Peer Review Record

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — KMUTT (Semester 1/2026)  
**Author:** Nara Kosiyaporn — Student ID: 67070505218 — GitHub: [@narakosi-dev](https://github.com/narakosi-dev)  
**Peer Reviewers:**
- Sarin (67070505232) — GitHub: [@Sxr1n](https://github.com/Sxr1n)
- Tantiyawat Chansiri (67070505216) — GitHub: [@Leviathan-c137](https://github.com/Leviathan-c137)
- Natdanai (67070505206) — GitHub: [@Beethoven190](https://github.com/Beethoven190)

**Repository:** [https://github.com/narakosi-dev/toktickit](https://github.com/narakosi-dev/toktickit)  
**Target Branch:** `lab4-staging` → released to `main` via Final Release PR

---

## 1. Pull Requests Authored & Peer Review Summary

Every functional increment in Sprint 4 was authored on an isolated feature branch, tied directly to its corresponding GitHub Issue, and submitted as a GitHub Pull Request targeting `lab4-staging`. In strict accordance with team engineering invariants, **zero Pull Requests were self-merged**; each PR required automated CI verification (100% green across unit, integration, and E2E suites) followed by formal human peer review and approval before merging.

| PR # | Feature Branch | Target | Issue & Scope | Reviewer | Verdict | Merged At |
|:---:|:---|:---|:---|:---:|:---:|:---:|
| **#62** | `feature/lab4-specs` | `lab4-staging` | **Issue #49:** Engineering Specification, Architecture & Traceability Matrix | `@Sxr1n` | **Approved** | 2026-10-31 |
| **#65** | `feature/lab4-db-schema-migrations` | `lab4-staging` | **Issue #50:** Database Schema Migration, ActionTaken Model & Versioning | `@Sxr1n` | **Approved** | 2026-10-31 |
| **#66** | `feature/lab4-db-seeding` | `lab4-staging` | **Issue #51:** Canonical Database Seeding for 8 Workflow Statuses | `@Sxr1n` | **Approved** | 2026-10-31 |
| **#68** | `feature/lab4-actions-taken-api` | `lab4-staging` | **Issue #52:** Backend Actions Taken REST APIs with RBAC Isolation | `@Sxr1n` | **Approved** | 2026-10-31 |
| **#69** | `feature/lab4-ticket-workflow-api` | `lab4-staging` | **Issue #53:** Status Transition Matrix, Resolution Gate & Optimistic Concurrency Control | `@Sxr1n` | **Approved** (4 rounds) | 2026-10-31 |
| **#70** | `feature/lab4-actions-taken-ui` | `lab4-staging` | **Issue #54:** Frontend Actions Taken Timeline, Modal & Responsive Cards | `@Sxr1n` | **Approved** | 2026-10-31 |
| **#71** | `feature/lab4-ticket-workflow-ui` | `lab4-staging` | **Issue #55:** Frontend Status Transitions, Resolution Indication & Concurrency Dialog | `@Sxr1n` | **Approved** | 2026-10-31 |
| **#72** | `feature/lab4-staff-dashboard-api` | `lab4-staging` | **Issue #56:** Backend IT Staff & Admin Dashboard Metrics API | `@Sxr1n` | **Approved** | 2026-10-31 |
| **#73** | `feature/lab4-requester-dashboard-api` | `lab4-staging` | **Issue #57:** Backend Requester Dashboard API & Ownership Isolation | `@Sxr1n` | **Approved** | 2026-10-31 |
| **#74** | `feature/lab4-role-dashboards-ui` | `lab4-staging` | **Issue #58:** Frontend Role-Based Dashboards & Drill-down Navigation | `@Sxr1n` | **Approved** (3 rounds) | 2026-10-31 |
| **#75** | `feature/lab4-e2e-playwright-suite` | `lab4-staging` | **Issue #59:** Playwright End-to-End Multi-Viewport Suite & Responsive Captures | `@Sxr1n` | **Approved** (2 rounds) | 2026-11-01 |

---

## 2. In-Depth Peer Review Cases & Technical Evolutions

### Case 1: PR #69 — Concurrency Control & State Machine Hardening
**Issue #53:** `feature/lab4-ticket-workflow-api` → `lab4-staging`  
**Reviewer:** `@Sxr1n`

#### Peer Review Critique (Round 1 & 2):
1. **In-Memory OCC Race Vulnerability:**  
   The initial agent implementation performed `if (ticket.version !== expectedVersion)` in Node.js memory before calling `ticket.update({ where: { id } })`. Under concurrent requests, both could read the identical version, pass the check simultaneously, and overwrite each other's changes.
2. **Client Bypass of Transition Matrix & OCC:**  
   The frontend still invoked the legacy endpoint `PATCH /api/staff/tickets/:id/status`, which did not enforce the resolution prerequisite check (`AC-07`) or OCC versioning.
3. **Non-Transactional Audit Logging:**  
   `activityLog.create` was invoked outside the transaction with error catching, allowing ticket updates to succeed even if the immutable audit entry failed.
4. **FSM Conformance & Table-Driven Tests:**  
   Legacy status aliases were leaking into transitions, and tests only checked scattered happy paths rather than all possible transitions.

#### Engineering Response & Implementation:
- **Atomic Compare-and-Swap (CAS):** Refactored the update in `server/src/routes/workflow.routes.ts` to execute `tx.ticket.updateMany({ where: { id: ticketId, version: expectedVersion }, data: { status, version: { increment: 1 } } })` inside an atomic `prisma.$transaction`. When `count === 0`, it rolls back and returns HTTP 409 Conflict (`CONCURRENCY_CONFLICT`).
- **Route Consolidation:** Replaced the legacy handler in `staff.routes.ts` to delegate directly to `handleUpdateTicketStatus`, ensuring all status updates pass through the same invariant gates.
- **Transactional Audit Logging:** Wrapped `tx.activityLog.create` inside the identical transaction block.
- **64-Pair Table-Driven Test Matrix:** Added exhaustive table-driven test cases asserting valid vs. invalid transitions for every single combination of the 8 canonical statuses.
- **Empirical PostgreSQL Concurrency Test (`ticket-workflow.db.test.ts`):** Implemented live concurrent `Promise.all` requests against PostgreSQL to verify row-level lock and OCC rejection under simultaneous access.

---

### Case 2: PR #74 — Role-Based Dashboards & Drill-down Isolation
**Issue #58:** `feature/lab4-role-dashboards-ui` → `lab4-staging`  
**Reviewer:** `@Sxr1n`

#### Peer Review Critique:
1. **Unconnected Props in AppShell:**  
   `AppShell` retained filter state for queue and my-tickets, but failed to pass `initialStatus` and `initialAssignee` props down to `<StaffTicketQueue>` and `<MyTickets>`, causing metric cards to open unfiltered queues.
2. **Filter Value Drift:**  
   The Waiting card sent `Pending_Requester` (which had been migrated to `Waiting_for_Requester`), and the requester In Progress card sent `"In Progress"` (with a space) instead of `In_Progress`.
3. **Filter Collision on "Open":**  
   The grouped filter `"open"` was compared after `.toLowerCase()`, colliding with the distinct single status `"Open"`. Selecting "Open" in My Tickets returned all 5 open statuses rather than strictly `Open`.

#### Engineering Response & Implementation:
- **Filter Prop Wiring:** Connected `initialStatus` and `initialAssignee` props from `AppShell` into `<StaffTicketQueue>` and `<MyTickets>`, with `useEffect` listeners ensuring smooth resets when clicking top-level navigation links.
- **Filter Normalization:** Standardized all dashboard drill-down triggers to emit exact canonical values (`Waiting_for_Requester`, `In_Progress`, and `assignee: "mine", status: "active"`).
- **Group Filter Disambiguation (`OPEN_GROUP`):** Replaced `"open"` with the exported constant `OPEN_GROUP_STATUS = "OPEN_GROUP"`. Hardened `server/src/app.ts` to strictly compare `norm === "OPEN_GROUP"`, preserving `where.status = "Open"` for single-status filtering.
- **Integration Test Suite (`DashboardDrilldown.test.tsx`):** Added 8 integration tests rendering `AppShell`, simulating card clicks, and asserting outgoing API query parameters.

---

### Case 3: PR #75 — Playwright End-to-End Suite & Responsive Hardening
**Issue #59:** `feature/lab4-e2e-playwright-suite` → `lab4-staging`  
**Reviewer:** `@Sxr1n`

#### Peer Review Critique:
1. **Non-Deterministic Ticket Targeting in `E2E-ACT-02`:**  
   `E2E-ACT-02` clicked `page.locator("tbody tr").first()`, creating a brittle dependency on table sort order and prior test execution without verifying that the opened ticket had Actions Taken.
2. **Missing Action Existence Assertion:**  
   The test asserted read-only badges without asserting that an Action record actually existed in `actions-taken-timeline`.
3. **Visual Viewport Visibility:**  
   The Actions Taken timeline was below the initial viewport fold in desktop and mobile captures, requiring manual scrolling to verify visual rendering.
4. **Mobile Horizontal Overflow Bug on Staff Dashboard:**  
   Under 375px mobile viewport, `StaffDashboard.tsx` overflowed horizontally by 68px (443px > 375px) due to un-wrapped header titles and ticket card fixed dimensions.

#### Engineering Response & Implementation:
- **Deterministic Serial Testing:** Added `test.describe.serial` and passed `sharedTicketNumber` from `E2E-ACT-01` into `E2E-ACT-02`. Used `[data-testid='search-tickets-input']` to locate the exact ticket.
- **Timeline Existence Assertion:** Added explicit assertions confirming both recorded Actions Taken (`"Replaced thermal paste..."` and `"Updated motherboard UEFI..."`) are present on `actions-taken-timeline` before asserting read-only locks.
- **Scroll Section Into View:** Added `await actionsSection.scrollIntoViewIfNeeded()` before capturing screenshots across Desktop (1280px), Tablet (768px), and Mobile (375px).
- **Mobile Responsive Layout Fix:** Refactored `StaffDashboard.tsx` with `d-flex flex-wrap` and `minWidth: 0, flexGrow: 1` on ticket rows, achieving 0px horizontal overflow across all viewports.
- **All 17 E2E Tests Green:** CI Run #41238543890 completed with 100% green status across all 3 jobs.

---

## 3. Reviewer Verification Sign-Off

All Sprint 4 issues and deliverables have undergone thorough peer code review, iterative refinement, automated test validation, and formal approval.

- **Primary Peer Reviewer:** Sarin ([@Sxr1n](https://github.com/Sxr1n)) — Verdict: **APPROVED**
- **Repository Milestone:** Sprint 4 (Lab 4) — 100% Complete
- **Final Target Branch:** `lab4-staging`
