# Lab 3 — AI Use and Reflection

**Course:** CPE 334 Software Engineering — KMUTT  
**Student:** Nara Kosiyaporn (Student ID: 67070505218) — GitHub: [@narakosi-dev](https://github.com/narakosi-dev)  
**LLM / AI Agent System:** Google Antigravity IDE (Gemini 2.5 Pro Agentic Pair-Programming System)

---

## 1. Selected Key Prompts (9 Prompts)

| # | Prompt (Summarized) | What I Did with the Result |
|---|---------------------|----------------------------|
| **1** | *"Establish Sprint 3 engineering specification, UI guidelines under Zen Green system, REST API contracts, and comprehensive test traceability matrix for multi-role ticketing and administration."* | Authored `specification.md` (FR-01–FR-32, BR-01–BR-18, AC-01–AC-18), `ui-spec.md`, `api-spec.md`, and `tests.md` in `docs/lab-03/` before coding. Established baseline contracts for Issue 1. |
| **2** | *"Evolve Lab 2 PostgreSQL and Prisma schema to support User model, Role enum, PublicComment, InternalNote, and ActivityLog with idempotent seeding."* | Migrated Prisma schema while preserving Lab 2 ticket/attachment data, implemented idempotent seeding in `server/prisma/seed.ts` (1 Admin, 3 IT Staff, 6 Requesters, 2 Inactive accounts). Merged via PR #23. |
| **3** | *"Implement backend authentication REST APIs (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/change-password`) with JWT tokens, bcryptjs password hashing, password complexity validator, and RBAC middleware."* | Built `server/src/auth.ts` and `server/src/routes/auth.routes.ts`, enforcing `authenticateToken`, `requireRole`, and `requirePasswordChanged`. Verified with 27 unit/integration tests in PR #37. |
| **4** | *"Create frontend authentication UI with Login component under Zen Green aesthetic, mandatory first-login password change interceptor, dynamic password checklist, and AuthContext."* | Implemented `AuthContext.tsx`, `Login.tsx`, and `ChangePassword.tsx`, providing seamless authentication state, role-based routing, and immediate redirection upon password change. Merged in PR #38. |
| **5** | *"Implement IT Staff Ticket Queue API and frontend screen with search, status/priority/assignee/category filters, sorting, pagination, and responsive mobile card layout with zero overflow."* | Created `GET /api/staff/tickets` in `staff.routes.ts` and `StaffTicketQueue.tsx` with statistics cards, filter drawer, debounced search, responsive table on desktop/tablet, and card stack on mobile. Merged in PR #39 & PR #40. |
| **6** | *"Implement IT Staff Ticket operations (claim/assign, IT priority override, strict status transition matrix, requester resolution indication) and frontend StaffTicketDetail with dual conversation tabs."* | Built `server/src/routes/staff.routes.ts` ticket operations, `ActivityLog` timeline tracking, and `StaffTicketDetail.tsx` with distinct Public Conversation vs. Confidential Internal Notes tabs. Merged in PR #41 & PR #43. |
| **7** | *"Implement Public Comments and Confidential Internal Notes REST APIs, enforcing HTTP 403 Forbidden on Requesters with zero note metadata or count leakage."* | Built `server/src/routes/comments.routes.ts` and `notes.routes.ts`. Requesters querying internal notes receive HTTP 403 Forbidden with zero count/preview leakage. Verified by 28 automated tests in PR #42. |
| **8** | *"Implement Administrator User Management APIs and UI screen enforcing critical safety invariants: self-deactivation prevention (BR-13), sole active admin protection (BR-14), and 405 Method Not Allowed on hard deletion (BR-15)."* | Implemented `admin.routes.ts` and `UserManagement.tsx`. Applied reviewer feedback: Fisher-Yates password shuffle, password strength validation, and atomic Prisma transaction. Merged in PR #44 & PR #45. |
| **9** | *"Build Playwright multi-viewport End-to-End test suite covering closed-loop password change, complete cross-role ticket lifecycle, user administration, and automated responsive screenshot capture across Desktop, Tablet, and Mobile."* | Developed `authentication.spec.ts`, `staff-ticket-flow.spec.ts`, and `user-administration.spec.ts`. Captured 24 automated screenshots into `artifacts/lab-03/screenshots/` with zero horizontal overflow. Merged in PR #46. |

---

## 2. My Reflection

### 2.1 Specification-Agent Collaboration
Using the AI as a specification agent during Phase 1 significantly improved the architectural foundation of the project. Rather than jumping straight to implementation, transforming the stakeholder requirements into formal Functional Requirements (FR-01 to FR-32), Business Rules (BR-01 to BR-18), and Acceptance Criteria (AC-01 to AC-18) forced upfront resolution of critical edge cases. Specifically, defining:
- The exact **Status Transition Matrix** (preventing illegal jumps like `New` $\rightarrow$ `Closed` and freezing terminal states),
- The **Confidentiality Barrier** (ensuring Requesters receive HTTP 403 Forbidden with zero note count or snippet leakage), and
- The **Administrator Safety Invariants** (`BR-13` self-deactivation prevention, `BR-14` sole active admin protection, and `BR-15` soft-deactivation only)
prevented ambiguous requirements from leaking into backend routes or client views.

### 2.2 Coding-Agent Use & Human/Peer Oversight
Pair programming with the agent accelerated test-driven development (TDD), generating exhaustive test suites across server Vitest (152 tests), client Vitest (68 tests), and Playwright E2E (12 tests). However, human oversight and rigorous peer code reviews (from `@Leviathan-c137` and `@Sxr1n`) proved indispensable in catching subtle production bugs that an automated coding agent overlooked:

1. **Statistical Uniformity in Temporary Passwords:**
   The initial agent implementation of `generateTemporaryPassword()` used modulo arithmetic on random bytes, introducing potential modulo bias. In response to peer review feedback on PR #44, I refactored the routine to use a cryptographically sound Fisher-Yates shuffle across the required character sets.
2. **Concurrency on Last Admin Deactivation:**
   The agent initially checked the count of active administrators via a separate query before issuing an update. Under high concurrency, simultaneous deactivations could result in zero remaining active administrators. I directed the agent to wrap the validation and update inside an atomic `prisma.$transaction` with serializable isolation.
3. **UI Safety Invariant Decoupling:**
   When searching or filtering users in `UserManagement.tsx`, computing `activeAdminCount` from the filtered array caused the sole matching administrator to appear as the "last active administrator," incorrectly disabling their controls. I instructed the agent to decouple system-wide invariant tracking from the client-side search query state.
4. **Deterministic E2E Test Selectors:**
   In Playwright tests, text-based queries like `getByText(user.name)` collided between header identity badges and table rows. I introduced semantic `.user-name` and `.user-role-badge` classes in `AppShell.tsx` to provide bulletproof, refactor-resilient locators.

### 2.3 Conclusion
The combination of upfront Specification-Driven Development, AI-assisted Test-Driven Development, and strict peer code reviews resulted in a secure, robust, and zero-regression product increment. The codebase successfully evolved from Lab 2's development identity simulator into a fully authenticated, role-based, enterprise ticketing system.
