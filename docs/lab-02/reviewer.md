# Lab 2 — Peer Review Record

**Author:** Narakorn (narakosi) — GitHub: [@narakosi-dev](https://github.com/narakosi-dev)  
**Peer Reviewers (Peer Review Team):**
- Pongrit (Frame) — GitHub: [@FramePongrit](https://github.com/FramePongrit)
- GitHub: [@Beethoven190](https://github.com/Beethoven190)
- GitHub: [@Leviathan-c137](https://github.com/Leviathan-c137)
- GitHub: [@SANOP19](https://github.com/SANOP19)

---

## 1. Pull Requests I Authored (Reviewed by Peers)

| PR # | Branch | Target Branch | Features & Scope | Reviewers | Reviewer Verdict |
|:---:|:---|:---|:---|:---|:---:|
| **#10** | `feature/lab2-spec-docs` | `lab2-staging` | **Issue 1:** Spec-Driven Development & Test Plan (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`) | `@FramePongrit`, `@Beethoven190` | **Approved** |
| **#12** | `feature/lab2-requester-context` | `lab2-staging` | **Issue 2:** Development Requester Context, Prisma Seed Foundation, `RequesterSelect.tsx`, AppShell Identity Display | `@FramePongrit`, `@Leviathan-c137` | **Approved** |
| **#14** | `feature/lab2-ticket-creation` | `lab2-staging` | **Issue 3:** Ticket Creation Flow, `POST /api/tickets`, Unique `TKT-YYYY-NNNNNN` generation, Form validation, `CreateTicket.tsx` | `@FramePongrit`, `@SANOP19` | **Approved** |
| **#17** | `feature/lab2-my-tickets` | `lab2-staging` | **Issue 4:** My Tickets View, Strict Ownership Isolation, Search, Category/Priority/Status Filters, Sorting & Pagination | `@FramePongrit`, `@Beethoven190` | **Approved** |
| **#19** | `feature/lab2-ticket-detail-and-attachments` | `lab2-staging` | **Issue 5:** Ticket Detail View, Multer Upload, Active Limit (5), Audit Soft-Removal with mandatory reason, `410 Gone` on download | `@FramePongrit`, `@Leviathan-c137` | **Approved** |
| **#21** | `feature/lab2-e2e-and-docs` | `lab2-staging` | **Issue 6:** Playwright E2E Test Suite, Multi-Viewport Validation (Desktop, Tablet, Mobile), `reviewer.md`, `ai_use.md` | `@FramePongrit`, `@SANOP19` | **Approved** |

### Key Reviewer Feedback Received:
> "LGTM! Approved! Thorough test coverage across Vitest and Playwright. The implementation of ownership barriers and data isolation across requesters is clean. Ticket number formatting and concurrency handling in ticket creation are solid. The soft-removal audit trail and 410 Gone download protection strictly fulfill the specification. Responsive design adapts smoothly across all viewports without horizontal clipping."

### How I Responded:
- **Concurrency Safety:** Handled potential race conditions during parallel ticket creations by implementing a retry loop on Prisma unique constraint violations (`P2002`).
- **TypeScript Compilation:** Fixed client build by configuring `"noEmit": true` in `client/tsconfig.json` to avoid colliding with emitted `.js` artifacts.
- **Security & Ownership Isolation:** Maintained strict ownership checks (`requesterId`) returning HTTP `404 Not Found` across all ticket and attachment endpoints to prevent resource enumeration.
- **Mobile Viewport Optimization:** Applied flex-wrapping to header navigation elements to eliminate a 37px horizontal overflow on 375px mobile screens.

---

## 2. Pull Requests I Reviewed for Peers

| PR # | Peer Repository | Branch | Scope | My Verdict |
|:---:|:---|:---|:---|:---:|
| **#38** | `FramePongrit/toktickit` | `feature/17-visual-review-and-docs` | Issue 17: Visual inspection, responsive screenshots across 3 viewports, documentation updates | **Approved** |
| **#39** | `FramePongrit/toktickit` | `lab2-staging` → `main` | Final Release PR: Release verification across all Lab 2 increments, full test evidence, zero regression on Lab 1 | **Approved** |
| **Peer Reviews** | `Beethoven190/toktickit` | `feature/*` | Peer review verification: form validations, error handling, and test suites | **Approved** |
| **Peer Reviews** | `Leviathan-c137/toktickit` | `feature/*` | Peer review verification: component styling, ticket listing, and API contracts | **Approved** |
| **Peer Reviews** | `SANOP19/toktickit` | `feature/*` | Peer review verification: attachment lifecycle and multi-viewport responsiveness | **Approved** |

### Review Comments Provided to Peers:
> **Review for FramePongrit PR #38:**  
> "LGTM! Approved! The visual evidence and screenshots captured across desktop, tablet, and mobile viewports verify zero horizontal scroll overflow. Clear documentation in reviewer and AI use records. Excellent job!"

> **Review for FramePongrit PR #39 (Release PR):**  
> "LGTM! 🚀 Approved! All Lab 2 deliverables verified: Spec DD suite, development requester selector, ticket creation flow with unique ticket numbers, ownership isolation in My Tickets, ticket detail with audit soft-removal, and Playwright E2E test runs. Zero regression on Lab 1 health and category APIs. Ready for production merge into main!"

> **General Peer Review Feedback to Buddies (@Beethoven190, @Leviathan-c137, @SANOP19):**  
> "LGTM! Approved! Comprehensive test coverage, clean code structure following the Zen Green design system, and solid adherence to the Lab 2 Sprint specification and DoD."
