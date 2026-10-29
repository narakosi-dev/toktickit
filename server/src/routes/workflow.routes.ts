import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChanged, requireRole } from "../auth.js";

export const workflowRouter = Router();

export function normalizeStatus(st: string): string {
  const s = st.trim().toLowerCase();
  if (s === "new") return "New";
  if (s === "open") return "Open";
  if (s === "assigned") return "Assigned";
  if (s === "in_progress" || s === "in progress") return "In_Progress";
  if (
    s === "pending_requester" ||
    s === "pending requester"
  )
    return "Pending_Requester";
  if (
    s === "waiting for requester" ||
    s === "waiting_for_requester"
  )
    return "Waiting_for_Requester";
  if (s === "resolved") return "Resolved";
  if (s === "closed") return "Closed";
  if (s === "reopened") return "Reopened";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  return st.trim();
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  New: ["Assigned", "Open", "In_Progress", "Cancelled"],
  Open: ["In_Progress", "Pending_Requester", "Waiting_for_Requester", "Resolved", "Cancelled"],
  Assigned: ["In_Progress", "Pending_Requester", "Waiting_for_Requester", "Resolved", "Cancelled"],
  In_Progress: ["Pending_Requester", "Waiting_for_Requester", "Resolved", "Cancelled"],
  Pending_Requester: ["In_Progress", "Resolved", "Cancelled"],
  Waiting_for_Requester: ["In_Progress", "Resolved", "Cancelled"],
  Resolved: ["Closed", "In_Progress", "Reopened"],
  Reopened: ["In_Progress", "Pending_Requester", "Waiting_for_Requester", "Resolved", "Cancelled"],
  Closed: [], // Closed is terminal
  Cancelled: [], // Cancelled is terminal
};

/**
 * Authoritative Status Transition Handler with Optimistic Concurrency Control
 * and Resolution Prerequisites (AC-06, AC-07, AC-08)
 */
export const handleUpdateTicketStatus = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        actionsTaken: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const rawStatus = req.body.status;
    if (!rawStatus || typeof rawStatus !== "string" || !rawStatus.trim()) {
      return res.status(400).json({ error: "status is required" });
    }

    const currentNormalized = normalizeStatus(ticket.status);
    const targetNormalized = normalizeStatus(rawStatus);

    // 1. Enforce Status Transition Matrix
    const allowedNext = VALID_STATUS_TRANSITIONS[currentNormalized] || [];
    if (currentNormalized === targetNormalized || !allowedNext.includes(targetNormalized)) {
      return res.status(400).json({
        error: `Invalid status transition from '${ticket.status}' to '${targetNormalized}'`,
        details: [`Permitted transitions from ${ticket.status}: ${allowedNext.join(", ") || "None (Terminal state)"}`],
      });
    }

    // 2. Optimistic Concurrency Control (OCC) Gate
    const currentVersion = ticket.version !== undefined && ticket.version !== null ? ticket.version : 1;
    if (req.body.version !== undefined && req.body.version !== null) {
      const expectedVersion = parseInt(req.body.version, 10);
      if (isNaN(expectedVersion)) {
        return res.status(400).json({ error: "version must be a valid integer" });
      }
      if (expectedVersion !== currentVersion) {
        return res.status(409).json({
          error: "Conflict: Ticket has been modified concurrently",
          currentVersion,
          currentStatus: ticket.status,
          updatedAt: ticket.updatedAt,
        });
      }
    }

    // 3. Resolution Invariant: Must have at least 1 Action Taken to Resolve (BR-02 / AC-07)
    if (targetNormalized === "Resolved") {
      let actionsCount = 0;
      if (ticket.actionsTaken && Array.isArray(ticket.actionsTaken)) {
        actionsCount = ticket.actionsTaken.length;
      } else if (prisma.actionTaken && typeof prisma.actionTaken.count === "function") {
        actionsCount = await prisma.actionTaken.count({
          where: { ticketId },
        });
      }

      if (actionsCount === 0) {
        return res.status(400).json({
          error: "Cannot resolve ticket without at least one recorded Action Taken",
          code: "ACTION_TAKEN_REQUIRED",
        });
      }
    }

    // 4. Perform Transition and increment version
    const newVersion = currentVersion + 1;
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: targetNormalized,
        version: newVersion,
      },
    });

    // 5. Activity Log
    try {
      const commentDetails = req.body.comment && typeof req.body.comment === "string" && req.body.comment.trim()
        ? ` (${req.body.comment.trim()})`
        : "";
      await prisma.activityLog.create({
        data: {
          ticketId,
          userId: req.user!.id,
          action: "STATUS_TRANSITION",
          details: `Status transitioned from ${ticket.status} to ${targetNormalized}${commentDetails}`,
        },
      });
    } catch (logErr) {
      console.warn("Notice: could not create activityLog for status transition:", logErr);
    }

    return res.status(200).json({
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      status: updated.status,
      previousStatus: ticket.status,
      version: updated.version,
      resolvedIndicated: updated.resolvedIndicated,
      updatedAt: updated.updatedAt,
      ticket: updated,
    });
  } catch (err) {
    console.error("handleUpdateTicketStatus error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Route Registration
workflowRouter.patch(
  "/:id/status",
  authenticateToken,
  requirePasswordChanged,
  requireRole(["IT_Staff", "Administrator"]),
  handleUpdateTicketStatus
);

workflowRouter.post(
  "/:id/status",
  authenticateToken,
  requirePasswordChanged,
  requireRole(["IT_Staff", "Administrator"]),
  handleUpdateTicketStatus
);
