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

    // 4. Status filter
    if (req.query.status && typeof req.query.status === "string" && req.query.status.trim()) {
      const s = req.query.status.trim();
      where.status = { equals: s, mode: "insensitive" };
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
    });
  } catch (error) {
    console.error("Failed to fetch staff tickets queue:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
