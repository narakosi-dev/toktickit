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
    let ticket;
    let attempts = 0;

    while (!ticket && attempts < 5) {
      attempts++;
      const lastTicket = await prisma.ticket.findFirst({
        where: { ticketNumber: { startsWith: `TKT-${year}-` } },
        orderBy: { ticketNumber: "desc" },
        select: { ticketNumber: true },
      });

      let nextSequence = 1;
      if (lastTicket?.ticketNumber) {
        const parts = lastTicket.ticketNumber.split("-");
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq)) {
          nextSequence = seq + 1;
        }
      }

      const ticketNumber = `TKT-${year}-${String(nextSequence).padStart(6, "0")}`;

      try {
        ticket = await prisma.ticket.create({
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
      } catch (err: any) {
        if (err?.code === "P2002" && attempts < 5) {
          continue;
        }
        throw err;
      }
    }

    if (!ticket) {
      res.status(500).json({ error: "Failed to allocate unique ticket number" });
      return;
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Failed to create ticket:", error);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Issue 4: List Requester's Tickets (GET /api/tickets)
// ---------------------------------------------------------------------------
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const { requesterId, search, categoryId, priority, status, sort, page, limit } = req.query;

    if (!requesterId) {
      res.status(400).json({ error: "requesterId query parameter is required" });
      return;
    }

    const parsedRequesterId = parseInt(requesterId as string, 10);
    if (isNaN(parsedRequesterId) || parsedRequesterId <= 0) {
      res.status(400).json({ error: "requesterId must be a positive integer" });
      return;
    }

    // Strict ownership isolation: only return tickets belonging to this requester
    const where: any = {
      requesterId: parsedRequesterId,
    };

    if (search && typeof search === "string" && search.trim()) {
      const term = search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      const catId = parseInt(categoryId as string, 10);
      if (!isNaN(catId) && catId > 0) {
        where.categoryId = catId;
      }
    }

    if (priority && typeof priority === "string" && priority.trim()) {
      where.priority = priority.trim();
    }

    if (status && typeof status === "string" && status.trim()) {
      where.status = status.trim();
    }

    let orderBy: any = { ticketDate: "desc" };
    if (sort === "oldest") {
      orderBy = { ticketDate: "asc" };
    } else if (sort === "priority") {
      orderBy = [{ priority: "asc" }, { ticketDate: "desc" }];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 8));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          _count: {
            select: {
              attachments: { where: { active: true } },
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);

    const formattedTickets = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      ticketDate: t.ticketDate,
      summary: t.summary,
      priority: t.priority,
      status: t.status,
      category: t.category,
      relatedSystem: t.relatedSystem,
      attachmentCount: t._count.attachments,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limitNum);

    res.json({
      tickets: formattedTickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Failed to query tickets:", error);
    res.status(500).json({ error: "Failed to query tickets" });
  }
});

export default app;
