import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";

export const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Lab 1: Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 1: Category list
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Issue 2: Development Requesters (Active only)
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.requester.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, active: true },
      orderBy: { id: "asc" },
    });
    res.json(requesters);
  } catch (error) {
    console.error("Failed to fetch requesters:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Issue 2: Related Systems (Active only)
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.json(systems);
  } catch (error) {
    console.error("Failed to fetch related systems:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Issue 3: Create Ticket (POST /api/tickets)
// ---------------------------------------------------------------------------
const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"];

app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const { requesterId, categoryId, relatedSystemId, priority, summary, description } = req.body;

    // --- Validation ---
    const errors: string[] = [];

    if (requesterId == null || !Number.isInteger(requesterId) || requesterId <= 0) {
      errors.push("requesterId is required and must be a positive integer");
    }
    if (categoryId == null || !Number.isInteger(categoryId) || categoryId <= 0) {
      errors.push("categoryId is required and must be a positive integer");
    }
    if (relatedSystemId == null || !Number.isInteger(relatedSystemId) || relatedSystemId <= 0) {
      errors.push("relatedSystemId is required and must be a positive integer");
    }
    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      errors.push(`priority is required and must be one of: ${VALID_PRIORITIES.join(", ")}`);
    }

    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    const trimmedDescription = typeof description === "string" ? description.trim() : "";

    if (!trimmedSummary || trimmedSummary.length < 5) {
      errors.push("Summary must be at least 5 characters");
    } else if (trimmedSummary.length > 120) {
      errors.push("Summary must not exceed 120 characters");
    }

    if (!trimmedDescription || trimmedDescription.length < 10) {
      errors.push("Description must be at least 10 characters");
    } else if (trimmedDescription.length > 2000) {
      errors.push("Description must not exceed 2000 characters");
    }

    if (errors.length > 0) {
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }

    // --- Foreign key existence check ---
    const [requester, category, relatedSystem] = await Promise.all([
      prisma.requester.findFirst({ where: { id: requesterId, active: true } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.relatedSystem.findFirst({ where: { id: relatedSystemId, active: true } }),
    ]);

    if (!requester || !category || !relatedSystem) {
      res.status(404).json({ error: "Invalid requester, category, or related system" });
      return;
    }

    // --- Generate ticket number (BR-01): TKT-YYYY-NNNNNN ---
    const year = new Date().getFullYear();
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const nextSequence = (lastTicket?.id ?? 0) + 1;
    const ticketNumber = `TKT-${year}-${String(nextSequence).padStart(6, "0")}`;

    // --- Create ticket ---
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: trimmedSummary,
        description: trimmedDescription,
        priority,
        status: "New",
        requesterId,
        categoryId,
        relatedSystemId,
      },
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Failed to create ticket:", error);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

export default app;
