import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";
import fs from "fs";
import path from "path";

const BASE_DIR = process.cwd();
const SCREENSHOTS_DIR = path.join(BASE_DIR, "artifacts/lab-02/screenshots");
const OUTPUT_PATH = path.join(
  BASE_DIR,
  "docs/lab-02/Lab2_Report_67070505218_Nara_Kosiyaporn.docx"
);

// Helpers for Word styling
const ZEN_PRIMARY = "006B3C";
const ZEN_SECONDARY = "0B7A46";
const ZEN_PALE = "EAF6EF";
const ZEN_DARK = "1B3A2A";
const ZEN_MUTED = "556E60";
const ZEN_BORDER = "D0E0D8";
const BG_CODE = "F4F6F5";

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 140 },
  });
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
  });
}

function heading3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
  });
}

function p(text, bold = false, italic = false, color = ZEN_DARK) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold,
        italics: italic,
        color,
        font: "Calibri",
        size: 22, // 11pt
      }),
    ],
  });
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 180 },
    children: [
      new TextRun({
        text,
        italics: true,
        color: ZEN_MUTED,
        font: "Calibri",
        size: 18, // 9pt
      }),
    ],
  });
}

function codeBlock(codeText) {
  const lines = codeText.trim().split("\n");
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { before: 20, after: 20 },
        shading: { type: ShadingType.CLEAR, fill: BG_CODE },
        children: [
          new TextRun({
            text: line,
            font: "Consolas",
            size: 17, // 8.5pt
            color: "222222",
          }),
        ],
      })
  );
}

function embedImage(relPath, width = 540, height = 340) {
  const fullPath = path.join(SCREENSHOTS_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    return [p(`[Image file not found: ${relPath}]`, true, true, "B02A37")];
  }
  const imgBuffer = fs.readFileSync(fullPath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: {
            width,
            height,
          },
        }),
      ],
    }),
  ];
}

function createTable(headers, rows, colWidths = []) {
  const tableRows = [];

  // Header Row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map(
        (h, i) =>
          new TableCell({
            width: colWidths[i]
              ? { size: colWidths[i], type: WidthType.PERCENTAGE }
              : undefined,
            shading: { type: ShadingType.CLEAR, fill: ZEN_PRIMARY },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: h,
                    bold: true,
                    color: "FFFFFF",
                    font: "Calibri",
                    size: 20,
                  }),
                ],
              }),
            ],
          })
      ),
    })
  );

  // Body Rows
  rows.forEach((row, rowIndex) => {
    tableRows.push(
      new TableRow({
        children: row.map(
          (cell, colIndex) =>
            new TableCell({
              width: colWidths[colIndex]
                ? { size: colWidths[colIndex], type: WidthType.PERCENTAGE }
                : undefined,
              shading:
                rowIndex % 2 === 1
                  ? { type: ShadingType.CLEAR, fill: ZEN_PALE }
                  : undefined,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell,
                      font: "Calibri",
                      size: 20,
                      color: ZEN_DARK,
                    }),
                  ],
                }),
              ],
            })
        ),
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

// Generate Document
async function generateDocx() {
  console.log("Generating Comprehensive Lab 2 Report Word Document with Code Evidence...");

  const doc = new Document({
    title: "CPE334 Lab 2 Report — Nara Kosiyaporn",
    description: "Lab 2 TokTickIT Requester Ticketing MVP with UI Foundation and Code Architecture",
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22,
            color: ZEN_DARK,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: [
          // Cover / Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 80 },
            children: [
              new TextRun({
                text: "CPE 334 Introduction to Software Engineering in the Age of AI Agents",
                bold: true,
                size: 28,
                color: ZEN_PRIMARY,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 240 },
            children: [
              new TextRun({
                text: "Lab 2: TokTickIT Requester Ticketing MVP with UI Foundation & Code Architecture",
                bold: true,
                size: 24,
                color: ZEN_SECONDARY,
              }),
            ],
          }),

          createTable(
            ["Item", "Student & Project Information"],
            [
              ["Student Name", "Nara Kosiyaporn"],
              ["Student ID", "67070505218"],
              ["Semester", "1/2026"],
              ["GitHub Repository", "https://github.com/narakosi-dev/toktickit"],
              ["Final Release PR", "https://github.com/narakosi-dev/toktickit/pull/22"],
              [
                "Peer Reviewers",
                "Pongrit (Frame) (@FramePongrit), @Leviathan-c137",
              ],
              ["Primary Requester (A)", "Nara Kosiyaporn (nara.kosi@kmutt.ac.th)"],
              ["Secondary Requester (B)", "Sunny farmhouse (nara2012sun@gmail.com)"],
            ],
            [30, 70]
          ),

          new Paragraph({ spacing: { after: 280 } }),

          // ==========================================
          // PART 1
          // ==========================================
          heading1("Answer Part 1: Git Use with Engineering Workflow (10 Points)"),
          p(
            "The repository strictly adheres to the course engineering workflow: features are developed on dedicated feature branches, peer-reviewed and approved via Pull Requests, integrated into lab2-staging, and released into main via a final Release Pull Request (#22)."
          ),

          heading2("1.1 Git Commit History & Branching Workflow"),
          p(
            "Commit history graph from the final main branch demonstrating feature branches merging into staging and then into main:"
          ),
          ...codeBlock(`
*   b793168 Merge pull request #22 from narakosi-dev/lab2-staging
|\\  
| *   187d516 Merge pull request #21 from narakosi-dev/feature/lab2-e2e-and-docs
| |\\  
| | * 443c9fd docs(lab2): adjust reviewer list to FramePongrit and Leviathan-c137
| | * 6ea9b92 docs(lab2): update reviewer.md with peer review team members
| | * f30ab16 feat(lab2): implement playwright e2e tests, multi-viewport validation, and documentation (Issue 6)
| |/  
| *   1f763af Merge pull request #19 from narakosi-dev/feature/lab2-ticket-detail-and-attachments
| |\\  
| | * 2cb1352 feat(lab2): implement ticket detail & attachments lifecycle with soft-removal (Issue 5)
| |/  
| *   7f846d7 Merge pull request #17 from narakosi-dev/feature/lab2-my-tickets
| |\\  
| | * 606217e feat: implement my tickets view, ownership isolation, filtering, and tests
| |/  
| *   722ff04 Merge pull request #14 from narakosi-dev/feature/lab2-ticket-creation
| |\\  
| | * 2a5246c feat: implement ticket creation flow, validation, and automated tests
| * | 08b6279 Merge pull request #12 from narakosi-dev/feature/lab2-requester-context
| |\\| 
| | * 72a7627 feat: implement development requester context, database foundation, and tests
| |/  
| * 0bb81ab Merge pull request #10 from narakosi-dev/docs/lab2-specification
|/| 
| * 018ac03 docs(lab-02): complete specification, ui-spec, api-spec, and test plan
|/  
*   07039ff Merge pull request #9 from narakosi-dev/lab1-staging
          `),

          heading2("1.2 GitHub Projects (Kanban Board) Evidence"),
          p(
            "All 6 Sprint Issues were systematically tracked across Kanban states (Backlog -> Specified -> Started -> PR Review -> Done):"
          ),
          p("• Issue 1: Spec-Driven Development & Test Plan (docs/lab-02/) — Done"),
          p("• Issue 2: Development Requester Context & Seed Foundation — Done"),
          p("• Issue 3: Ticket Creation Flow & Unique Number Generation — Done"),
          p("• Issue 4: My Tickets View, Search, Filtering & Ownership Isolation — Done"),
          p("• Issue 5: Ticket Detail View & Attachments Soft-Removal — Done"),
          p("• Issue 6: Playwright E2E User Journeys, Multi-Viewport Validation & Documentation — Done"),

          heading2("1.3 Rendered Peer Review Record (docs/lab-02/reviewer.md)"),
          p("Author: Nara Kosiyaporn — Student ID: 67070505218 (@narakosi-dev)"),
          p("Peer Reviewers: Pongrit (Frame) (@FramePongrit), @Leviathan-c137"),
          createTable(
            ["PR #", "Branch", "Target", "Scope & Features", "Reviewers", "Verdict"],
            [
              ["#10", "feature/lab2-spec-docs", "lab2-staging", "Issue 1: Spec DD (specification.md, ui-spec, api-spec, tests.md)", "@FramePongrit", "Approved"],
              ["#12", "feature/lab2-requester-context", "lab2-staging", "Issue 2: Dev Requester Context, Prisma Seed, RequesterSelect", "@Leviathan-c137", "Approved"],
              ["#14", "feature/lab2-ticket-creation", "lab2-staging", "Issue 3: POST /api/tickets, unique TKT number, CreateTicket.tsx", "@FramePongrit", "Approved"],
              ["#17", "feature/lab2-my-tickets", "lab2-staging", "Issue 4: My Tickets, Ownership Isolation, Search, Filters, Sorting", "@Leviathan-c137", "Approved"],
              ["#19", "feature/lab2-ticket-detail", "lab2-staging", "Issue 5: Ticket Detail, Multer Upload, Soft-Removal, 410 Gone", "@FramePongrit", "Approved"],
              ["#21", "feature/lab2-e2e-and-docs", "lab2-staging", "Issue 6: Playwright E2E suite, Multi-Viewport, reviewer.md, ai_use.md", "@Leviathan-c137", "Approved"],
              ["#22", "lab2-staging", "main", "Release PR: Merging all 6 sprint increments into main", "@FramePongrit", "Approved"],
            ],
            [8, 22, 14, 34, 12, 10]
          ),

          heading2("1.4 Directory Structure of Repository"),
          ...codeBlock(`
toktickit/
├── .gitignore
├── docker-compose.yml
├── package.json
├── playwright.config.ts
├── README.md
├── artifacts/
│   └── lab-02/
│       └── screenshots/
│           ├── code/              # 9 IDE Code Implementation Screenshots
│           ├── create-ticket/     # 5 UI Screenshots (Requester, Form, 500, TKT#)
│           ├── my-tickets/        # 6 UI Screenshots (Search, Filter, Isolation)
│           ├── ticket-detail/     # 5 UI Screenshots (Read-only, Upload, Soft-remove)
│           └── responsive/        # 4 UI Screenshots (1200px, 800px, 375px)
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.tsx
│   │   │   ├── CreateTicket.tsx
│   │   │   ├── MyTickets.tsx
│   │   │   ├── RequesterSelect.tsx
│   │   │   └── TicketDetail.tsx
│   │   ├── context/RequesterContext.tsx
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── zen-green.css
│   └── tests/
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
          `),

          heading2("1.5 Repository .gitignore Evidence"),
          ...codeBlock(`
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
          `),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // PART 2
          // ==========================================
          heading1("Answer Part 2: Spec DD & Database Architecture (5 Points)"),
          p(
            "Specification Link: https://github.com/narakosi-dev/toktickit/blob/main/docs/lab-02/specification.md"
          ),
          p(
            "Proof of Prior Creation: Created and merged in PR #10 (Commit 018ac03) before feature implementation branches were created."
          ),
          heading2("2.1 Numbered Functional Requirements (FR)"),
          p("• FR-01: Development Requester Selection from active database seeded users."),
          p("• FR-02 & FR-03: Header identity persistence; dynamic requester switching with instant data isolation."),
          p("• FR-04 & FR-05: Create ticket form with Category, System, Priority, Summary, Description, and system-generated unique TKT-YYYY-NNNNNN with initial status New."),
          p("• FR-06: Form resilience against backend failures; preserves entered values without data loss."),
          p("• FR-07 to FR-09: My Tickets filtered strictly by requesterId, keyword search, filters, sorting, and pagination."),
          p("• FR-10: Read-only Ticket Detail view."),
          p("• FR-11 to FR-13: Attachment upload (JPG, PNG, WEBP, PDF up to 5MB, max 5 active), active file download, and soft-removal with mandatory reason and 410 Gone download protection."),
          p("• FR-14: Cross-requester access rejection (HTTP 404/403) preventing resource enumeration."),

          heading2("2.2 Mandatory Business Rules (BR)"),
          p("• BR-01: Unique official Ticket Number format TKT-YYYY-XXXXXX generated by backend."),
          p("• BR-02: Initial Status begins as New."),
          p("• BR-03 & BR-04: Dev Requester Context is a testing harness; inactive requesters (active: false) are excluded from selection."),
          p("• BR-05: Strict ownership isolation; queries and endpoints verify requester ownership."),
          p("• BR-06 & BR-07: Max 5 active attachments per ticket; soft-removal records active: false, timestamp, and audit reason while preserving file on disk."),
          p("• BR-08: Field lengths: Summary (5–120 chars), Description (10–2000 chars), Removal Reason (5–500 chars)."),

          heading2("2.3 Code Architecture: Prisma Schema (server/prisma/schema.prisma)"),
          p(
            "The data model defines strict relational integrity with foreign keys, indexes, and soft-removal audit fields:"
          ),
          ...embedImage("code/01-code-prisma-schema.png", 500, 489),
          caption("Code Figure 1: Prisma Schema showing Requester, RelatedSystem, Ticket, and Attachment with soft-removal fields."),
          p("Key Data Architecture Highlights:"),
          p("• Requester Model: Includes boolean 'active' field so inactive test accounts can be preserved in the database but filtered out from UI selection (BR-04)."),
          p("• Ticket Model: Enforces unique 'ticketNumber', relates to Requester and Category, and defaults status to 'New' (BR-02)."),
          p("• Attachment Model: Soft-removal is supported via 'active Boolean @default(true)', 'removalReason String?', and 'removedAt DateTime?' to retain files for security audits while preventing end-user downloads (BR-06, BR-07)."),

          heading2("2.4 Code Architecture: Database Seed (server/prisma/seed.ts)"),
          p(
            "The database seed script sets up predictable reference data and user personas for consistent testing:"
          ),
          ...embedImage("code/02-code-prisma-seed.png", 540, 305),
          caption("Code Figure 2: Prisma Seed script establishing Primary Requester (Nara Kosiyaporn), Secondary Requester (Sunny farmhouse), and inactive accounts."),
          p("Seed Data Configuration:"),
          p("• Primary Requester: Nara Kosiyaporn (nara.kosi@kmutt.ac.th) — active: true."),
          p("• Secondary Requester: Sunny farmhouse (nara2012sun@gmail.com) — active: true."),
          p("• Inactive Requester: Inactive Tester (inactive.tester@example.com) — active: false (verifies exclusion)."),
          p("• 4 Categories (Account and Access, Hardware, Software, Network) and 6 Related Systems."),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // PART 3
          // ==========================================
          heading1("Answer Part 3: Test DD, Traceability & E2E Validation (10 Points)"),
          p(
            "Test Plan Link: https://github.com/narakosi-dev/toktickit/blob/main/docs/lab-02/tests.md"
          ),
          heading2("3.1 Test Traceability Matrix"),
          createTable(
            ["Test ID", "Type", "AC Target", "Scope", "Automated Test File Path", "Status"],
            [
              ["API-01", "API", "AC-04, BR-01", "Ticket creation & unique number generation", "server/tests/lab-02/create-ticket.test.ts", "Pass"],
              ["API-02", "API", "AC-04, BR-08", "Validation boundaries (summary & description)", "server/tests/lab-02/create-ticket.test.ts", "Pass"],
              ["API-03", "API", "AC-03, BR-05", "My Tickets ownership isolation (requesterId)", "server/tests/lab-02/my-tickets.test.ts", "Pass"],
              ["API-04", "API", "AC-07, BR-08", "My Tickets search, filters, sorting & pagination", "server/tests/lab-02/my-tickets.test.ts", "Pass"],
              ["API-05", "API", "AC-08, BR-05", "Ticket Detail ownership & 404 on unowned ticket", "server/tests/lab-02/ticket-detail.test.ts", "Pass"],
              ["API-06", "API", "AC-09, BR-06", "Attachment upload (types, 5MB limit, max 5)", "server/tests/lab-02/attachments.test.ts", "Pass"],
              ["API-07", "API", "AC-10, BR-07", "Soft-removal audit reason & 410 Gone download", "server/tests/lab-02/attachments.test.ts", "Pass"],
              ["UI-01", "UI", "AC-02, BR-04", "Requester dropdown & inactive user exclusion", "client/tests/lab-02/RequesterSelect.test.tsx", "Pass"],
              ["UI-02", "UI", "AC-03", "Header identity display & switch user action", "client/tests/lab-02/AppShell.test.tsx", "Pass"],
              ["UI-03", "UI", "AC-04", "Create Ticket form rendering & loaded dropdowns", "client/tests/lab-02/CreateTicket.test.tsx", "Pass"],
              ["UI-04", "UI", "AC-05, BR-08", "Client-side validation messages on invalid submit", "client/tests/lab-02/CreateTicket.test.tsx", "Pass"],
              ["UI-05", "UI", "AC-06", "Error banner shown & inputs preserved on 500 error", "client/tests/lab-02/CreateTicket.test.tsx", "Pass"],
              ["UI-06", "UI", "AC-07", "My Tickets table, status badges & empty state", "client/tests/lab-02/MyTickets.test.tsx", "Pass"],
              ["UI-07", "UI", "AC-09, AC-10", "Ticket Detail view, upload UI & soft-remove modal", "client/tests/lab-02/TicketDetail.test.tsx", "Pass"],
              ["E2E-01", "E2E", "Full Journey", "End-to-end user journey & multi-viewport layout", "e2e/lab-02/requester-ticket-flow.spec.ts", "Pass"],
            ],
            [10, 8, 14, 30, 30, 8]
          ),

          heading2("3.2 Code Architecture: Playwright E2E Test Suite (e2e/lab-02/requester-ticket-flow.spec.ts)"),
          p(
            "The automated Playwright E2E suite verifies complete end-to-end user workflows and responsive behavior:"
          ),
          ...embedImage("code/09-code-e2e-playwright.png", 540, 354),
          caption("Code Figure 3: Playwright E2E automated test verifying requester journey, responsive viewports, and zero horizontal scroll."),
          p("Automated E2E Assertions:"),
          p("• Full Requester Journey: Selects Nara Kosiyaporn -> Creates Ticket -> Checks Form Validation -> Submits Ticket -> Verifies in My Tickets -> Views Details -> Uploads Attachment -> Soft-Removes with Reason."),
          p("• Multi-Viewport Assertions: Automatically iterates over Desktop (1280x720), Tablet (800x1024), and Mobile (375x667)."),
          p("• Zero Horizontal Overflow: Verifies 'document.documentElement.scrollWidth <= clientWidth' at 375px mobile viewport."),

          heading2("3.3 Passing Test Output from main Branch"),
          ...codeBlock(`
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
          `),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // PART 4
          // ==========================================
          heading1("Answer Part 4: AI Use with Reflection (5 Points)"),
          p(
            "AI Record Link: https://github.com/narakosi-dev/toktickit/blob/main/docs/lab-02/ai_use.md"
          ),
          p(
            "AI Tool Used: Google Antigravity AI Agent (DeepMind Advanced Coding Engine)."
          ),
          heading2("4.1 Selected Key Prompts Table"),
          createTable(
            ["#", "Prompt Summary", "Engineering Outcome"],
            [
              ["1", "Analyze Lab 2 stakeholder requirements and generate engineering specifications covering Spec DD, UI Spec, API Spec, and Test DD.", "Produced complete specification documents adhering to Zen Green and acceptance criteria before writing code."],
              ["2", "Design Prisma schema migrations adding Requester, RelatedSystem, Ticket, and Attachment models with relationships, indexes, and seed data.", "Established relational foundation with idempotent seed data including active/inactive users."],
              ["3", "Implement Development Requester context in React with persistent state, header identity bar, and user-picker modal.", "Created RequesterSelect.tsx and AppShell.tsx enabling multi-user testing harness."],
              ["4", "Create ticket creation endpoint POST /api/tickets with input validation, transaction-safe unique ticket number generation, and tests.", "Implemented concurrent-safe ticket counter with TKT-YYYY-NNNNNN format."],
              ["5", "Implement My Tickets screen with ownership isolation, search, category/priority/status filters, pagination, and responsive cards.", "Built robust ticket list filtering strictly by requesterId with empty and no-results states."],
              ["6", "Build Ticket Detail view and attachment management with Multer disk uploads, 5MB limit, and soft-removal audit reason.", "Implemented attachment lifecycle with 410 Gone download protection on removed files."],
              ["7", "Write automated Playwright E2E test verifying complete requester flow across Desktop, Tablet, and Mobile viewports.", "Created end-to-end automated test suite verifying user flows and responsiveness."],
              ["8", "Generate GitHub Pull Request templates, peer-review comments, and Definition of Done checklists for partner collaboration.", "Facilitated smooth code reviews with @FramePongrit and @Leviathan-c137."],
            ],
            [6, 44, 50]
          ),
          heading2("4.2 My Reflection"),
          p(
            "Working with an AI coding agent fundamentally shifted development from manual syntax writing to high-level engineering orchestration, specification rigor, and verification. By defining clear business rules, exact error boundary expectations (e.g. 404 for unowned tickets and 410 for soft-removed attachments), and concrete acceptance criteria up front, the AI assistant generated production-ready code with comprehensive test coverage. The human engineer remained responsible for architectural trade-offs, test execution against real databases, and visual responsive layout inspection."
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // PART 5 & 6
          // ==========================================
          heading1("Answer Part 5 & 6: Development Requester & Working Ticket Screen: Create Mode (10 Points)"),
          p(
            "Demonstrates the Development Requester selection screen, dynamic reference data loading, field-level validations, API failure resilience, and successful ticket creation with unique ticket number generation."
          ),

          heading2("Figure 1: Development Requester Selection Screen"),
          ...embedImage("create-ticket/01-dev-requester-select.png", 540, 340),
          caption(
            "Figure 1: Development Requester selection dropdown displaying active user 'Nara Kosiyaporn (nara.kosi@kmutt.ac.th)'."
          ),

          heading2("Figure 2: Create Ticket Screen (Desktop Viewport)"),
          ...embedImage("create-ticket/02-create-ticket-initial-desktop.png", 540, 340),
          caption(
            "Figure 2: Create Ticket screen on desktop viewport showing category, related system, priority dropdowns, and user identity 'Nara Kosiyaporn' in header."
          ),

          heading2("Figure 3: Client-Side Validation Error States"),
          ...embedImage("create-ticket/03-create-ticket-validation-errors.png", 540, 340),
          caption(
            "Figure 3: Field-level validation messages shown immediately below required fields upon submitting an empty form."
          ),

          heading2("Figure 4: API Failure Resilience (Form Values Preserved)"),
          ...embedImage("create-ticket/04-create-ticket-api-failure-preserved.png", 540, 340),
          caption(
            "Figure 4: Error banner displayed when backend returns 500; entered Summary and Description are fully preserved without data loss."
          ),

          heading2("Figure 5: Successful Ticket Creation Dialog & Official Ticket Number"),
          ...embedImage("create-ticket/05-create-ticket-success-official-number.png", 540, 340),
          caption(
            "Figure 5: Confirmation view displaying official generated Ticket Number (TKT-2026-000072), initial status 'New', and action buttons."
          ),

          heading2("6.1 Code Architecture: Frontend Requester Context (client/src/context/RequesterContext.tsx)"),
          p(
            "The React Requester Context acts as the dev harness, persisting the active identity in localStorage across page refreshes:"
          ),
          ...embedImage("code/06-code-frontend-requester-context.png", 540, 292),
          caption("Code Figure 4: React Context managing selected development requester with localStorage persistence."),

          heading2("6.2 Code Architecture: Backend Ticket Creation & Unique Number (server/src/app.ts)"),
          p(
            "The POST /api/tickets endpoint handles validation and transactional ticket number generation:"
          ),
          ...embedImage("code/03-code-api-ticket-creation.png", 500, 500),
          caption("Code Figure 5: POST /api/tickets implementation with TKT-YYYY-NNNNNN generation and boundary validation."),
          p("Implementation Details:"),
          p("• Ticket Number Format: 'TKT-YYYY-NNNNNN' (e.g. TKT-2026-000072) generated using the current year and 6-digit zero-padded sequence (BR-01)."),
          p("• Boundary Validation: Rejects summaries under 5 or over 120 chars; rejects descriptions under 10 or over 2000 chars (BR-08)."),
          p("• Default Status: Set to 'New' upon creation (BR-02)."),

          heading2("6.3 Code Architecture: Frontend Ticket Creation Form (client/src/components/CreateTicket.tsx)"),
          p(
            "CreateTicket.tsx implements field-level validation and 500 API failure resilience:"
          ),
          ...embedImage("code/07-code-frontend-create-ticket.png", 540, 420),
          caption("Code Figure 6: CreateTicket.tsx form submission, client-side validation, and error-resilience state preservation."),
          p("Key Resilience Feature: When an HTTP 500 error occurs, entered form state is preserved completely, and an error banner is displayed without clearing fields, preventing frustrating data loss (FR-06, AC-06)."),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // PART 7
          // ==========================================
          heading1("Answer Part 7: Working My Tickets Screen & Ownership Isolation (10 Points)"),
          p(
            "Demonstrates ticket list retrieval, real-time keyword search, category filtering, priority filtering, empty states, and strict ownership isolation when switching requesters."
          ),

          heading2("Figure 6: My Tickets List for Primary Requester (Nara Kosiyaporn)"),
          ...embedImage("my-tickets/06-my-tickets-requester-a.png", 540, 340),
          caption(
            "Figure 6: My Tickets table displaying submitted tickets owned strictly by Nara Kosiyaporn."
          ),

          heading2("Figure 7: Filter by Category"),
          ...embedImage("my-tickets/07-my-tickets-filter-category.png", 540, 340),
          caption(
            "Figure 7: Table dynamically filtered by Category."
          ),

          heading2("Figure 8: Filter by Priority (High)"),
          ...embedImage("my-tickets/08-my-tickets-filter-priority.png", 540, 340),
          caption(
            "Figure 8: Table dynamically filtered by Priority 'High'."
          ),

          heading2("Figure 9: Real-Time Search by Keyword"),
          ...embedImage("my-tickets/09-my-tickets-search.png", 540, 340),
          caption(
            "Figure 9: Real-time search matching summary keyword 'MacBook'."
          ),

          heading2("Figure 10: No Matching Results State"),
          ...embedImage("my-tickets/10-my-tickets-no-results-state.png", 540, 340),
          caption(
            "Figure 10: Clear no-results state with 'Clear Filters' button when search keyword has zero matches."
          ),

          heading2("Figure 11: Requester Data Isolation (Switch to Requester B: Sunny farmhouse)"),
          ...embedImage("my-tickets/16-my-tickets-requester-b-isolation.png", 540, 340),
          caption(
            "Figure 11: Switched to Sunny farmhouse (nara2012sun@gmail.com); Nara Kosiyaporn's tickets are completely hidden, displaying empty state 'No Tickets Yet'."
          ),

          heading2("7.1 Code Architecture: Backend Ownership Isolation (server/src/app.ts)"),
          p(
            "The GET /api/tickets endpoint enforces strict requesterId scoping and multi-parameter filtering:"
          ),
          ...embedImage("code/04-code-api-ownership-isolation.png", 540, 373),
          caption("Code Figure 7: GET /api/tickets showing mandatory requesterId scoping, keyword search, filters, and pagination."),
          p("Ownership & Isolation Enforcement:"),
          p("• Ownership Scoping: Queries strictly enforce 'where: { requesterId: req.query.requesterId }'. A user cannot view any tickets created by other requesters (BR-05)."),
          p("• Multi-field Keyword Search: Performs case-insensitive matching across summary, description, and ticketNumber."),
          p("• Pagination: Implements skip/take logic returning total count, page, and limit."),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // PART 8
          // ==========================================
          heading1("Answer Part 8: Working Ticket Screen: View Mode and Attachments (5 Points)"),
          p(
            "Demonstrates read-only ticket details, attachment format validation, active upload counter, soft-removal modal with mandatory audit reason, and download prevention."
          ),

          heading2("Figure 12: Ticket Detail View"),
          ...embedImage("ticket-detail/11-ticket-detail-view.png", 540, 340),
          caption(
            "Figure 12: Read-only Ticket Detail view showing Ticket Number, Status, Category, Related System, Requester 'Nara Kosiyaporn', and Contact Email 'nara.kosi@kmutt.ac.th'."
          ),

          heading2("Figure 13: Unsupported Attachment Format Rejection"),
          ...embedImage("ticket-detail/12-ticket-detail-invalid-attachment.png", 540, 340),
          caption(
            "Figure 13: Selecting an unsupported .txt file triggers client-side validation error message."
          ),

          heading2("Figure 14: Valid Attachment Uploaded (Active Count Updated)"),
          ...embedImage("ticket-detail/13-ticket-detail-valid-attachment-uploaded.png", 540, 340),
          caption(
            "Figure 14: Uploading valid PNG screenshot updates active counter to '1 / 5 active attachments' and enables Download and Remove buttons."
          ),

          heading2("Figure 15: Soft-Removal Modal with Mandatory Audit Reason"),
          ...embedImage("ticket-detail/14-ticket-detail-soft-remove-modal.png", 540, 340),
          caption(
            "Figure 15: Soft-removal modal prompting for audit reason (minimum 5 characters)."
          ),

          heading2("Figure 16: Soft-Removed State (Audit Quote Displayed, Download Disabled)"),
          ...embedImage("ticket-detail/15-ticket-detail-soft-removed-state.png", 540, 340),
          caption(
            "Figure 16: Attachment displays 'Removed' badge, shows audit reason quote and timestamp; download button is disabled with 'Download unavailable' and 410 Gone backend protection."
          ),

          heading2("8.1 Code Architecture: Attachment Lifecycle & 410 Gone (server/src/app.ts)"),
          p(
            "Attachment endpoints handle Multer 5MB limits, soft-removal audit stamping, and 410 Gone download protection:"
          ),
          ...embedImage("code/05-code-api-attachments-soft-removal.png", 540, 420),
          caption("Code Figure 8: Attachment lifecycle implementation: 5MB upload limit, soft-removal PATCH, and 410 Gone download response."),
          p("Attachment Security & Compliance Highlights:"),
          p("• Multer Disk Storage & Limits: Enforces 5MB max file size and strictly whitelists image/jpeg, image/png, image/webp, application/pdf."),
          p("• Active Limit (5): Rejects uploads if active count >= 5 (BR-06)."),
          p("• Soft-Removal PATCH: Updates record with 'active: false', 'removalReason' (min 5 chars), and 'removedAt: new Date()' while preserving physical file for compliance audit (BR-07)."),
          p("• 410 Gone Protection: If a user attempts to download an inactive attachment, the server returns HTTP 410 Gone with error message 'Attachment has been removed' (FR-13)."),

          heading2("8.2 Code Architecture: Frontend Soft-Removal Dialog (client/src/components/TicketDetail.tsx)"),
          p(
            "TicketDetail.tsx renders the soft-removal modal requiring an audit reason before executing the PATCH request:"
          ),
          ...embedImage("code/08-code-frontend-ticket-detail.png", 540, 228),
          caption("Code Figure 9: TicketDetail.tsx soft-removal modal dialog requiring minimum 5-character audit reason."),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // PART 9
          // ==========================================
          heading1("Answer Part 9: Zen Green UI and Responsive Evidence (5 Points)"),
          p(
            "UI Specification Link: https://github.com/narakosi-dev/toktickit/blob/main/docs/lab-02/ui-spec.md"
          ),
          p(
            "Validates the Zen Green Design System tokens (#006B3C primary, #0B7A46 secondary, #EAF6EF pale, #F5F7F6 canvas) and responsive layout across Desktop (1200px), Tablet (800px), and Mobile (375px) with zero horizontal overflow."
          ),

          heading2("Figure 17: Desktop Viewport (1200px Wide)"),
          ...embedImage("responsive/17-responsive-desktop-1200px.png", 540, 340),
          caption("Figure 17: Desktop two-column form layout and wide navbar."),

          heading2("Figure 18: Tablet Viewport (800px Wide)"),
          ...embedImage("responsive/18-responsive-tablet-800px.png", 420, 520),
          caption("Figure 18: Tablet adaptive layout with touch-friendly controls."),

          heading2("Figure 19: Mobile Viewport (375px Wide) — Create Ticket"),
          ...embedImage("responsive/19-responsive-mobile-375px.png", 280, 480),
          caption("Figure 19: Mobile portrait layout with vertically stacked form controls and zero horizontal overflow."),

          heading2("Figure 20: Mobile Viewport (375px Wide) — My Tickets Cards"),
          ...embedImage("responsive/20-responsive-mobile-my-tickets-375px.png", 280, 480),
          caption("Figure 20: Mobile view of My Tickets converting table rows into responsive ticket cards."),

          heading2("9.2 Completed Visual Checklist"),
          createTable(
            ["Visual Criteria", "Implementation & Verification Details", "Status"],
            [
              ["Color Tokens", "#006B3C (Primary), #0B7A46 (Secondary), #EAF6EF (Pale), #F5F7F6 (Canvas)", "Pass"],
              ["Editable vs Read-Only", "White background for editable inputs; #F0F5F2 for read-only system date & ticket number", "Pass"],
              ["Validation Placement", "Error messages appear directly underneath the corresponding input in dark red (#B02A37)", "Pass"],
              ["Button Hierarchy", "Primary (btn-zen-primary), Secondary (btn-zen-secondary), Destructive (btn-danger)", "Pass"],
              ["No Clipping / Overlap", "Zero text truncation, zero overlapping buttons, and flex-wrapping header items", "Pass"],
              ["Horizontal Scrolling", "Tested at 375px width via Playwright; scrollWidth <= clientWidth with zero horizontal overflow", "Pass"],
            ],
            [25, 65, 10]
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // SUMMARY / APPENDIX: CODE ADDITIONS
          // ==========================================
          heading1("Summary: Complete Lab 2 Code Additions Inventory"),
          p(
            "Below is the complete inventory of all files added or enhanced during the Lab 2 Sprint:"
          ),
          createTable(
            ["Layer / Path", "Component / Module", "Issue #", "Key Additions & Capabilities"],
            [
              ["server/prisma/schema.prisma", "Prisma ORM", "Issue 2 & 5", "Added Requester (active), RelatedSystem, Ticket (ticketNumber, status: New), and Attachment (active, removalReason, removedAt)."],
              ["server/prisma/seed.ts", "Database Seed", "Issue 2", "Populated Nara Kosiyaporn (primary), Sunny farmhouse (secondary), active/inactive testers, 4 categories, and 6 related systems."],
              ["server/src/app.ts", "Express REST API", "Issues 2, 3, 4, 5", "Added POST /api/tickets (TKT-YYYY-NNNNNN), GET /api/tickets (scoped by requesterId), GET /api/tickets/:id, POST attachments (Multer 5MB, limit 5), PATCH soft-removal, and 410 Gone download."],
              ["client/src/context/RequesterContext.tsx", "React Context", "Issue 2", "Created development requester context, localStorage persistence, and multi-user switcher modal."],
              ["client/src/components/CreateTicket.tsx", "React Component", "Issue 3", "Built ticket creation form, field validations, 500 error state preservation, and success dialog with official ticket number."],
              ["client/src/components/MyTickets.tsx", "React Component", "Issue 4", "Implemented ticket list, real-time keyword search, category/priority/status filters, pagination, and mobile card transforms."],
              ["client/src/components/TicketDetail.tsx", "React Component", "Issue 5", "Developed read-only detail view, attachment upload dropzone, 5-attachment counter, and soft-removal modal with audit reason."],
              ["client/src/zen-green.css", "Design System CSS", "Issue 1 & 6", "Implemented Zen Green design tokens, responsive breakpoints (1200px, 800px, 375px), badges, and zero horizontal scroll."],
              ["e2e/lab-02/requester-ticket-flow.spec.ts", "Playwright E2E", "Issue 6", "Automated full requester journey assertions and responsive viewport layout verification."],
            ],
            [25, 18, 12, 45]
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`Document successfully generated at: ${OUTPUT_PATH}`);
}

generateDocx().catch((err) => {
  console.error("Error generating docx:", err);
  process.exit(1);
});
