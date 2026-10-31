# Lab 4 Test Plan & Traceability Matrix

**Project:** TokTickIT — IT Service Desk Application  
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — KMUTT (Semester 1/2026)  
**Author:** Nara Kosiyaporn (Student ID: 67070505218)  
**Status:** Approved Test Engineering Contract  

---

## 1. Test Strategy & Traceability Architecture

The testing strategy follows Test-Driven Development (TDD) across all architectural tiers:
1. **API Integration Tests (Vitest):** Run against PostgreSQL test instance, validating REST contracts, RBAC guards, business rule validation, status transitions, concurrency conflict detection, and database aggregations.
2. **UI Component Tests (Vitest + React Testing Library):** Validate component rendering, user event handling, conditional form validation, drill-down routing, loading, empty, and error feedback.
3. **End-to-End Tests (Playwright):** Validate complete user journeys across multi-viewport viewports (Desktop 1280px, Tablet 768px, Mobile 375px), automated screenshot capture, and cross-role interaction.
4. **Regression Verification:** Full regression suite covering Labs 1, 2, and 3 to guarantee zero backward breakage.

---

## 2. Comprehensive Traceability Matrix (AC $\rightarrow$ Automated Test)

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **API-ACT-01** | API | AC-01 / FR-01 | Create valid Action Taken with authenticated IT Staff | 201 Created; record saved with correct `ticketId`, `actionDateTime`, and `performedById` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-ACT-02** | API | AC-02 / BR-03 | Reject Action Taken when `followUpRequired=true` but `followUpNote` is empty | 400 Bad Request; validation error message indicating follow-up note is required | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-ACT-03** | API | AC-03 / BR-02 | Different IT Staff member records action on ticket owned by another technician | 201 Created; `performedById` reflects acting staff; ticket owner remains unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-ACT-04** | API | AC-04 / BR-04 | Requester retrieves Actions Taken on their own ticket | 200 OK; chronological array of Actions Taken returned | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-ACT-05** | API | AC-04 / BR-04 | Requester attempts to `POST` or `PATCH` an Action Taken | 403 Forbidden; write operation rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-ACT-06** | API | AC-05 / BR-04 | Requester attempts to view Actions Taken on ticket owned by another requester | 404 Not Found; zero information leakage | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-ACT-07** | API | FR-03 / BR-01 | Update existing Action Taken details (result, follow-up note) by IT Staff | 200 OK; updated fields persisted | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-WKF-01** | API | AC-06 / BR-06 | Permitted status transition from `New` to `Open` by IT Staff | 200 OK; ticket status updated; version incremented | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-WKF-02** | API | AC-06 / BR-06 | Full lifecycle transitions: `Open` $\rightarrow$ `In_Progress` $\rightarrow$ `Waiting_for_Requester` $\rightarrow$ `Resolved` $\rightarrow$ `Closed` | 200 OK for each permitted step; terminal state reached | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-WKF-03** | API | AC-07 / BR-06 | Illegal status jump from `New` directly to `Resolved` | 400 Bad Request; rejected with transition matrix violation details | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-WKF-04** | API | AC-07 / BR-09 | Attempt to transition a ticket already in terminal `Closed` status | 400 Bad Request; terminal status cannot be modified | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-WKF-05** | API | AC-08 / BR-08 | Optimistic concurrency conflict: two updates submitted with same stale `version` | First succeeds (200 OK); second rejected with 409 Conflict | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-WKF-06** | API | AC-09 / BR-07 | Requester calls `/resolve-indication` on their own ticket | 200 OK; `resolvedIndicated = true`; `status` remains unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-DSH-01** | API | AC-10 / BR-11 | IT Staff requests operational dashboard metrics | 200 OK; unassigned, assigned, status counts, and priority breakdown returned matching DB | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-DSH-02** | API | AC-10 / BR-11 | Urgent tickets list in staff dashboard returns top 5 critical tickets | 200 OK; tickets sorted by priority and creation date | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-DSH-03** | API | BR-11 / AC-10 | Requester attempts to access Staff Dashboard API (`/api/dashboard/staff`) | 403 Forbidden; access denied | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-DSH-04** | API | AC-11 / BR-10 | Requester requests personal dashboard metrics | 200 OK; counts strictly reflect tickets owned by authenticated requester | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-DSH-05** | API | AC-11 / BR-10 | Requester with zero tickets receives zero metrics cleanly | 200 OK; all metrics return 0, empty recent tickets list | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **UI-ACT-01** | UI | FR-01 / AC-01 | Render Actions Taken list in Ticket Detail for IT Staff | Actions rendered with date, performed by, description, result, follow-up badge | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-ACT-02** | UI | AC-02 / BR-03 | Submitting Action Taken form with Follow-Up ON and empty note triggers validation | Form displays inline error: "Follow-up note is required when follow-up is needed" | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-ACT-03** | UI | AC-04 / FR-04 | Render Actions Taken in Ticket Detail for Requester | Actions rendered in read-only mode; Add/Edit buttons omitted from DOM | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-ACT-04** | UI | FR-02 / AC-01 | Create Action Taken successfully with default logged-in technician | Dispatches POST with performedById and re-fetches timeline | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-ACT-05** | UI | FR-03 / AC-03 | Edit existing Action Taken | Opens modal, pre-fills fields, sends only modified fields via PATCH | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-ACT-06** | UI | BR-01 / BR-02 | Field length validation on description and result | Requires minimum 5 characters; blocks submission if invalid | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-ACT-07** | UI | AC-01 / NFR-02 | Graceful network error handling | Displays alert banner when API request fails | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-WKF-01** | UI | AC-06 / BR-06 | Ticket status controls display only valid transitions matching current status | Dropdown/buttons contain strictly permitted target statuses | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-WKF-02** | UI | AC-08 / BR-08 | Receiving 409 Conflict triggers concurrency alert dialog with Refresh button | Modal alert appears prompting user to refresh ticket state | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-WKF-03** | UI | AC-09 / BR-07 | Display advisory banner when ticket has `resolvedIndicated = true` | Informational banner visible indicating requester signaled resolution | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-DSH-01** | UI | AC-10 / AC-12 | IT Staff Dashboard renders 5 metric cards, urgent tickets list, and quick actions | All cards render numbers; clicking card triggers navigation with filter parameters | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-DSH-02** | UI | AC-11 / AC-12 | Requester Dashboard renders personal metric cards and recent tickets | Open, waiting, resolved counts displayed; recent tickets have clickable links | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **E2E-ACT-01** | E2E | AC-01 / AC-03 | Technician logs in, opens ticket, adds Action Taken with follow-up, second staff adds another | Both Actions Taken persist and display on timeline | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-ACT-02** | E2E | AC-04 / AC-13 | Requester logs in, views own ticket, verifies Actions Taken are visible and read-only | Timeline visible; no edit or create controls present; verified on Desktop/Mobile | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-WKF-01** | E2E | AC-06 / AC-09 | Requester flags issue resolved, IT Staff reviews Actions Taken and transitions to Resolved | Lifecycle flow completes; status verified across user sessions | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **E2E-DSH-01** | E2E | AC-10 / AC-12 | Staff Dashboard loads, cards clicked, navigation to filtered queue verified | Filtered queue view renders matching tickets; responsive on Desktop, Tablet, Mobile | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **E2E-DSH-02** | E2E | AC-11 / AC-12 | Requester Dashboard loads, cards clicked, navigation to My Tickets verified | Personal tickets displayed; responsive on Desktop, Tablet, Mobile | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **REG-ALL-01** | REG | AC-15 | Full regression execution of Labs 1, 2, and 3 test suites | 100% tests pass (152 server tests, 68 client tests, Lab 1-3 E2E tests) | `tests/lab-01/*`, `tests/lab-02/*`, `tests/lab-03/*` | Planned |

---

## 3. Test Execution Commands

```bash
# 1. Run all server unit & integration tests
npm --prefix server test

# 2. Run all client component unit tests
npm --prefix client test

# 3. Run Playwright E2E multi-viewport tests
npx playwright test e2e/lab-04/
```
