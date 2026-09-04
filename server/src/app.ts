import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import multer from "multer";
import { getPrisma } from "./prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, "../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

function handleAttachmentUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds 5MB limit" });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      if (err.message === "Unsupported file type") {
        return res.status(400).json({ error: "Unsupported file type" });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

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

// ---------------------------------------------------------------------------
// Lab 2 — Issue 5: Helper function for uploaded file cleanup
// ---------------------------------------------------------------------------
function cleanupUploadedFile(file?: Express.Multer.File) {
  if (file && file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      console.error("Failed to delete temp file:", e);
    }
  }
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 5: Ticket Detail (GET /api/tickets/:id)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    const requesterIdStr = req.query.requesterId as string;

    if (!requesterIdStr) {
      res.status(400).json({ error: "requesterId is required" });
      return;
    }

    const requesterId = parseInt(requesterIdStr, 10);
    if (isNaN(ticketId) || ticketId <= 0 || isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({ error: "Invalid ticket or requester ID" });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            originalName: true,
            sizeBytes: true,
            mimeType: true,
            active: true,
            removalReason: true,
            removedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket || ticket.requester.id !== requesterId) {
      res.status(404).json({ error: "Ticket not found or unauthorized access" });
      return;
    }

    res.json(ticket);
  } catch (error) {
    console.error("Failed to fetch ticket detail:", error);
    res.status(500).json({ error: "Failed to fetch ticket detail" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Issue 5: Upload Attachment (POST /api/tickets/:id/attachments)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/attachments",
  handleAttachmentUpload,
  async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      const ticketId = parseInt(req.params.id, 10);
      const requesterIdStr = req.body.requesterId;

      if (!requesterIdStr) {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "requesterId is required" });
        return;
      }

      const requesterId = parseInt(requesterIdStr, 10);
      if (isNaN(ticketId) || ticketId <= 0 || isNaN(requesterId) || requesterId <= 0) {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "Invalid ticket or requester ID" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "File is required" });
        return;
      }

      // Check ticket existence and ownership
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, requesterId: true },
      });

      if (!ticket || ticket.requesterId !== requesterId) {
        cleanupUploadedFile(req.file);
        res.status(404).json({ error: "Ticket not found or unauthorized" });
        return;
      }

      // Check active attachments count (max 5)
      const activeCount = await prisma.attachment.count({
        where: { ticketId, active: true },
      });

      if (activeCount >= 5) {
        cleanupUploadedFile(req.file);
        res.status(400).json({ error: "Maximum 5 active attachments allowed per ticket" });
        return;
      }

      const attachment = await prisma.attachment.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          active: true,
          ticketId,
        },
        select: {
          id: true,
          originalName: true,
          sizeBytes: true,
          mimeType: true,
          active: true,
          createdAt: true,
        },
      });

      res.status(201).json(attachment);
    } catch (error) {
      cleanupUploadedFile(req.file);
      console.error("Failed to upload attachment:", error);
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 — Issue 5: Download Attachment (GET /api/attachments/:id/download)
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const attachmentId = parseInt(req.params.id, 10);
    const requesterIdStr = req.query.requesterId as string;

    if (!requesterIdStr) {
      res.status(400).json({ error: "requesterId is required" });
      return;
    }

    const requesterId = parseInt(requesterIdStr, 10);
    if (isNaN(attachmentId) || attachmentId <= 0 || isNaN(requesterId) || requesterId <= 0) {
      res.status(400).json({ error: "Invalid attachment or requester ID" });
      return;
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: { select: { requesterId: true } },
      },
    });

    if (!attachment || attachment.ticket.requesterId !== requesterId) {
      res.status(404).json({ error: "Attachment not found or unauthorized" });
      return;
    }

    if (!attachment.active) {
      res.status(410).json({ error: "This attachment has been removed and cannot be downloaded" });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, attachment.filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Attachment file not found on server" });
      return;
    }

    res.setHeader("Content-Type", attachment.mimeType);
    res.download(filePath, attachment.originalName);
  } catch (error) {
    console.error("Failed to download attachment:", error);
    res.status(500).json({ error: "Failed to download attachment" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Issue 5: Soft-Remove Attachment (PATCH /api/attachments/:id/remove)
// ---------------------------------------------------------------------------
app.patch("/api/attachments/:id/remove", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const attachmentId = parseInt(req.params.id, 10);
    const { requesterId, reason } = req.body;

    if (!requesterId) {
      res.status(400).json({ error: "requesterId is required" });
      return;
    }

    const parsedRequesterId = parseInt(String(requesterId), 10);
    if (isNaN(attachmentId) || attachmentId <= 0 || isNaN(parsedRequesterId) || parsedRequesterId <= 0) {
      res.status(400).json({ error: "Invalid attachment or requester ID" });
      return;
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (trimmedReason.length < 5) {
      res.status(400).json({ error: "Removal reason must be at least 5 characters" });
      return;
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: { select: { requesterId: true } },
      },
    });

    if (!attachment || attachment.ticket.requesterId !== parsedRequesterId) {
      res.status(404).json({ error: "Attachment not found or unauthorized" });
      return;
    }

    if (!attachment.active) {
      res.status(409).json({ error: "Attachment is already removed" });
      return;
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        active: false,
        removalReason: trimmedReason,
        removedAt: new Date(),
      },
      select: {
        id: true,
        originalName: true,
        active: true,
        removalReason: true,
        removedAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Failed to remove attachment:", error);
    res.status(500).json({ error: "Failed to remove attachment" });
  }
});

export default app;
