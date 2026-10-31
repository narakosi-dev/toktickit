import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChanged } from "../auth.js";

export const dashboardRouter = Router();

// ===========================================================================
// GET /api/dashboard/staff
// Operational metrics and urgent tickets for IT Staff and Administrator
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

      // 1. Fetch tickets for metrics aggregation
      const allTickets = await prisma.ticket.findMany({
        select: {
          id: true,
          status: true,
          priority: true,
          itPriority: true,
          assignedToId: true,
        },
      });

      let unassignedCount = 0;
      let myAssignedCount = 0;

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

      const priorityCounts: Record<string, number> = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
      };

      for (const t of allTickets) {
        const isTerminal = terminalStatuses.includes(t.status);

        // unassignedCount: active tickets with no assigned technician
        if (!isTerminal && (t.assignedToId === null || t.assignedToId === undefined)) {
          unassignedCount++;
        }

        // myAssignedCount: active tickets assigned to current user
        if (!isTerminal && t.assignedToId === currentUserId) {
          myAssignedCount++;
        }

        // statusCounts (mapping legacy Pending_Requester if present)
        let st = t.status;
        if (st === "Pending_Requester") st = "Waiting_for_Requester";
        if (statusCounts[st] !== undefined) {
          statusCounts[st]++;
        } else {
          statusCounts[st] = 1;
        }

        // priorityCounts: active tickets grouped by effective priority (itPriority override or original priority)
        if (!isTerminal) {
          const effPriority = t.itPriority || t.priority;
          if (priorityCounts[effPriority] !== undefined) {
            priorityCounts[effPriority]++;
          }
        }
      }

      // 2. Urgent Tickets: Top 5 critical active tickets sorted by createdAt ASC
      let urgentTicketsRaw: any[] = [];
      try {
        urgentTicketsRaw = await prisma.ticket.findMany({
          where: {
            status: { notIn: terminalStatuses },
            OR: [
              { itPriority: "Critical" },
              { itPriority: null, priority: "Critical" },
            ],
          },
          orderBy: { createdAt: "asc" },
          take: 5,
          include: {
            requester: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
      } catch {
        // Fallback if OR with null is not supported by a mock
        const activeTickets = await prisma.ticket.findMany({
          include: {
            requester: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
        urgentTicketsRaw = activeTickets
          .filter((t: any) => {
            if (terminalStatuses.includes(t.status)) return false;
            const eff = t.itPriority || t.priority;
            return eff === "Critical";
          })
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .slice(0, 5);
      }

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

      // 3. Recent Updated Tickets: Top 5 tickets sorted by updatedAt DESC
      let recentUpdatedTicketsRaw: any[] = [];
      try {
        recentUpdatedTicketsRaw = await prisma.ticket.findMany({
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: {
            requester: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
      } catch {
        const allWithIncludes = await prisma.ticket.findMany({
          include: {
            requester: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
        recentUpdatedTicketsRaw = allWithIncludes
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);
      }

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
          statusCounts,
          priorityCounts,
        },
        urgentTickets,
        recentUpdatedTickets,
      });
    } catch (err: any) {
      console.error("Failed to fetch staff dashboard metrics:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
