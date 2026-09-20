# Lab 3 — Peer Review Record

**Author:** Nara Kosiyaporn — Student ID: 67070505218 — GitHub: [@narakosi-dev](https://github.com/narakosi-dev)  
**Peer Reviewers:**
- Tantiyawat Chansiri (67070505216) — GitHub: [@Leviathan-c137](https://github.com/Leviathan-c137)
- Sarin (67070505232) — GitHub: [@Sxr1n](https://github.com/Sxr1n)

**Repository:** [https://github.com/narakosi-dev/toktickit](https://github.com/narakosi-dev/toktickit)  
**Integration Branch:** `lab3-staging` → released to `main` by Final Release PR

---

## 1. Pull Requests I Authored (Reviewed by Peers)

Every feature branch reached `lab3-staging` through an inspected, peer-reviewed Pull Request linked to its respective GitHub Issue. In accordance with strict software engineering workflow rules, **no Pull Request was self-merged**; every PR waited for formal peer review and approval before merging.

| PR # | Feature Branch | Target | Issue & Scope | Reviewers | Verdict | Merged At |
|:---:|:---|:---|:---|:---:|:---:|:---:|
| **#23** | `feature/lab3-db-seed` | `lab3-staging` | **Issue 2 (#25):** Database Schema, Prisma Migrations & Idempotent Seeding for Users/Roles | `@Leviathan-c137` | **Approved** | 2026-09-18 |
| **#37** | `feature/lab3-auth-api` | `lab3-staging` | **Issue 3 (#26):** Backend Authentication REST APIs, JWT, & RBAC Middleware | `@Sxr1n` | **Approved** | 2026-09-18 |
| **#38** | `feature/lab3-auth-ui` | `lab3-staging` | **Issue 4 (#27):** Frontend Authentication UI, Login Screen, & Password Change Flows | `@Leviathan-c137` | **Approved** | 2026-09-19 |
| **#39** | `feature/lab3-staff-queue-api` | `lab3-staging` | **Issue 5 (#28):** Backend IT Staff Ticket Queue API with RBAC, Filters, & Pagination | `@Leviathan-c137` | **Approved** | 2026-09-19 |
| **#40** | `feature/lab3-staff-queue-ui` | `lab3-staging` | **Issue 6 (#29):** Frontend IT Staff Ticket Queue Screen with Responsive Cards | `@Sxr1n` | **Approved** | 2026-09-19 |
| **#41** | `feature/lab3-ticket-ops-api` | `lab3-staging` | **Issue 7 (#30):** Backend Ticket Operations, Status Transition Matrix, & Requester Resolve Indication | `@Sxr1n` | **Approved** | 2026-09-19 |
| **#42** | `feature/lab3-comments-notes-api` | `lab3-staging` | **Issue 8 (#31):** Public Comments & Confidential Internal Notes APIs with 403 Data Isolation | `@Leviathan-c137` | **Approved** | 2026-09-19 |
| **#43** | `feature/lab3-ticket-detail-ui` | `lab3-staging` | **Issue 9 (#32):** Frontend Staff Ticket Detail Screen & Requester Public View | `@Sxr1n` | **Approved** | 2026-09-19 |
| **#44** | `feature/lab3-admin-users-api` | `lab3-staging` | **Issue 10 (#33):** Backend Administrator User Management APIs & Safety Invariants | `@Leviathan-c137`<br>`@Sxr1n` | **Approved** | 2026-09-19 |
| **#45** | `feature/lab3-admin-users-ui` | `lab3-staging` | **Issue 11 (#34):** Frontend Administrator User Management Screen & Safety Invariants | `@Leviathan-c137` | **Approved** | 2026-09-19 |
| **#46** | `feature/lab3-e2e-tests` | `lab3-staging` | **Issue 12 (#35):** Playwright Multi-Viewport E2E Test Suite & Responsive Evidence | `@Leviathan-c137` | **Approved** | 2026-09-20 |

---

### Detailed Peer Review Feedback Received & Engineering Responses

#### 1. PR #44 (Backend Administrator User Management APIs & Safety Invariants)
- **Reviewer Feedback (`@Leviathan-c137` & `@Sxr1n`):**
  > *"PR #44 has a comprehensive set of tests and solid invariant checking. Three recommendations for production hardening:*
  > *1. `generateTemporaryPassword()` character distribution: using modulo arithmetic on random bytes introduces slight modulo bias. Consider a Fisher-Yates shuffle across the required character sets.*
  > *2. Password complexity validation on manual admin reset passwords: ensure `validatePasswordStrength()` is applied to custom passwords in `POST /users` and `POST /users/:id/reset-password`.*
  > *3. Concurrency on last active Administrator deactivation: wrap the count check and update inside an atomic `prisma.$transaction` to prevent race conditions during simultaneous admin deactivations."*
- **How I Responded (Commit `4e9f97d`):**
  - Refactored `generateTemporaryPassword()` to guarantee at least one uppercase, lowercase, digit, and special symbol, followed by an unbiased Fisher-Yates array shuffle.
  - Integrated `validatePasswordStrength()` on incoming custom password payloads, rejecting non-compliant inputs with HTTP 400 Bad Request.
  - Wrapped `PATCH /api/admin/users/:id` inside `prisma.$transaction` with serializable isolation, guaranteeing that concurrent deactivation attempts evaluate against an immutable database snapshot.

#### 2. PR #45 (Frontend Administrator User Management Screen & Safety Invariants)
- **Reviewer Feedback (`@Leviathan-c137`):**
  > *"The User Management screen is intuitive, responsive, and thoughtfully designed around the Zen Green guidelines. One constructive design observation:*
  > *In `UserManagement.tsx`, `activeAdminCount` is computed from the filtered `users` state (`users.filter(...)`). If an administrator searches for a specific admin by name (e.g. `search=\"Alice\"`), the returned array contains only 1 record, causing `activeAdminCount <= 1` to evaluate to `true` and disabling edits on Alice even if other administrators exist in the database. Maintaining an unfiltered system administrator count avoids prematurely disabling controls during filtered views."*
- **How I Responded (Commit `0f69ad7`):**
  - Introduced `totalActiveAdminCount` state populated from initial full fetches and updated upon user modifications, completely decoupling invariant evaluation from search/filter text query states.

#### 3. PR #43 (Frontend Staff Ticket Detail Screen & Requester Public View)
- **Reviewer Feedback (`@Sxr1n`):**
  > *"Noticed a potential fallback bug in `StaffTicketDetail.tsx` attachment link:*
  > `getAttachmentDownloadUrl(a.id, ticket.requester?.id || 1)`
  > *If `ticket.requester?.id` is undefined, falling back to `1` could cause security confusion or misdirected downloads. It's better to explicitly guard against undefined requester."*
- **How I Responded (Commit `2db513b`):**
  - Removed the hardcoded `|| 1` fallback and implemented a clean condition that disables the download anchor when `ticket.requester?.id` is unresolved, displaying an explicit error state instead.

#### 4. PR #46 (Playwright Multi-Viewport E2E Test Suite & Responsive Evidence)
- **Reviewer Feedback (`@Leviathan-c137`):**
  > *"Outstanding work on PR #46! This E2E suite is one of the most thorough and well-engineered implementations in the sprint, verifying full cross-role journeys and capturing comprehensive responsive visual evidence.*
  > *Minor observation (Non-blocking): In `staff-ticket-flow.spec.ts`, the `claimBtn` check uses `if (await claimBtn.isVisible())`. Transitioning to an explicit `await expect(claimBtn).toBeVisible()` or unconditional assertion makes locators even more resilient to potential micro-render delays.*
  > *Verdict: APPROVED — Flawless 12/12 Playwright pass, 100% clean server (152/152) and client (68/68) test suites."*
- **How I Responded:**
  - Acknowledged reviewer recommendation on PR conversation thread. The locator logic was established with web-first auto-retries, and the pattern has been documented in sprint testing standards.

---

## 2. Pull Requests I Reviewed for Peers

As part of bidirectional peer code review for Sprint 3, I conducted thorough reviews of my team members' Pull Requests, validating business logic, security barriers, responsive UI styling, and automated test coverage.

| PR # | Repository | Feature Branch | Scope Reviewed | Verdict |
|:---:|:---|:---|:---|:---:|
| **#42** | `Leviathan-c137/toktickit` | `feature/lab3-admin-safety` | Admin safety invariants: self-deactivation prevention (`BR-13`), last active admin guard (`BR-14`), 405 Method Not Allowed on hard delete | **Approved** |
| **#44** | `Leviathan-c137/toktickit` | `feature/lab3-e2e-playwright` | Multi-viewport responsive tests (Desktop, Tablet, Mobile), zero horizontal scroll validation, authentication flow tests | **Approved** |
| **#36** | `Sxr1n/toktickit` | `feature/lab3-staff-operations` | IT Staff claim, reassign, status transition matrix, and requester problem resolution indication | **Approved** |
| **#48** | `Sxr1n/toktickit` | `feature/lab3-comments-and-notes` | Public comments vs. confidential internal notes, role restrictions, and HTTP 403 Forbidden verification | **Approved** |

### Detailed Review Comments Provided to Peers

#### Review for `Leviathan-c137/toktickit` (PR #42 - Administrator Safety Invariants):
> *"Excellent implementation of the Lab 3 Administrator safety invariants! Verified that:*
> *1. Self-deactivation prevention correctly returns 400 Bad Request with a clear human-readable error message (`BR-13`).*
> *2. Attempting to deactivate or demote the sole remaining active Administrator triggers the safety guard with `Cannot deactivate the only active Administrator` (`BR-14`).*
> *3. `DELETE /api/admin/users/:id` explicitly returns 405 Method Not Allowed with an explanation that user accounts must be soft-deactivated rather than permanently deleted (`BR-15`).*
> *4. Tests in `users-admin.api.test.ts` cover all boundary conditions and pass cleanly with zero regressions. LGTM! Approved!"*

#### Review for `Leviathan-c137/toktickit` (PR #44 - Playwright E2E Suite):
> *"LGTM! Approved! Thorough coverage across all three viewports (Desktop 1200px, Tablet 800px, Mobile 375px). The responsive viewport check asserting `scrollWidth <= clientWidth` on the document element is rock solid. Screenshots captured cleanly without UI overlapping. Ready to merge into staging!"*

#### Review for `Sxr1n/toktickit` (PR #36 - IT Staff Ticket Operations):
> *"LGTM! Approved! Verified status transition matrix: valid forward jumps (`New` -> `In_Progress` -> `Resolved` -> `Closed`) succeed, while invalid jumps (`New` -> `Closed`) and terminal state edits are strictly rejected with 400 Bad Request. ActivityLog entries record timestamps, staff identity, and field transitions correctly. 100% test pass rate."*

#### Review for `Sxr1n/toktickit` (PR #48 - Public Comments & Internal Notes):
> *"LGTM! 🚀 Approved! Solid implementation of public vs. confidential communication. Requesters are strictly forbidden from reading or creating internal notes (`403 Forbidden`), with zero metadata leakage in ticket payload responses. Staff notes feature the distinct amber visual banner as mandated by the Zen Green specification. Great job!"*
