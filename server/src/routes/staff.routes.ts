import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChanged, requireRole } from "../auth.js";

export const staffRouter = Router();

// Enforce authentication, password changed, and IT_Staff / Administrator role
staffRouter.use(authenticateToken);
staffRouter.use(requirePasswordChanged);
staffRouter.use(requireRole(["IT_Staff", "Administrator"]));

/**
 * GET /api/staff/tickets
 * Shared IT Staff ticket queue with multi-filter, full-text search, sorting, and pagination
 */
staffRouter.get("/tickets", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const where: any = {};

    // 1. Search filter: q or search (matches ticketNumber, summary/title, description)
    const search = (req.query.q || req.query.search) as string | undefined;
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    // 2. Category filter
    if (req.query.categoryId) {
      const catId = parseInt(req.query.categoryId as string, 10);
      if (!isNaN(catId) && catId > 0) {
        where.categoryId = catId;
      }
    }

    // 3. Related System filter
    if (req.query.relatedSystemId) {
      const sysId = parseInt(req.query.relatedSystemId as string, 10);
      if (!isNaN(sysId) && sysId > 0) {
        where.relatedSystemId = sysId;
      }
    }

    // 4. Status filter (supports both underscored and space-separated format, e.g., "In Progress" -> "In_Progress")
    if (req.query.status && typeof req.query.status === "string" && req.query.status.trim()) {
      const s = req.query.status.trim();
      const normalizedStatus = s.replace(/\s+/g, "_");
      where.status = { equals: normalizedStatus, mode: "insensitive" };
    }

    // 5. Priority filter (matches itPriority or fallback to priority)
    if (req.query.priority && typeof req.query.priority === "string" && req.query.priority.trim()) {
      const p = req.query.priority.trim();
      const priorityClause = {
        OR: [
          { itPriority: { equals: p, mode: "insensitive" } },
          { itPriority: null, priority: { equals: p, mode: "insensitive" } },
        ],
      };

      if (where.OR) {
        where.AND = [{ OR: where.OR }, priorityClause];
        delete where.OR;
      } else {
        where.OR = priorityClause.OR;
      }
    }

    // 6. Explicit itPriority filter
    if (req.query.itPriority && typeof req.query.itPriority === "string" && req.query.itPriority.trim()) {
      where.itPriority = { equals: req.query.itPriority.trim(), mode: "insensitive" };
    }

    // 7. Assignee / Owner filter (assigneeId or ownerId: 'unassigned' | 'mine' | number)
    const rawAssignee = (req.query.assigneeId || req.query.ownerId) as string | undefined;
    if (rawAssignee && typeof rawAssignee === "string" && rawAssignee.trim()) {
      const cleanAssignee = rawAssignee.trim().toLowerCase();
      if (cleanAssignee === "unassigned") {
        where.assignedToId = null;
      } else if (cleanAssignee === "mine") {
        where.assignedToId = req.user!.id;
      } else {
        const parsedStaffId = parseInt(cleanAssignee, 10);
        if (!isNaN(parsedStaffId) && parsedStaffId > 0) {
          where.assignedToId = parsedStaffId;
        }
      }
    }

    // 8. Sorting
    const sortBy = (req.query.sortBy || req.query.sort || "createdAt") as string;
    const sortOrder = ((req.query.sortOrder || "desc") as string).toLowerCase() === "asc" ? "asc" : "desc";

    let orderBy: any = { createdAt: sortOrder };
    if (sortBy === "ticketDate") {
      orderBy = { ticketDate: sortOrder };
    } else if (sortBy === "updatedAt") {
      orderBy = { updatedAt: sortOrder };
    } else if (sortBy === "ticketNumber") {
      orderBy = { ticketNumber: sortOrder };
    } else if (sortBy === "status") {
      orderBy = { status: sortOrder };
    } else if (sortBy === "priority") {
      orderBy = { priority: sortOrder };
    } else if (sortBy === "itPriority") {
      orderBy = { itPriority: sortOrder };
    }

    // 9. Pagination
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const [total, rawTickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          category: {
            select: { id: true, name: true },
          },
          relatedSystem: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              attachments: true,
              publicComments: true,
              internalNotes: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    // Transform ticket items with consistent aliases for owner/assignee and requester resolved flag
    const tickets = rawTickets.map((t) => ({
      ...t,
      owner: t.assignedTo,
      assignee: t.assignedTo,
      resolvedByRequester: t.resolvedIndicated,
    }));

    // Calculate queue-wide status counts
    const stats = {
      total,
      newCount: 0,
      inProgressCount: 0,
      pendingCount: 0,
      resolvedCount: 0,
    };

    try {
      if (typeof prisma.ticket.groupBy === "function") {
        const groups = await prisma.ticket.groupBy({
          by: ["status"],
          _count: { status: true },
        });
        for (const g of groups) {
          const st = (g.status || "").toLowerCase();
          if (st === "new") stats.newCount = g._count.status;
          else if (st === "in_progress" || st === "in progress") stats.inProgressCount = g._count.status;
          else if (st === "pending_requester" || st === "pending requester") stats.pendingCount = g._count.status;
          else if (st === "resolved") stats.resolvedCount = g._count.status;
        }
      }
    } catch {}

    res.status(200).json({
      tickets,
      items: tickets, // alias for backwards/test compatibility
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      total,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch staff tickets queue:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------------------------------------------------------
// Helpers: Priority & Status Transition Matrix
// ---------------------------------------------------------------------------
function normalizePriority(pr: string): string | null {
  const p = pr.trim().toLowerCase();
  if (p === "low") return "Low";
  if (p === "medium") return "Medium";
  if (p === "high") return "High";
  if (p === "critical" || p === "urgent") return "Critical";
  return null;
}

function normalizeStatus(st: string): string {
  const s = st.trim().toLowerCase();
  if (s === "new") return "New";
  if (s === "open") return "Open";
  if (s === "assigned") return "Assigned";
  if (s === "in_progress" || s === "in progress") return "In_Progress";
  if (
    s === "pending_requester" ||
    s === "pending requester" ||
    s === "waiting for requester" ||
    s === "waiting_for_requester"
  )
    return "Pending_Requester";
  if (s === "resolved") return "Resolved";
  if (s === "closed") return "Closed";
  if (s === "reopened") return "Reopened";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  return st.trim();
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  New: ["Assigned", "Open", "In_Progress", "Cancelled"],
  Open: ["In_Progress", "Pending_Requester", "Resolved", "Cancelled"],
  Assigned: ["In_Progress", "Pending_Requester", "Resolved", "Cancelled"],
  In_Progress: ["Pending_Requester", "Resolved", "Cancelled"],
  Pending_Requester: ["In_Progress", "Resolved", "Cancelled"],
  Resolved: ["Closed", "In_Progress", "Reopened"],
  Reopened: ["In_Progress", "Pending_Requester", "Resolved", "Cancelled"],
  Closed: [], // Closed is terminal per TC-OP-13
  Cancelled: [], // Cancelled is terminal
};

/**
 * GET /api/staff/members
 * Returns active IT Staff and Administrator users for ticket assignment
 */
staffRouter.get("/members", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const members = await prisma.user.findMany({
      where: {
        role: { in: ["IT_Staff", "Administrator"] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json(members);
  } catch (error) {
    console.error("Failed to fetch staff members:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/staff/tickets/:id
 * Retrieve full staff ticket detail including internal notes, public comments, attachments, activity
 */
staffRouter.get("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          select: {
            id: true,
            originalName: true,
            filename: true,
            mimeType: true,
            sizeBytes: true,
            active: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        publicComments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        internalNotes: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        activityLogs: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            attachments: true,
            publicComments: true,
            internalNotes: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.status(200).json({
      ...ticket,
      owner: ticket.assignedTo,
      ownerId: ticket.assignedToId,
      resolvedByRequester: ticket.resolvedIndicated,
    });
  } catch (error) {
    console.error("Failed to fetch staff ticket detail:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH & POST /api/staff/tickets/:id/assign
 * Claim or reassign ticket to active IT Staff or Admin, or unassign
 */
const handleAssign = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    let rawTarget: any = undefined;
    if ("staffId" in req.body) rawTarget = req.body.staffId;
    else if ("ownerId" in req.body) rawTarget = req.body.ownerId;
    else if ("assignedToId" in req.body) rawTarget = req.body.assignedToId;

    if (rawTarget === null || rawTarget === 0 || rawTarget === "unassigned" || rawTarget === "") {
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { assignedToId: null },
        include: {
          assignedTo: { select: { id: true, name: true, email: true, role: true } },
          requester: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      try {
        await prisma.activityLog.create({
          data: {
            ticketId,
            userId: req.user!.id,
            action: "TICKET_UNASSIGNED",
            details: "Ticket unassigned",
          },
        });
      } catch {}

      return res.status(200).json({
        id: updated.id,
        assignedToId: null,
        assignedTo: null,
        ownerId: null,
        owner: null,
        ticket: updated,
      });
    }

    const parsedId = typeof rawTarget === "string" ? parseInt(rawTarget, 10) : Number(rawTarget);
    if (isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ error: "Assignee must be an active IT Staff or Administrator" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parsedId },
    });

    if (
      !targetUser ||
      !targetUser.isActive ||
      (targetUser.role !== "IT_Staff" && targetUser.role !== "Administrator")
    ) {
      return res.status(400).json({ error: "Assignee must be an active IT Staff or Administrator" });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId: targetUser.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        requester: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    try {
      await prisma.activityLog.create({
        data: {
          ticketId,
          userId: req.user!.id,
          action: "TICKET_ASSIGNED",
          details: `Assigned to ${targetUser.name} (${targetUser.role})`,
        },
      });
    } catch {}

    return res.status(200).json({
      id: updated.id,
      assignedToId: updated.assignedToId,
      assignedTo: targetUser,
      ownerId: updated.assignedToId,
      owner: targetUser,
      ticket: updated,
    });
  } catch (error) {
    console.error("Failed to assign ticket:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

staffRouter.patch("/tickets/:id/assign", handleAssign);
staffRouter.post("/tickets/:id/assign", handleAssign);

/**
 * PATCH & POST /api/staff/tickets/:id/priority
 * Override IT Priority without altering original requester priority
 */
const handlePriority = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const rawPriority = req.body.itPriority ?? req.body.priority;
    if (!rawPriority || typeof rawPriority !== "string" || !rawPriority.trim()) {
      return res.status(400).json({ error: "itPriority must be one of: Low, Medium, High, Critical" });
    }

    const normalized = normalizePriority(rawPriority);
    if (!normalized) {
      return res.status(400).json({ error: "itPriority must be one of: Low, Medium, High, Critical" });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority: normalized },
    });

    try {
      await prisma.activityLog.create({
        data: {
          ticketId,
          userId: req.user!.id,
          action: "PRIORITY_UPDATED",
          details: `IT Priority updated to ${normalized}`,
        },
      });
    } catch {}

    res.status(200).json({
      id: updated.id,
      itPriority: updated.itPriority,
      priority: updated.priority, // remains unchanged
      ticket: updated,
    });
  } catch (error) {
    console.error("Failed to update IT priority:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

staffRouter.patch("/tickets/:id/priority", handlePriority);
staffRouter.post("/tickets/:id/priority", handlePriority);

/**
 * PATCH & POST /api/staff/tickets/:id/status
 * Enforce Status Transition Matrix (BR-08 / BR-13)
 */
const handleStatus = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const rawStatus = req.body.status;
    if (!rawStatus || typeof rawStatus !== "string" || !rawStatus.trim()) {
      return res.status(400).json({ error: "status is required" });
    }

    const currentNormalized = normalizeStatus(ticket.status);
    const targetNormalized = normalizeStatus(rawStatus);

    const allowedNext = VALID_STATUS_TRANSITIONS[currentNormalized] || [];
    if (currentNormalized === targetNormalized || !allowedNext.includes(targetNormalized)) {
      return res.status(400).json({
        error: `Invalid status transition from '${ticket.status}' to '${targetNormalized}'`,
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: targetNormalized },
    });

    try {
      await prisma.activityLog.create({
        data: {
          ticketId,
          userId: req.user!.id,
          action: "STATUS_TRANSITION",
          details: `Status transitioned from ${ticket.status} to ${targetNormalized}`,
        },
      });
    } catch {}

    res.status(200).json({
      id: updated.id,
      status: updated.status,
      ticket: updated,
    });
  } catch (error) {
    console.error("Failed to update ticket status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

staffRouter.patch("/tickets/:id/status", handleStatus);
staffRouter.post("/tickets/:id/status", handleStatus);
