import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_DIR = process.cwd();
const CODE_SCREENSHOTS_DIR = path.join(BASE_DIR, "artifacts/lab-02/screenshots/code");

if (!fs.existsSync(CODE_SCREENSHOTS_DIR)) {
  fs.mkdirSync(CODE_SCREENSHOTS_DIR, { recursive: true });
}

// Code snippets to capture
const CODE_SNIPPETS = [
  {
    file: "01-code-prisma-schema.png",
    title: "server/prisma/schema.prisma (Database Models & Relationships)",
    language: "prisma",
    code: `// Ticket Model with Category, RelatedSystem, Requester & Attachments
model Ticket {
  id                Int           @id @default(autoincrement())
  ticketNumber      String        @unique
  summary           String
  description       String
  priority          String        @default("Medium")
  status            String        @default("New")
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  requesterId       Int
  requester         Requester     @relation(fields: [requesterId], references: [id])
  categoryId        Int
  category          Category      @relation(fields: [categoryId], references: [id])
  relatedSystemId   Int
  relatedSystem     RelatedSystem @relation(fields: [relatedSystemId], references: [id])
  attachments       Attachment[]

  @@index([requesterId])
  @@index([categoryId])
  @@index([status])
}

// Attachment Model with Soft-Removal Fields & Audit Trail
model Attachment {
  id             Int       @id @default(autoincrement())
  ticketId       Int
  ticket         Ticket    @relation(fields: [ticketId], references: [id])
  filename       String
  originalName   String
  mimeType       String
  size           Int
  active         Boolean   @default(true)
  removalReason  String?
  removedAt      DateTime?
  createdAt      DateTime  @default(now())

  @@index([ticketId])
}`,
  },
  {
    file: "02-code-prisma-seed.png",
    title: "server/prisma/seed.ts (Idempotent Database Seed Foundation)",
    language: "typescript",
    code: `// Seed Categories, Related Systems, and Custom Development Requesters
async function main() {
  // 1. Categories
  for (const name of ["Account and Access", "Hardware", "Software", "Network"]) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 2. Related Systems (>= 6 systems)
  for (const name of ["Email", "Campus Wi-Fi", "VPN", "LEB2 App", "Grade Submission App", "Printer", "Corporate Laptop"]) {
    await prisma.relatedSystem.upsert({ where: { name }, update: { active: true }, create: { name, active: true } });
  }

  // 3. Development Requesters (Nara Kosiyaporn & Sunny farmhouse)
  const requesters = [
    { name: "Nara Kosiyaporn", email: "nara.kosi@kmutt.ac.th", active: true },
    { name: "Sunny farmhouse", email: "nara2012sun@gmail.com", active: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", active: true },
    { name: "Inactive Tester", email: "inactive.tester@example.com", active: false },
  ];

  for (const r of requesters) {
    await prisma.requester.upsert({ where: { email: r.email }, update: { name: r.name, active: r.active }, create: r });
  }
}`,
  },
  {
    file: "03-code-api-ticket-creation.png",
    title: "server/src/app.ts (POST /api/tickets — Creation & Unique TKT Generation)",
    language: "typescript",
    code: `// POST /api/tickets: Create Ticket with Unique TKT-YYYY-NNNNNN
app.post("/api/tickets", async (req: Request, res: Response) => {
  const { requesterId, categoryId, relatedSystemId, summary, description, priority } = req.body;

  // Validation: Required fields and character limits (BR-08)
  if (!summary || summary.trim().length < 5 || summary.trim().length > 120) {
    return res.status(400).json({ error: "Summary must be 5-120 characters" });
  }
  if (!description || description.trim().length < 10 || description.trim().length > 2000) {
    return res.status(400).json({ error: "Description must be 10-2000 characters" });
  }

  const currentYear = new Date().getFullYear();
  let ticket = null;
  let attempts = 0;

  // Concurrency-safe unique ticket number generation
  while (!ticket && attempts < 5) {
    attempts++;
    const count = await prisma.ticket.count();
    const ticketNumber = \`TKT-\${currentYear}-\${String(count + attempts).padStart(6, "0")}\`;
    try {
      ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          requesterId: Number(requesterId),
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          summary: summary.trim(),
          description: description.trim(),
          priority: priority || "Medium",
          status: "New", // Initial Status: New (BR-02)
        },
      });
    } catch (err: any) {
      if (err.code !== "P2002") throw err; // Retry on unique collision
    }
  }
  res.status(201).json(ticket);
});`,
  },
  {
    file: "04-code-api-ownership-isolation.png",
    title: "server/src/app.ts (GET /api/tickets — Ownership Isolation & Querying)",
    language: "typescript",
    code: `// GET /api/tickets: Paginated list filtered strictly by requesterId (BR-05)
app.get("/api/tickets", async (req: Request, res: Response) => {
  const { requesterId, search, categoryId, priority, status, page = "1", limit = "10", sortBy = "createdAt", order = "desc" } = req.query;

  if (!requesterId) {
    return res.status(400).json({ error: "requesterId is required" });
  }

  // Strict ownership barrier: Only tickets belonging to the requester
  const where: any = { requesterId: Number(requesterId) };

  if (categoryId) where.categoryId = Number(categoryId);
  if (priority) where.priority = String(priority);
  if (status) where.status = String(status);
  if (search) {
    where.OR = [
      { ticketNumber: { contains: String(search), mode: "insensitive" } },
      { summary: { contains: String(search), mode: "insensitive" } },
    ];
  }

  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      include: { category: true, relatedSystem: true },
      orderBy: { [String(sortBy)]: String(order).toLowerCase() },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
  ]);

  res.json({ tickets, pagination: { total, page: Number(page), limit: Number(limit) } });
});`,
  },
  {
    file: "05-code-api-attachments-soft-removal.png",
    title: "server/src/app.ts (Attachment Upload, Download & Soft-Removal)",
    language: "typescript",
    code: `// Multer Configuration: 5MB Limit, Permitted MIME Types
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (_req, file, cb) => cb(null, \`\${uuidv4()}\${path.extname(file.originalname)}\`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB (BR-06)
});

// GET /api/attachments/:id/download — 410 Gone for soft-removed files
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  const att = await prisma.attachment.findUnique({ where: { id: Number(req.params.id) }, include: { ticket: true } });
  if (!att || att.ticket.requesterId !== Number(req.query.requesterId)) {
    return res.status(404).json({ error: "Not found or unauthorized" });
  }
  if (!att.active) {
    return res.status(410).json({ error: "Attachment removed; download blocked" }); // BR-07
  }
  res.download(path.join("uploads", att.filename), att.originalName);
});

// PATCH /api/attachments/:id/remove — Soft removal with audit reason
app.patch("/api/attachments/:id/remove", async (req: Request, res: Response) => {
  const { requesterId, removalReason } = req.body;
  if (!removalReason || removalReason.trim().length < 5) {
    return res.status(400).json({ error: "Removal reason must be >= 5 chars" });
  }
  const updated = await prisma.attachment.update({
    where: { id: Number(req.params.id) },
    data: { active: false, removalReason: removalReason.trim(), removedAt: new Date() },
  });
  res.json(updated);
});`,
  },
  {
    file: "06-code-frontend-requester-context.png",
    title: "client/src/context/RequesterContext.tsx (Global Identity Context)",
    language: "typescript",
    code: `// React Context managing active development requester with localStorage persistence
interface RequesterContextType {
  requester: Requester | null;
  setRequester: (r: Requester | null) => void;
  openPicker: () => void;
  closePicker: () => void;
  isPickerOpen: boolean;
}

export function RequesterProvider({ children }: { children: React.ReactNode }) {
  const [requester, setRequesterState] = useState<Requester | null>(() => {
    const saved = localStorage.getItem("toktickit_requester");
    return saved ? JSON.parse(saved) : null;
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  function setRequester(r: Requester | null) {
    setRequesterState(r);
    if (r) {
      localStorage.setItem("toktickit_requester", JSON.stringify(r));
    } else {
      localStorage.removeItem("toktickit_requester");
    }
  }

  return (
    <RequesterContext.Provider value={{ requester, setRequester, isPickerOpen, openPicker: () => setIsPickerOpen(true), closePicker: () => setIsPickerOpen(false) }}>
      {children}
    </RequesterContext.Provider>
  );
}`,
  },
  {
    file: "07-code-frontend-create-ticket.png",
    title: "client/src/components/CreateTicket.tsx (Form Validation & Resilience)",
    language: "typescript",
    code: `// Client-Side Validation & Form Resilience on 500 Error
function validate(): FormErrors {
  const errs: FormErrors = {};
  if (!categoryId) errs.categoryId = "Category is required";
  if (!relatedSystemId) errs.relatedSystemId = "Related System is required";
  if (!priority) errs.priority = "Priority is required";
  if (!summary.trim() || summary.trim().length < 5) errs.summary = "Summary must be at least 5 characters";
  if (!description.trim() || description.trim().length < 10) errs.description = "Description must be at least 10 characters";
  return errs;
}

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const validationErrors = validate();
  setErrors(validationErrors);
  if (Object.keys(validationErrors).length > 0) return;

  setSubmitState("submitting");
  try {
    const ticket = await createTicket({
      requesterId: requester.id,
      categoryId: Number(categoryId),
      relatedSystemId: Number(relatedSystemId),
      priority,
      summary: summary.trim(),
      description: description.trim(),
    });
    setCreatedTicket(ticket);
    setSubmitState("success");
  } catch (err: any) {
    // AC-06: Error resilience — Preserves summary and description inputs
    setServerError(err.message || "An unexpected error occurred");
    setSubmitState("error");
  }
}`,
  },
  {
    file: "08-code-frontend-ticket-detail.png",
    title: "client/src/components/TicketDetail.tsx (Soft-Removal Modal Dialog)",
    language: "typescript",
    code: `// Attachment Soft-Removal Handler & Confirmation Modal
async function handleConfirmRemoval() {
  if (!requester || !targetAttachment) return;
  const trimmed = removalReason.trim();
  if (trimmed.length < 5) {
    setRemovalError("Removal reason must be at least 5 characters.");
    return;
  }

  setRemoving(true);
  try {
    const updated = await removeAttachment(targetAttachment.id, requester.id, trimmed);
    setTicket((prev) => ({
      ...prev!,
      attachments: prev!.attachments.map((a) => (a.id === updated.id ? { ...a, active: false, removalReason: updated.removalReason, removedAt: updated.removedAt } : a)),
    }));
    setTargetAttachment(null); // Close modal
    setRemovalReason("");
  } catch (err: any) {
    setRemovalError(err.message || "Failed to remove attachment");
  } finally {
    setRemoving(false);
  }
}`,
  },
  {
    file: "09-code-e2e-playwright.png",
    title: "e2e/lab-02/requester-ticket-flow.spec.ts (Full Playwright User Journey)",
    language: "typescript",
    code: `// Automated End-to-End Test Suite for Sprint 2 (E2E-01)
test("E2E-01: complete requester journey with ticket creation, detail, attachments, and isolation", async ({ page }) => {
  // 1. Select Development Requester
  await page.goto("http://localhost:5173");
  await page.selectOption("#requester-select", { label: "Nara Kosiyaporn (nara.kosi@kmutt.ac.th)" });
  await page.getByRole("button", { name: /Continue/i }).click();

  // 2. Fill & Submit Create Ticket Form
  await page.getByRole("button", { name: /Create Ticket/i }).click();
  await page.selectOption("#category", { index: 1 });
  await page.selectOption("#relatedSystem", { index: 1 });
  await page.selectOption("#priority", "High");
  await page.fill("#summary", "MacBook Pro M3 battery drains abnormally fast");
  await page.fill("#description", "Battery drops from 100% to 15% in less than 45 minutes while running apps.");
  await page.getByRole("button", { name: /Submit Ticket/i }).click();

  // 3. Verify Generated Ticket Number & Table Visibility
  await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();
  const ticketNumber = (await page.getByTestId("created-ticket-number").textContent())!.trim();
  expect(ticketNumber).toMatch(/^TKT-\\d{4}-\\d{6}$/);

  // 4. Test Soft-Removal and Ownership Isolation
  await page.getByText(ticketNumber).first().click();
  await page.getByRole("button", { name: /Remove/i }).click();
  await page.locator("#removal-reason-input").fill("Replaced by updated screenshot");
  await page.getByRole("button", { name: "Confirm Removal" }).click();
  await expect(page.getByText("Removed")).toBeVisible();
});`,
  },
];

function generateHtml(title, code) {
  // Escape HTML
  const escapedCode = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escapedCode.split("\n");
  const numberedLines = lines
    .map(
      (line, i) =>
        `<tr><td class="line-no">${i + 1}</td><td class="code-line">${line || " "}</td></tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #1e1e1e;
      font-family: Consolas, "Courier New", monospace;
      padding: 24px;
      display: inline-block;
      min-width: 900px;
    }
    .window-card {
      background-color: #1e1e1e;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 1px solid #333333;
      overflow: hidden;
    }
    .title-bar {
      background-color: #252526;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #333333;
    }
    .mac-dots {
      display: flex;
      gap: 6px;
      margin-right: 16px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .dot-red { background-color: #ff5f56; }
    .dot-yellow { background-color: #ffbd2e; }
    .dot-green { background-color: #27c93f; }
    .title-text {
      color: #cccccc;
      font-size: 13px;
      font-weight: bold;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .code-container {
      padding: 16px 20px;
      font-size: 13px;
      line-height: 1.5;
      color: #d4d4d4;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .line-no {
      color: #858585;
      text-align: right;
      padding-right: 16px;
      user-select: none;
      vertical-align: top;
      width: 35px;
    }
    .code-line {
      white-space: pre;
      color: #9cdcfe;
    }
  </style>
</head>
<body>
  <div class="window-card">
    <div class="title-bar">
      <div class="mac-dots">
        <div class="dot dot-red"></div>
        <div class="dot dot-yellow"></div>
        <div class="dot dot-green"></div>
      </div>
      <div class="title-text">${title}</div>
    </div>
    <div class="code-container">
      <table>
        ${numberedLines}
      </table>
    </div>
  </div>
</body>
</html>
  `;
}

async function captureCodeScreenshots() {
  console.log("Launching Chromium to capture code screenshots...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const snippet of CODE_SNIPPETS) {
    const html = generateHtml(snippet.title, snippet.code);
    await page.setContent(html);
    const element = await page.locator(".window-card");
    const outPath = path.join(CODE_SCREENSHOTS_DIR, snippet.file);
    await element.screenshot({ path: outPath });
    console.log(`Captured: ${snippet.file}`);
  }

  await browser.close();
  console.log("All code screenshots captured successfully!");
}

captureCodeScreenshots().catch(console.error);
