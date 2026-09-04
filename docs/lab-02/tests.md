# Lab 2 Test Plan and Results

## 1. Test Strategy
Testing follows a strict **Test-Driven Development (TDD)** and **Test-Driven Design (Test DD)** protocol:
- **Unit & API Integration Tests (Vitest + Supertest):** Validate database operations, route controllers, validation rules, ticket number generation, pagination, and ownership barriers.
- **Frontend Component Tests (Vitest + React Testing Library):** Validate component rendering, state transitions (idle, loading, success, error), field validation messages, user interaction, and error resilience.
- **End-to-End Tests (Playwright):** Validate complete user journeys from selecting a requester, submitting a ticket, tracking it in My Tickets, viewing details, and verifying cross-requester isolation.

---

## 2. Planned Test Table

| Test ID | Level | Target Feature | Description & Input | Expected Result | Automated Test File | Pass / Fail |
|:---|:---|:---|:---|:---|:---|:---|
| **REQ-01** | API | Dev Requester | `GET /api/requesters` | 200 OK; returns only active requesters (excludes inactive) | `server/tests/lab-02/requesters.test.ts` | Pass |
| **SYS-01** | API | Related Systems | `GET /api/related-systems` | 200 OK; returns at least 6 seeded related systems | `server/tests/lab-02/related-systems.test.ts` | Pass |
| **TKT-01** | API | Ticket Creation | `POST /api/tickets` with valid payload | 201 Created; returns ticket with generated `TKT-` number and status `New` | `server/tests/lab-02/create-ticket.test.ts` | Pass |
| **TKT-02** | API | Ticket Validation | `POST /api/tickets` with summary < 5 chars | 400 Bad Request; validation error returned | `server/tests/lab-02/create-ticket.test.ts` | Pass |
| **TKT-03** | API | Ticket Validation | `POST /api/tickets` with invalid categoryId | 404/400 Bad Request; invalid foreign key rejected | `server/tests/lab-02/create-ticket.test.ts` | Pass |
| **TKT-04** | API | My Tickets List | `GET /api/tickets?requesterId=1` | 200 OK; returns array of tickets owned strictly by Requester 1 | `server/tests/lab-02/my-tickets.test.ts` | Pass |
| **TKT-05** | API | Ownership Isolation | `GET /api/tickets?requesterId=2` | 200 OK; does NOT include tickets belonging to Requester 1 | `server/tests/lab-02/my-tickets.test.ts` | Pass |
| **TKT-06** | API | Search & Filter | `GET /api/tickets?requesterId=1&search=Laptop` | 200 OK; returns only tickets matching query | `server/tests/lab-02/my-tickets.test.ts` | Pass |
| **TKT-07** | API | Pagination | `GET /api/tickets?requesterId=1&page=1&limit=2` | 200 OK; returns 2 items + correct pagination metadata | `server/tests/lab-02/my-tickets.test.ts` | Pass |
| **TKT-08** | API | Ticket Detail (Owner) | `GET /api/tickets/1?requesterId=1` | 200 OK; returns full ticket details and attachments | `server/tests/lab-02/ticket-detail.test.ts` | Pass |
| **TKT-09** | API | Detail Unauthorized | `GET /api/tickets/1?requesterId=2` | 404/403; access to another requester's ticket is rejected | `server/tests/lab-02/ticket-detail.test.ts` | Pass |
| **ATT-01** | API | Upload Valid File | `POST /api/tickets/1/attachments` (valid PDF <= 5MB) | 201 Created; returns attachment record with `active: true` | `server/tests/lab-02/attachments.test.ts` | Pass |
| **ATT-02** | API | Reject Invalid Type | `POST /api/tickets/1/attachments` (file `.exe`) | 400 Bad Request; unsupported type rejected | `server/tests/lab-02/attachments.test.ts` | Pass |
| **ATT-03** | API | Reject Oversized File | `POST /api/tickets/1/attachments` (file > 5MB) | 400 Bad Request; file size limit error | `server/tests/lab-02/attachments.test.ts` | Pass |
| **ATT-04** | API | Max 5 Attachments | Upload 6th attachment to ticket with 5 active | 400 Bad Request; maximum limit error | `server/tests/lab-02/attachments.test.ts` | Pass |
| **ATT-05** | API | Soft-Remove File | `PATCH /api/attachments/1/remove` with valid reason | 200 OK; marked `active: false` with reason and timestamp | `server/tests/lab-02/attachments.test.ts` | Pass |
| **ATT-06** | API | Block Removed Download | `GET /api/attachments/1/download` on soft-removed file | 410 Gone; download blocked | `server/tests/lab-02/attachments.test.ts` | Pass |
| **UI-01** | UI | Requester Select | Render selector dropdown | Displays active requesters; clicking continue sets requester context | `client/tests/lab-02/RequesterSelect.test.tsx` | Pass |
| **UI-02** | UI | Header Display | AppShell with active requester | Shows requester name & "Change Requester" button | `client/tests/lab-02/AppShell.test.tsx` | Pass |
| **UI-03** | UI | Create Ticket Validation | Submit empty form | Displays field error messages; API not called | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-04** | UI | Create Ticket Success | Fill valid fields & submit | Shows busy state during submit, then success message with Ticket No | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-05** | UI | API Failure Resilience | Backend returns 500 on submit | Error banner shown; entered summary & description preserved | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-06** | UI | My Tickets Table | Render tickets list | Displays ticket number, summary, badges, and empty/no-results states | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-07** | UI | Detail & Soft Removal | Open ticket detail, trigger remove | Prompts for removal reason modal; updates item to "Removed" | `client/tests/lab-02/TicketDetail.test.tsx` | Pass |
| **E2E-01**| E2E | Full Requester Flow | Select user → create ticket → verify in list → check details → switch user isolation | End-to-end user journey passes completely | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Covered By Tests | Description |
|:---|:---|:---|
| **AC-01** (Requester List Filtering) | `REQ-01` | Inactive requesters excluded from list |
| **AC-02** (Requester Context Selection) | `UI-01`, `E2E-01` | Mandatory selection screen on first visit |
| **AC-03** (Header Identity Display) | `UI-02`, `E2E-01` | Selected user name displayed in shell with switcher |
| **AC-04** (Valid Ticket Creation) | `TKT-01`, `UI-04`, `E2E-01` | Successful ticket creation with generated number |
| **AC-05** (Client-Side Validation) | `UI-03`, `TKT-02` | Field-level error messages before submission |
| **AC-06** (Failure Resilience) | `UI-05` | Form values retained after submission error |
| **AC-07** (Ticket Ownership Isolation) | `TKT-04`, `TKT-05`, `E2E-01` | Requester A cannot see Requester B's tickets |
| **AC-08** (Direct Access Protection) | `TKT-09` | Direct detail access for unowned ticket rejected (404/403) |
| **AC-09** (Ticket Search & Filter) | `TKT-06`, `UI-06` | Filtering and searching within own tickets |
| **AC-10** (Empty & No-Results States) | `UI-06` | Friendly empty and clearable no-results states |
| **AC-11** (Attachment Validation) | `ATT-02`, `ATT-03` | Rejection of unsupported types and files > 5MB |
| **AC-12** (Active Attachment Limit) | `ATT-04` | Max 5 active attachments per ticket enforced |
| **AC-13** (Soft-Removal Execution) | `ATT-05`, `UI-07`, `E2E-01` | Soft removal marks file inactive and stores reason |
| **AC-14** (Blocked Download) | `ATT-06` | Download blocked (HTTP 410) for soft-removed file |
| **AC-15** (Responsive Usability) | `E2E-01` | Clean presentation on Desktop, Tablet, and Mobile |

---

## 4. Test Commands
```bash
# Run all server tests
cd server
npm test

# Run all client tests
cd client
npm test

# Run End-to-End tests
npx playwright test e2e/lab-02/
```
