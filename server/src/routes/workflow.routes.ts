import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChanged, requireRole } from "../auth.js";

export const workflowRouter = Router();

/**
 * Normalizes input status string across variations, synonyms, and legacy aliases
 * into the 8 authoritative schema-conforming status names (BR-06).
 */
export function normalizeStatus(st: string): string {
  const s = st.trim().toLowerCase();
  if (s === "new") return "New";
  if (s === "open") return "Open";
  if (s === "assigned") return "Open"; // Legacy alias mapped to Open
  if (s === "in_progress" || s === "in progress") return "In_Progress";
  if (
    s === "pending_requester" ||
    s === "pending requester" ||
    s === "waiting for requester" ||
    s === "waiting_for_requester"
  ) {
    return "Waiting_for_Requester";
  }
  if (s === "resolved") return "Resolved";
  if (s === "closed") return "Closed";
  if (s === "reopened") return "Reopened";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  return st.trim();
}

/**
 * Permitted Status Transition Matrix (Finite State Machine)
 * Strictly matches BR-06 in docs/lab-04/specification.md cell by cell across 8 statuses.
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  New: ["Open", "Cancelled"],
  Open: ["In_Progress", "Waiting_for_Requester", "Resolved", "Cancelled"],
  In_Progress: ["Waiting_for_Requester", "Resolved", "Open"],
  Waiting_for_Requester: ["In_Progress", "Resolved", "Cancelled"],
  Resolved: ["Closed", "Reopened"],
  Reopened: ["In_Progress", "Resolved", "Cancelled"],
  Closed: [], // Closed is terminal per spec
  Cancelled: [], // Cancelled is terminal per spec
};

/**
 * Authoritative Status Transition Handler with Optimistic Concurrency Control (OCC)
 * and Resolution Prerequisites (AC-06, AC-07, AC-08, BR-06).
 *
 * Implements atomic transactional execution:
 * 1. Requires explicit version parameter (HTTP 400 if missing or invalid).
 * 2. Validates Status Transition Matrix (HTTP 400 on illegal jumps or terminal state exits).
 * 3. Enforces Resolution Gate: requires at least 1 ActionTaken record (HTTP 400 ACTION_TAKEN_REQUIRED).
 * 4. Executes atomic update via updateMany({ where: { id, version } }) inside prisma.$transaction.
 *    If count === 0, returns HTTP 409 Conflict with current state.
 * 5. Writes ActivityLog within the exact same atomic transaction to guarantee auditability.
 */
export const handleUpdateTicketStatus = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        error: "Invalid ticket ID",
        code: "INVALID_TICKET_ID",
      });
    }

    const rawStatus = req.body.status;
    if (!rawStatus || typeof rawStatus !== "string" || !rawStatus.trim()) {
      return res.status(400).json({
        error: "status is required",
        code: "STATUS_REQUIRED",
      });
    }

    // OCC: version parameter is mandatory
    if (req.body.version === undefined || req.body.version === null) {
      return res.status(400).json({
        error: "version is required for optimistic concurrency control",
        code: "VERSION_REQUIRED",
        details: ["A valid integer 'version' must be supplied in the request body."],
      });
    }

    const expectedVersion = parseInt(req.body.version, 10);
    if (isNaN(expectedVersion)) {
      return res.status(400).json({
        error: "version must be a valid integer",
        code: "INVALID_VERSION",
      });
    }

    const currentNormalizedTarget = normalizeStatus(rawStatus);

    // Execute within atomic transaction
    const executeTx = async (tx: any) => {
      // 1. Fetch ticket to verify existence and check action count using _count alone
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          version: true,
          resolvedIndicated: true,
          updatedAt: true,
          _count: {
            select: { actionsTaken: true },
          },
        },
      });

      if (!ticket) {
        return {
          status: 404,
          body: {
            error: "Ticket not found",
            code: "TICKET_NOT_FOUND",
          },
        };
      }

      const currentNormalized = normalizeStatus(ticket.status);
      const targetNormalized = currentNormalizedTarget;

      // 2. Validate Status Transition Matrix against BR-06
      const allowedNext = VALID_STATUS_TRANSITIONS[currentNormalized] || [];
      if (currentNormalized === targetNormalized || !allowedNext.includes(targetNormalized)) {
        return {
          status: 400,
          body: {
            error: `Invalid status transition from '${ticket.status}' to '${targetNormalized}'`,
            code: "INVALID_STATUS_TRANSITION",
            details: [`Permitted transitions from ${ticket.status}: ${allowedNext.join(", ") || "None (Terminal state)"}`],
          },
        };
      }

      // 3. Resolution Invariant Gate (AC-07): Must have at least 1 Action Taken to Resolve
      if (targetNormalized === "Resolved") {
        const actionsCount = ticket._count?.actionsTaken ?? 0;
        if (actionsCount === 0) {
          return {
            status: 400,
            body: {
              error: "Cannot resolve ticket without at least one recorded Action Taken",
              code: "ACTION_TAKEN_REQUIRED",
              details: ["At least one technical action must be documented before resolving the ticket."],
            },
          };
        }
      }

      // 4. Atomic OCC Update using updateMany with version match in WHERE clause
      const updateResult = await tx.ticket.updateMany({
        where: {
          id: ticketId,
          version: expectedVersion,
        },
        data: {
          status: targetNormalized,
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        // Stale update detected: concurrent modification conflict
        const latest = await tx.ticket.findUnique({ where: { id: ticketId } });
        return {
          status: 409,
          body: {
            error: "Conflict: Ticket has been modified concurrently",
            code: "CONCURRENCY_CONFLICT",
            currentVersion: latest?.version ?? ticket.version,
            currentStatus: latest?.status ?? ticket.status,
            message: "The ticket was updated by another technician while you were viewing it. Please refresh and review the latest changes.",
            updatedAt: latest?.updatedAt ?? ticket.updatedAt,
          },
        };
      }

      // 5. Activity Log (in the same atomic transaction)
      const commentDetails = req.body.comment && typeof req.body.comment === "string" && req.body.comment.trim()
        ? ` (${req.body.comment.trim()})`
        : "";
      await tx.activityLog.create({
        data: {
          ticketId,
          userId: req.user!.id,
          action: "STATUS_TRANSITION",
          details: `Status transitioned from ${ticket.status} to ${targetNormalized}${commentDetails}`,
        },
      });

      const updated = await tx.ticket.findUnique({ where: { id: ticketId } });
      return {
        status: 200,
        body: {
          id: updated!.id,
          ticketNumber: updated!.ticketNumber,
          status: updated!.status,
          previousStatus: ticket.status,
          version: updated!.version,
          resolvedIndicated: updated!.resolvedIndicated,
          updatedAt: updated!.updatedAt,
          ticket: updated,
        },
      };
    };

    // Strictly execute within atomic database transaction
    const outcome = await prisma.$transaction(executeTx);
    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error("handleUpdateTicketStatus error:", err);
    return res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
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
