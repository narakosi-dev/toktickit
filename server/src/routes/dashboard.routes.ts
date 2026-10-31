import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChanged } from "../auth.js";

export const dashboardRouter = Router();

// ===========================================================================
// GET /api/dashboard/staff
// Operational metrics and urgent tickets for IT Staff and Administrator (BR-11, AC-10, FR-10)
// ===========================================================================
dashboardRouter.get(
  "/staff",
  authenticateToken,
  requirePasswordChanged,
  async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== "IT_Staff" && req.user?.role !== "Administrator") {
        return res.status(403).json({ error: "Forbidden: Access is denied" });
      }

      const prisma = getPrisma();
      const currentUserId = req.user.id;
      const terminalStatuses = ["Closed", "Cancelled"];

      // 1. Unassigned active tickets count (database aggregation via count)
      const unassignedCount = await prisma.ticket.count({
        where: {
          status: { notIn: terminalStatuses },
          assignedToId: null,
        },
      });

      // 2. Current user active assigned tickets count (database aggregation via count)
      const myAssignedCount = await prisma.ticket.count({
        where: {
          status: { notIn: terminalStatuses },
          assignedToId: currentUserId,
        },
      });

      // 3. Status breakdown: aggregated via database groupBy
      const statusGroup = await prisma.ticket.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      });

      // Active statuses tracked per BR-11
      const statusBreakdown: Record<string, number> = {
        New: 0,
        Open: 0,
        In_Progress: 0,
        Waiting_for_Requester: 0,
        Resolved: 0,
        Reopened: 0,
      };

      // Full status counts for backwards compatibility
      const statusCounts: Record<string, number> = {
        New: 0,
        Open: 0,
        In_Progress: 0,
        Waiting_for_Requester: 0,
        Resolved: 0,
        Reopened: 0,
        Closed: 0,
        Cancelled: 0,
      };

      for (const item of statusGroup) {
        let st = item.status;
        if (st === "Pending_Requester") st = "Waiting_for_Requester";
        const count =
          typeof item._count === "number"
            ? item._count
            : (item._count?.status ?? (item._count as any)?._all ?? 0);

        if (statusBreakdown[st] !== undefined) {
          statusBreakdown[st] += count;
        }
        if (statusCounts[st] !== undefined) {
          statusCounts[st] += count;
        } else {
          statusCounts[st] = count;
        }
      }

      // 4. Priority breakdown for active tickets: aggregated via database groupBy on itPriority and priority
      const priorityGroup = await prisma.ticket.groupBy({
        by: ["itPriority", "priority"],
        where: {
          status: { notIn: terminalStatuses },
        },
        _count: {
          _all: true,
        },
      });

      const priorityBreakdown: Record<string, number> = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
      };

      for (const item of priorityGroup) {
        const effPriority = item.itPriority || item.priority;
        const count =
          typeof item._count === "number"
            ? item._count
            : ((item._count as any)?._all ?? (item._count as any)?.priority ?? 0);
        if (priorityBreakdown[effPriority] !== undefined) {
          priorityBreakdown[effPriority] += count;
        }
      }

      const priorityCounts = { ...priorityBreakdown };

      // 5. Urgent Tickets: Top 5 critical active tickets sorted by createdAt ASC (oldest first)
      const urgentTicketsRaw = await prisma.ticket.findMany({
        where: {
          status: { notIn: terminalStatuses },
          OR: [
            { itPriority: "Critical" },
            { itPriority: null, priority: "Critical" },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          priority: true,
          itPriority: true,
          status: true,
          createdAt: true,
          requester: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });

      const urgentTickets = urgentTicketsRaw.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        priority: t.priority,
        itPriority: t.itPriority ?? null,
        status: t.status,
        requester: t.requester ? { id: t.requester.id, name: t.requester.name } : null,
        assignedTo: t.assignedTo ? { id: t.assignedTo.id, name: t.assignedTo.name } : null,
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
      }));

      // 6. Recent Updated Tickets: Top 5 tickets sorted by updatedAt DESC
      const recentUpdatedTicketsRaw = await prisma.ticket.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          priority: true,
          itPriority: true,
          status: true,
          updatedAt: true,
          requester: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });

      const recentUpdatedTickets = recentUpdatedTicketsRaw.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        priority: t.priority,
        itPriority: t.itPriority ?? null,
        status: t.status,
        requester: t.requester ? { id: t.requester.id, name: t.requester.name } : null,
        assignedTo: t.assignedTo ? { id: t.assignedTo.id, name: t.assignedTo.name } : null,
        updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
      }));

      return res.status(200).json({
        metrics: {
          unassignedCount,
          myAssignedCount,
          statusBreakdown,
          priorityBreakdown,
          statusCounts,
          priorityCounts,
        },
        urgentTickets,
        recentUpdatedTickets,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Failed to fetch staff dashboard metrics:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ===========================================================================
// GET /api/dashboard/requester
// Personalized operational metrics and recent tickets for Requester (BR-10, AC-11, FR-10)
// ===========================================================================
dashboardRouter.get(
  "/requester",
  authenticateToken,
  requirePasswordChanged,
  async (req: Request, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const prisma = getPrisma();

      // 1. Total Open: tickets owned by requester with active open status
      const totalOpen = await prisma.ticket.count({
        where: {
          requesterId: currentUserId,
          status: { in: ["New", "Open", "In_Progress", "Waiting_for_Requester", "Reopened"] },
        },
      });

      // 2. In Progress: tickets owned by requester with status 'In_Progress'
      const inProgress = await prisma.ticket.count({
        where: {
          requesterId: currentUserId,
          status: "In_Progress",
        },
      });

      // 3. Waiting for Requester: tickets owned by requester with status 'Waiting_for_Requester'
      const waitingForRequester = await prisma.ticket.count({
        where: {
          requesterId: currentUserId,
          status: "Waiting_for_Requester",
        },
      });

      // 4. Recently Resolved: tickets owned by requester resolved within the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentlyResolved = await prisma.ticket.count({
        where: {
          requesterId: currentUserId,
          status: "Resolved",
          updatedAt: { gte: thirtyDaysAgo },
        },
      });

      // 5. Closed: tickets owned by requester with status 'Closed'
      const closed = await prisma.ticket.count({
        where: {
          requesterId: currentUserId,
          status: "Closed",
        },
      });

      // 6. Recent Tickets: Top 5 most recently updated tickets owned by requester
      const recentTicketsRaw = await prisma.ticket.findMany({
        where: {
          requesterId: currentUserId,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          priority: true,
          status: true,
          resolvedIndicated: true,
          category: { select: { id: true, name: true } },
          updatedAt: true,
        },
      });

      const recentTickets = recentTicketsRaw.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        priority: t.priority,
        status: t.status,
        resolvedIndicated: Boolean(t.resolvedIndicated),
        category: t.category ? { id: t.category.id, name: t.category.name } : null,
        updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
      }));

      return res.status(200).json({
        metrics: {
          totalOpen,
          inProgress,
          waitingForRequester,
          recentlyResolved,
          closed,
          closedCount: closed,
        },
        recentTickets,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Failed to fetch requester dashboard metrics:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
