# Lab 2 — AI Use and Reflection

**LLM/Agent Used:** Antigravity IDE (Gemini 2.5 Pro Agentic Coding System)

---

## 1. Selected Key Prompts (6–10)

| # | Prompt (Summarized) | What I Did with the Result |
|---|---------------------|----------------------------|
| **1** | *"Establish Sprint 2 engineering specification, UI guidelines under Zen Green system, API contracts, and full test plan for Requester Portal."* | Formulated `specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md` in `docs/lab-02/`. Created PR #10. |
| **2** | *"Define Prisma models for Requester, RelatedSystem, Ticket, Attachment, create seed script, and build RequesterSelect component."* | Migrated PostgreSQL schema with Prisma, verified active-only filtering in `GET /api/requesters`, and integrated requester context into AppShell. |
| **3** | *"Implement ticket creation with globally unique ticket numbers `TKT-YYYY-NNNNNN`, initial status `New`, and form validation with failure resilience."* | Implemented `POST /api/tickets`, resolved concurrent sequence collision with retry loops on `P2002`, and verified with 7 automated unit tests. |
| **4** | *"Build My Tickets view with strict ownership isolation, search, category/priority/status filters, and pagination."* | Created `GET /api/tickets?requesterId=...` and `MyTickets.tsx` with responsive desktop table and mobile card views, achieving 100% test coverage. |
| **5** | *"Implement Ticket Detail view and attachment management with upload limits, download streaming, and soft-removal with mandatory audit reasons."* | Configured `multer` disk storage in `server/uploads/`, implemented `410 Gone` download blocking for soft-removed files, and created `TicketDetail.tsx` with modal dialog. |
| **6** | *"Write Playwright E2E automated test verifying complete requester journey: login, ticket creation, list filtering, attachment upload, soft-removal, and user switching."* | Implemented `e2e/lab-02/requester-ticket-flow.spec.ts` testing the complete lifecycle and multi-viewport responsive layouts (Desktop, Tablet, Mobile). |
| **7** | *"Debug Vitest test failure where desktop table and mobile cards render duplicate elements simultaneously."* | Adjusted component test assertions to use `screen.getAllByText(...)` or scoped role queries to accurately reflect responsive DOM structures. |
| **8** | *"Generate GitHub Pull Request templates, peer-review comments, and Definition of Done checklists for partner collaboration."* | Facilitated seamless code reviews and collaboration with partner `@FramePongrit` across all PR increments. |

---

## 2. Reflection

### What Made Prompts Better
Providing exact acceptance criteria, business rules (e.g. BR-01 through BR-08), and HTTP status codes before generating implementation code dramatically improved code precision. Explicitly specifying error boundaries (such as returning `404 Not Found` for unowned tickets to prevent enumeration and `410 Gone` for soft-removed downloads) ensured the agent produced secure, production-grade solutions on the first pass.

### Key Corrections & Overrides
1. **Concurrency Race Condition:** When running parallel test suites on `POST /api/tickets`, sequence generation occasionally hit unique constraint violations (`P2002`). I directed the agent to wrap sequence allocation in a retry loop scanning `startsWith("TKT-YYYY-")` ordered by `ticketNumber desc`.
2. **Dual-Viewport DOM Handling:** Because the UI maintains simultaneous desktop tables (`d-none d-md-block`) and mobile cards (`d-md-none`) for clean responsiveness, initial React Testing Library queries failed on `getByText` due to multiple matching nodes. I corrected the tests to use accessible role queries and `getAllByText`.
3. **Build Artifact Cleanliness:** In the client build pipeline, `tsc` previously emitted `.js` files alongside `.tsx` source files. I configured `"noEmit": true` in `client/tsconfig.json` so Vite handles bundling cleanly.
