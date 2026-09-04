# CPE334 Software Engineering — Lab 2 Report Submission
**Course:** CPE334 Introduction to Software Engineering in the Age of AI Agents  
**Semester:** 1/2026  
**Student Name:** Nara Kosiyaporn  
**Student ID:** 67070505218  
**Student GitHub:** [@narakosi-dev](https://github.com/narakosi-dev)  
**Repository:** [https://github.com/narakosi-dev/toktickit](https://github.com/narakosi-dev/toktickit)  
**Release PR:** [https://github.com/narakosi-dev/toktickit/pull/22](https://github.com/narakosi-dev/toktickit/pull/22)  
**Peer Reviewers:** Pongrit (Frame) — [@FramePongrit](https://github.com/FramePongrit), [@Leviathan-c137](https://github.com/Leviathan-c137)

---

## Answer Part 1: Git Use with Engineering Workflow (10 Points)

### 1.1 Git Commit History & Branching Workflow
The project strictly implements the staged engineering git workflow:  
`feature/*` branches → Pull Requests with Peer Reviews → `lab2-staging` → Release Pull Request (#22) → `main`.

```text
*   b793168 Merge pull request #22 from narakosi-dev/lab2-staging
|\  
| *   187d516 Merge pull request #21 from narakosi-dev/feature/lab2-e2e-and-docs
| |\  
| | * 443c9fd docs(lab2): adjust reviewer list to FramePongrit and Leviathan-c137
| | * 6ea9b92 docs(lab2): update reviewer.md with peer review team members
| | * f30ab16 feat(lab2): implement playwright e2e tests, multi-viewport validation, and documentation (Issue 6)
| |/  
| *   1f763af Merge pull request #19 from narakosi-dev/feature/lab2-ticket-detail-and-attachments
| |\  
| | * 2cb1352 feat(lab2): implement ticket detail & attachments lifecycle with soft-removal (Issue 5)
| |/  
| *   7f846d7 Merge pull request #17 from narakosi-dev/feature/lab2-my-tickets
| |\  
| | * 606217e feat: implement my tickets view, ownership isolation, filtering, and tests
| |/  
| *   722ff04 Merge pull request #14 from narakosi-dev/feature/lab2-ticket-creation
| |\  
| | * 2a5246c feat: implement ticket creation flow, validation, and automated tests
| * | 08b6279 Merge pull request #12 from narakosi-dev/feature/lab2-requester-context
| |\| 
| | * 72a7627 feat: implement development requester context, database foundation, and tests
| |/  
| * 0bb81ab Merge pull request #10 from narakosi-dev/docs/lab2-specification
|/| 
| * 018ac03 docs(lab-02): complete specification, ui-spec, api-spec, and test plan
|/  
*   07039ff Merge pull request #9 from narakosi-dev/lab1-staging
```

### 1.2 GitHub Projects (Kanban Board) Evidence
All 6 Sprint 2 Issues were decomposed, tracked, and progressed through `Backlog` → `Specified` → `Started` → `PR Review` → `Done`:
- **Issue 1:** Spec-Driven Development & Test Plan (`docs/lab-02/`) — **Done**
- **Issue 2:** Development Requester Context & Seed Foundation — **Done**
- **Issue 3:** Ticket Creation Flow & Unique Number Generation — **Done**
- **Issue 4:** My Tickets View, Search, Filtering & Ownership Isolation — **Done**
- **Issue 5:** Ticket Detail View & Attachments Soft-Removal — **Done**
- **Issue 6:** End-to-End User Journeys, Multi-Viewport Validation & Documentation — **Done**

### 1.3 Rendered Peer Review Record (`docs/lab-02/reviewer.md`)
- **Author:** Nara Kosiyaporn — Student ID: 67070505218 ([@narakosi-dev](https://github.com/narakosi-dev))
- **Peer Reviewers:** Pongrit ([@FramePongrit](https://github.com/FramePongrit)), [@Leviathan-c137](https://github.com/Leviathan-c137)

#### PRs Authored by Me & Reviewed by Peers:
| PR # | Branch | Target Branch | Features & Scope | Reviewers | Verdict |
|:---:|:---|:---|:---|:---|:---:|
| **#10** | `feature/lab2-spec-docs` | `lab2-staging` | **Issue 1:** Spec-Driven Development (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`) | `@FramePongrit` | **Approved** |
| **#12** | `feature/lab2-requester-context` | `lab2-staging` | **Issue 2:** Development Requester Context, Prisma Seed, `RequesterSelect.tsx`, AppShell Identity | `@Leviathan-c137` | **Approved** |
| **#14** | `feature/lab2-ticket-creation` | `lab2-staging` | **Issue 3:** `POST /api/tickets`, `TKT-YYYY-NNNNNN`, Form validation, `CreateTicket.tsx` | `@FramePongrit` | **Approved** |
| **#17** | `feature/lab2-my-tickets` | `lab2-staging` | **Issue 4:** My Tickets View, Strict Ownership Isolation, Search, Category/Priority Filters, Sorting | `@Leviathan-c137` | **Approved** |
| **#19** | `feature/lab2-ticket-detail-and-attachments` | `lab2-staging` | **Issue 5:** Ticket Detail View, Multer Upload, Active Limit (5), Audit Soft-Removal, `410 Gone` | `@FramePongrit` | **Approved** |
| **#21** | `feature/lab2-e2e-and-docs` | `lab2-staging` | **Issue 6:** Playwright E2E Test Suite, Multi-Viewport Validation, `reviewer.md`, `ai_use.md` | `@Leviathan-c137` | **Approved** |
| **#22** | `lab2-staging` | `main` | **Release PR:** Production Release of Sprint 2 MVP into `main` branch with full test evidence | `@FramePongrit` | **Approved** |

### 1.4 Directory Structure of Repository
```text
toktickit/
├── .gitignore
├── docker-compose.yml
├── package.json
├── playwright.config.ts
├── README.md
├── artifacts/
│   └── lab-02/
│       └── screenshots/
│           ├── create-ticket/
│           ├── my-tickets/
│           ├── ticket-detail/
│           └── responsive/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.tsx
│   │   │   ├── CreateTicket.tsx
│   │   │   ├── MyTickets.tsx
│   │   │   ├── RequesterSelect.tsx
│   │   │   └── TicketDetail.tsx
│   │   ├── context/
│   │   │   └── RequesterContext.tsx
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── zen-green.css
│   └── tests/
│       ├── lab-01/
│       └── lab-02/
├── docs/
│   ├── lab-01/
│   └── lab-02/
│       ├── ai_use.md
│       ├── api-spec.md
│       ├── report-answers.md
│       ├── reviewer.md
│       ├── specification.md
│       ├── tests.md
│       └── ui-spec.md
├── e2e/
│   └── lab-02/
│       ├── capture-all-evidence.spec.ts
│       └── requester-ticket-flow.spec.ts
└── server/
    ├── prisma/
    │   ├── migrations/
    │   ├── schema.prisma
    │   └── seed.ts
    ├── src/
    │   ├── app.ts
    │   └── index.ts
    ├── uploads/
    └── tests/
        ├── lab-01/
        └── lab-02/
```

### 1.5 Repository `.gitignore` Content
```text
# dependencies
node_modules/
# env & secrets
.env
*.env
!.env.example
# build output
dist/
build/
# prisma
server/prisma/*.db
# logs & OS
*.log
# uploads
server/uploads/*
!server/uploads/.gitkeep
# test artifacts
test-results/
playwright-report/
```

---

## Answer Part 2: Spec DD (5 Points)

- **Specification Link:** [docs/lab-02/specification.md](https://github.com/narakosi-dev/toktickit/blob/main/docs/lab-02/specification.md)
- **Proof of Prior Creation:** PR #10 (Commit `018ac03`), created and merged into `lab2-staging` before feature implementation PRs began.

### Summary of Numbered Requirements & Rules:
- **Functional Requirements (FR):**
  - `FR-01`: Development Requester Selection from seeded active database users.
  - `FR-02 & FR-03`: Persistent requester identity in header; dynamic switching with instant data isolation.
  - `FR-04 & FR-05`: Ticket Creation with Category, System, Priority, Summary, Description, and system-generated unique `TKT-YYYY-NNNNNN` with initial status `New`.
  - `FR-06`: Form resilience against backend failures; preserves entered values without data loss.
  - `FR-07, FR-08 & FR-09`: My Tickets list filtered strictly by `requesterId`, real-time keyword search, Category/Priority/Status filtering, date/priority sorting, and pagination.
  - `FR-10`: Read-only Ticket Detail view.
  - `FR-11, FR-12 & FR-13`: Attachment uploads (JPG, PNG, WEBP, PDF up to 5MB, max 5 active), active file downloads, and soft-removal requiring non-empty audit reasons with download prevention (`410 Gone`).
  - `FR-14`: Cross-requester access rejection (HTTP 404/403) preventing resource enumeration.
- **Mandatory Business Rules (BR):**
  - `BR-01`: Unique Ticket Number format `TKT-YYYY-XXXXXX` generated by backend.
  - `BR-02`: Initial Status set to `New`.
  - `BR-03 & BR-04`: Dev Requester Context is a testing harness; inactive requesters (`active: false`) are hidden from selection.
  - `BR-05`: Strict ownership isolation; queries and endpoints verify requester ownership.
  - `BR-06 & BR-07`: Max 5 active attachments per ticket; soft-removal records `active: false`, timestamp, and reason while retaining physical file for audit.
  - `BR-08`: Summary: 5–120 chars; Description: 10–2000 chars; Removal Reason: 5–500 chars.

---

## Answer Part 3: Test DD and Traceability (10 Points)

- **Test Plan Link:** [docs/lab-02/tests.md](https://github.com/narakosi-dev/toktickit/blob/main/docs/lab-02/tests.md)

### 3.1 Traceability Matrix
| Test ID | Level | Target / AC | Scope | Test File Path | Status |
|:---:|:---:|:---:|:---|:---|:---:|
| **API-01** | API | AC-04, BR-01 | Ticket creation & unique number generation | `server/tests/lab-02/create-ticket.test.ts` | **Pass** |
| **API-02** | API | AC-04, BR-08 | Validation boundaries (summary & description lengths) | `server/tests/lab-02/create-ticket.test.ts` | **Pass** |
| **API-03** | API | AC-03, BR-05 | My Tickets ownership isolation (`requesterId` filter) | `server/tests/lab-02/my-tickets.test.ts` | **Pass** |
| **API-04** | API | AC-07, BR-08 | My Tickets search, filters, sorting & pagination | `server/tests/lab-02/my-tickets.test.ts` | **Pass** |
| **API-05** | API | AC-08, BR-05 | Ticket Detail ownership & 404 on unowned ticket | `server/tests/lab-02/ticket-detail.test.ts` | **Pass** |
| **API-06** | API | AC-09, BR-06 | Attachment upload (file types, 5MB limit, max 5) | `server/tests/lab-02/attachments.test.ts` | **Pass** |
| **API-07** | API | AC-10, BR-07 | Soft-removal audit reason & 410 Gone on download | `server/tests/lab-02/attachments.test.ts` | **Pass** |
| **UI-01** | UI | AC-02, BR-04 | Requester Selection dropdown & inactive exclusion | `client/tests/lab-02/RequesterSelect.test.tsx`| **Pass** |
| **UI-02** | UI | AC-03 | Header identity display & switch user action | `client/tests/lab-02/AppShell.test.tsx` | **Pass** |
| **UI-03** | UI | AC-04 | Create Ticket form rendering & loaded dropdowns | `client/tests/lab-02/CreateTicket.test.tsx` | **Pass** |
| **UI-04** | UI | AC-05, BR-08 | Client-side validation messages on invalid submit | `client/tests/lab-02/CreateTicket.test.tsx` | **Pass** |
| **UI-05** | UI | AC-06 | Error banner shown & inputs preserved on 500 error | `client/tests/lab-02/CreateTicket.test.tsx` | **Pass** |
| **UI-06** | UI | AC-07 | My Tickets table, status badges & empty state | `client/tests/lab-02/MyTickets.test.tsx` | **Pass** |
| **UI-07** | UI | AC-09, AC-10 | Ticket Detail view, upload UI & soft-remove modal | `client/tests/lab-02/TicketDetail.test.tsx` | **Pass** |
| **E2E-01**| E2E | Full Flow | End-to-end user journey & multi-viewport layout | `e2e/lab-02/requester-ticket-flow.spec.ts` | **Pass** |

### 3.2 Terminal Passing Test Output from `main`
```text
=== SERVER VITEST TEST SUITE ===
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/categories.test.ts (1 test)
 ✓ tests/lab-02/related-systems.test.ts (1 test)
 ✓ tests/lab-02/requesters.test.ts (1 test)
 ✓ tests/lab-02/create-ticket.test.ts (7 tests)
 ✓ tests/lab-02/ticket-detail.test.ts (4 tests)
 ✓ tests/lab-02/my-tickets.test.ts (8 tests)
 ✓ tests/lab-02/attachments.test.ts (11 tests)
 Test Files  8 passed (8)
      Tests  34 passed (34)

=== CLIENT VITEST TEST SUITE ===
 ✓ tests/lab-02/RequesterSelect.test.tsx (2 tests)
 ✓ tests/lab-01/App.test.tsx (3 tests)
 ✓ tests/lab-02/CreateTicket.test.tsx (4 tests)
 ✓ tests/lab-02/AppShell.test.tsx (2 tests)
 ✓ tests/lab-02/MyTickets.test.tsx (5 tests)
 ✓ tests/lab-02/TicketDetail.test.tsx (6 tests)
 Test Files  6 passed (6)
      Tests  22 passed (22)

=== PLAYWRIGHT END-TO-END TEST SUITE ===
  ok 1 [chromium] › e2e/lab-02/requester-ticket-flow.spec.ts:9:3 › E2E-01: complete requester journey (1.4s)
  1 passed (4.5s)
```

---

## Answer Part 4: AI Use with Reflection (5 Points)

- **AI Log Link:** [docs/lab-02/ai_use.md](https://github.com/narakosi-dev/toktickit/blob/main/docs/lab-02/ai_use.md)
- **AI Tool Used:** Google Antigravity AI Agent (Powered by Google DeepMind Advanced Coding Models).

### Key Prompts Log:
1. *"Analyze Lab 2 stakeholder requirements and generate engineering specifications covering Spec DD, UI Spec, API Spec, and Test DD."*
2. *"Design Prisma schema migrations adding Requester, RelatedSystem, Ticket, and Attachment models with relationships, indexes, and seed data."*
3. *"Implement Development Requester context in React with persistent state, header identity bar, and user-picker modal."*
4. *"Create ticket creation endpoint `POST /api/tickets` with strict input validation, transaction-safe unique ticket number generation, and automated Supertest suites."*
5. *"Implement My Tickets screen with ownership isolation, search, category/priority/status filters, pagination, and responsive desktop table/mobile cards."*
6. *"Build Ticket Detail view and attachment management with Multer disk uploads, 5MB limit, and soft-removal audit reason."*
7. *"Write automated Playwright E2E test verifying complete requester flow across Desktop, Tablet, and Mobile viewports."*
8. *"Generate GitHub Pull Request templates, peer-review comments, and Definition of Done checklists for partner collaboration."*

### My Reflection on AI Use Experience:
Working with an AI coding agent fundamentally shifted development from manual typing to **engineering orchestration, specification guidance, and verification**. By providing concrete acceptance criteria, explicit HTTP error boundaries (e.g. `404 Not Found` for unowned tickets to prevent enumeration and `410 Gone` for soft-removed downloads), and strict design tokens up front, the agent produced zero-defect code on the first pass. The primary responsibility remained with the human engineer: verifying test results against the database and inspecting responsive layouts to prevent visual clipping.

---

## Answer Part 5: Development Requester Select Screen (0 Points)
*(Scored under Part 6)*

The Development Requester Selector simulates authenticated sessions for Lab 2 before full authentication is introduced in Lab 3:
- Excludes inactive requesters (`active: false`, e.g., `inactive.tester@example.com`).
- Populates dropdown with active seeded requesters (`Nara Kosiyaporn`, `Sunny farmhouse`, `Sarah Johnson`, `David Lee`).
- Persists selected user in React Context and displays name/email in the application header with a `Change Requester` button.
- **Evidence Screenshot:** `artifacts/lab-02/screenshots/create-ticket/01-dev-requester-select.png`  
  *(Shows `Nara Kosiyaporn (nara.kosi@kmutt.ac.th)` selected in the Development Requester dropdown).*

---

## Answer Part 6: Working Ticket Screen: Create Mode (10 Points)

### Evidence Screenshots:
1. **Requester Population & Selection:**  
   `artifacts/lab-02/screenshots/create-ticket/01-dev-requester-select.png`  
   *Demonstrates choosing active requester "Nara Kosiyaporn" (nara.kosi@kmutt.ac.th) and confirming user identity displayed in header.*
2. **Desktop Viewport & Loaded Reference Data:**  
   `artifacts/lab-02/screenshots/create-ticket/02-create-ticket-initial-desktop.png`  
   *Displays Category dropdown (Account and Access, Hardware, Software, Network) and Related System dropdown (Corporate Laptop, Email, VPN, etc.) loaded dynamically from PostgreSQL with `Nara Kosiyaporn` in header.*
3. **Validation Errors on Invalid Submit:**  
   `artifacts/lab-02/screenshots/create-ticket/03-create-ticket-validation-errors.png`  
   *Displays field-level error messages below controls ("Category is required", "Summary is required", "Description is required").*
4. **API Failure Resilience (AC-06):**  
   `artifacts/lab-02/screenshots/create-ticket/04-create-ticket-api-failure-preserved.png`  
   *Demonstrates simulated backend 500 error showing alert banner while preserving entered Summary ("MacBook Pro M3 battery drains abnormally fast") and Description without data loss.*
5. **Successful Creation & Official Ticket Number (BR-01):**  
   `artifacts/lab-02/screenshots/create-ticket/05-create-ticket-success-official-number.png`  
   *Displays success dialog showing generated official Ticket Number (e.g., `TKT-2026-000072`), initial status `New`, and action buttons.*

---

## Answer Part 7: Working My Tickets Screen (10 Points)

### Evidence Screenshots:
1. **Requester A's Ticket List:**  
   `artifacts/lab-02/screenshots/my-tickets/06-my-tickets-requester-a.png`  
   *Displays tickets belonging strictly to Nara Kosiyaporn with Ticket Number, Summary, Category, Priority, and Status badges.*
2. **Category Filtering:**  
   `artifacts/lab-02/screenshots/my-tickets/07-my-tickets-filter-category.png`  
   *Filters list to display only "Account and Access" or "Hardware" tickets.*
3. **Priority Filtering:**  
   `artifacts/lab-02/screenshots/my-tickets/08-my-tickets-filter-priority.png`  
   *Filters list to display only "High" priority tickets.*
4. **Keyword Search:**  
   `artifacts/lab-02/screenshots/my-tickets/09-my-tickets-search.png`  
   *Real-time search matching keyword "MacBook" in ticket summary.*
5. **Empty / No-Results State:**  
   `artifacts/lab-02/screenshots/my-tickets/10-my-tickets-no-results-state.png`  
   *Displays clear empty state with "Clear Filters" button when search keyword has 0 matches.*
6. **Data Isolation (Switch to Requester B):**  
   `artifacts/lab-02/screenshots/my-tickets/16-my-tickets-requester-b-isolation.png`  
   *Switches to Requester B: "Sunny farmhouse (nara2012sun@gmail.com)"; Nara Kosiyaporn's tickets completely disappear from view, displaying the clean "No Tickets Yet" empty state, proving strict ownership isolation.*

---

## Answer Part 8: Working Ticket Screen: View Mode & Attachments (5 Points)

### Evidence Screenshots:
1. **Owned Ticket Detail View:**  
   `artifacts/lab-02/screenshots/ticket-detail/11-ticket-detail-view.png`  
   *Displays read-only ticket header, metadata grid showing Requester "Nara Kosiyaporn" and Contact Email "nara.kosi@kmutt.ac.th", description card, and active attachment count (`0 / 5 active attachments`).*
2. **Invalid Attachment Type Rejection:**  
   `artifacts/lab-02/screenshots/ticket-detail/12-ticket-detail-invalid-attachment.png`  
   *Selecting an unsupported `.txt` file triggers client-side validation: "Unsupported file type. Permitted: JPG, PNG, WEBP, PDF."*
3. **Valid Attachment Upload:**  
   `artifacts/lab-02/screenshots/ticket-detail/13-ticket-detail-valid-attachment-uploaded.png`  
   *Uploading valid PNG file (`diagnostic-screenshot.png`) updates active counter to `1 / 5 active attachments` and enables Download and Remove buttons.*
4. **Soft-Removal Modal with Mandatory Reason:**  
   `artifacts/lab-02/screenshots/ticket-detail/14-ticket-detail-soft-remove-modal.png`  
   *Clicking Remove opens modal requiring non-empty reason ("Replaced by updated diagnostic screenshot", minimum 5 chars).*
5. **Soft-Removed State & Download Blocked:**  
   `artifacts/lab-02/screenshots/ticket-detail/15-ticket-detail-soft-removed-state.png`  
   *Attachment displays red "Removed" badge, shows audit reason quote and timestamp; download action is disabled with "Download unavailable" and `410 Gone` backend protection.*
6. **Cross-Requester Protection:**  
   *Direct API access to another requester's ticket returns `404 Not Found` (`{"error": "Ticket not found or unauthorized access"}`), preventing ID enumeration.*

---

## Answer Part 9: Zen Green UI and Responsive Evidence (5 Points)

- **UI Specification Link:** [docs/lab-02/ui-spec.md](https://github.com/narakosi-dev/toktickit/blob/main/docs/lab-02/ui-spec.md)

### 9.1 Multi-Viewport Screenshots:
1. **Desktop Viewport (1200px):**  
   `artifacts/lab-02/screenshots/responsive/17-responsive-desktop-1200px.png`  
   *Two-column form layout, wide navigation bar, spacious ticket metadata with `Nara Kosiyaporn` displayed.*
2. **Tablet Viewport (800px):**  
   `artifacts/lab-02/screenshots/responsive/18-responsive-tablet-800px.png`  
   *Adaptive two-column form, touch-friendly form controls, zero clipping.*
3. **Mobile Viewport (375px) — Create Ticket:**  
   `artifacts/lab-02/screenshots/responsive/19-responsive-mobile-375px.png`  
   *Single-column vertically stacked inputs, full-width buttons, zero horizontal overflow (`scrollWidth <= clientWidth`).*
4. **Mobile Viewport (375px) — My Tickets:**  
   `artifacts/lab-02/screenshots/responsive/20-responsive-mobile-my-tickets-375px.png`  
   *Desktop table transforms seamlessly into responsive cards for mobile viewports.*

### 9.2 Completed Visual Checklist:
| Criteria | Verification Details | Status |
|:---|:---|:---:|
| **Color Tokens** | `#006B3C` (Primary green), `#0B7A46` (Secondary green), `#EAF6EF` (Pale green), `#F5F7F6` (Canvas) | **Pass** |
| **Editable vs Read-Only** | White background for editable inputs; `#F0F5F2` for read-only system date & ticket number | **Pass** |
| **Validation Placement** | Error messages appear directly underneath the corresponding input in dark red (`#B02A37`) | **Pass** |
| **Button Hierarchy** | Primary (`btn-zen-primary`), Secondary (`btn-zen-secondary`), Destructive soft-remove (`btn-danger`) | **Pass** |
| **No Clipping / Overlap** | Zero text truncation, zero overlapping buttons, and flex-wrapping header items | **Pass** |
| **Horizontal Scrolling** | Tested at 375px width via Playwright; `document.documentElement.scrollWidth <= clientWidth` | **Pass** |
