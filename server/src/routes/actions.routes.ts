import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChanged, requireRole } from "../auth.js";

export const actionsRouter = Router();

// ============================================================================
// Actions Taken Handlers
// ============================================================================

/**
 * GET /api/tickets/:id/actions-taken
 * Access:
 * - Administrator, IT_Staff: Can view actions for any ticket
 * - Requester: Can ONLY view actions for tickets they own (404 on cross-requester access)
 */
export const handleListActionsTaken = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticketNumber: true, requesterId: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const currentUser = req.user!;
    // Requester ticket isolation: Zero information leakage
    if (currentUser.role === "Requester" && ticket.requesterId !== currentUser.id) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      orderBy: { actionDateTime: "asc" },
      include: {
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return res.status(200).json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      totalActions: actions.length,
      actionsTaken: actions,
    });
  } catch (err) {
    console.error("handleListActionsTaken error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/tickets/:id/actions-taken
 * Access:
 * - Administrator, IT_Staff only (Requesters receive 403 Forbidden)
 */
export const handleCreateActionTaken = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const {
      description,
      result,
      followUpRequired,
      followUpNote,
      attachmentNotes,
      actionDateTime,
      performedById,
    } = req.body || {};

    // 1. Validate description (min 5 characters)
    if (typeof description !== "string" || description.trim().length < 5) {
      return res.status(400).json({ error: "Description must be at least 5 characters" });
    }

    // 2. Validate result (min 5 characters)
    if (typeof result !== "string" || result.trim().length < 5) {
      return res.status(400).json({ error: "Result must be at least 5 characters" });
    }

    // 3. Validate follow-up conditional requirements
    const isFollowUpRequired = Boolean(followUpRequired);
    let sanitizedFollowUpNote: string | null = null;

    if (isFollowUpRequired) {
      if (typeof followUpNote !== "string" || followUpNote.trim().length < 5) {
        return res.status(400).json({
          error: "Follow-up note is required when follow-up is requested (min 5 characters)",
        });
      }
      sanitizedFollowUpNote = followUpNote.trim();
    } else if (typeof followUpNote === "string" && followUpNote.trim().length > 0) {
      sanitizedFollowUpNote = followUpNote.trim();
    }

    // 4. Validate actionDateTime if provided
    let parsedActionDateTime = new Date();
    if (actionDateTime !== undefined && actionDateTime !== null) {
      const d = new Date(actionDateTime);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: "Invalid actionDateTime format" });
      }
      parsedActionDateTime = d;
    }

    // 5. Determine performedById (defaults to authenticated user)
    let targetPerformedById = req.user!.id;
    if (performedById !== undefined && performedById !== null) {
      const parsedStaffId = parseInt(performedById, 10);
      if (isNaN(parsedStaffId) || parsedStaffId <= 0) {
        return res.status(400).json({ error: "Invalid staff member for performedById" });
      }

      const targetStaff = await prisma.user.findUnique({
        where: { id: parsedStaffId },
        select: { id: true, role: true, isActive: true },
      });

      if (!targetStaff || !targetStaff.isActive || (targetStaff.role !== "IT_Staff" && targetStaff.role !== "Administrator")) {
        return res.status(400).json({ error: "Invalid staff member for performedById" });
      }
      targetPerformedById = targetStaff.id;
    }

    // 6. Create ActionTaken in database
    const action = await prisma.actionTaken.create({
      data: {
        ticketId,
        performedById: targetPerformedById,
        actionDateTime: parsedActionDateTime,
        description: description.trim(),
        result: result.trim(),
        followUpRequired: isFollowUpRequired,
        followUpNote: sanitizedFollowUpNote,
        attachmentNotes: typeof attachmentNotes === "string" && attachmentNotes.trim().length > 0 ? attachmentNotes.trim() : null,
      },
      include: {
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // 7. Audit log
    try {
      await prisma.activityLog.create({
        data: {
          ticketId,
          userId: req.user!.id,
          action: "ACTION_TAKEN_RECORDED",
          details: `Action recorded by ${action.performedBy.name}: ${action.description.substring(0, 60)}`,
        },
      });
    } catch (logErr) {
      console.warn("Notice: could not create activityLog for action taken:", logErr);
    }

    return res.status(201).json(action);
  } catch (err) {
    console.error("handleCreateActionTaken error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PATCH /api/tickets/:id/actions-taken/:actionId
 * Access:
 * - Administrator, IT_Staff only
 */
export const handleUpdateActionTaken = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    const actionId = parseInt(req.params.actionId, 10);

    if (isNaN(ticketId) || ticketId <= 0 || isNaN(actionId) || actionId <= 0) {
      return res.status(400).json({ error: "Invalid ticket ID or action ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const existingAction = await prisma.actionTaken.findFirst({
      where: { id: actionId, ticketId },
    });

    if (!existingAction) {
      return res.status(404).json({ error: "Action taken not found" });
    }

    const {
      description,
      result,
      followUpRequired,
      followUpNote,
      attachmentNotes,
      actionDateTime,
      performedById,
    } = req.body || {};

    const updateData: any = {};

    // Validate description if provided
    if (description !== undefined) {
      if (typeof description !== "string" || description.trim().length < 5) {
        return res.status(400).json({ error: "Description must be at least 5 characters" });
      }
      updateData.description = description.trim();
    }

    // Validate result if provided
    if (result !== undefined) {
      if (typeof result !== "string" || result.trim().length < 5) {
        return res.status(400).json({ error: "Result must be at least 5 characters" });
      }
      updateData.result = result.trim();
    }

    // Validate follow-up conditional requirements
    const effectiveFollowUpRequired = followUpRequired !== undefined ? Boolean(followUpRequired) : existingAction.followUpRequired;
    if (effectiveFollowUpRequired) {
      const candidateNote = followUpNote !== undefined ? followUpNote : existingAction.followUpNote;
      if (typeof candidateNote !== "string" || candidateNote.trim().length < 5) {
        return res.status(400).json({
          error: "Follow-up note is required when follow-up is requested (min 5 characters)",
        });
      }
      updateData.followUpRequired = true;
      updateData.followUpNote = candidateNote.trim();
    } else {
      if (followUpRequired !== undefined) {
        updateData.followUpRequired = false;
      }
      if (followUpNote !== undefined) {
        updateData.followUpNote = typeof followUpNote === "string" && followUpNote.trim().length > 0 ? followUpNote.trim() : null;
      }
    }

    if (attachmentNotes !== undefined) {
      updateData.attachmentNotes = typeof attachmentNotes === "string" && attachmentNotes.trim().length > 0 ? attachmentNotes.trim() : null;
    }

    if (actionDateTime !== undefined) {
      const d = new Date(actionDateTime);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: "Invalid actionDateTime format" });
      }
      updateData.actionDateTime = d;
    }

    if (performedById !== undefined) {
      const parsedStaffId = parseInt(performedById, 10);
      if (isNaN(parsedStaffId) || parsedStaffId <= 0) {
        return res.status(400).json({ error: "Invalid staff member for performedById" });
      }

      const targetStaff = await prisma.user.findUnique({
        where: { id: parsedStaffId },
        select: { id: true, role: true, isActive: true },
      });

      if (!targetStaff || !targetStaff.isActive || (targetStaff.role !== "IT_Staff" && targetStaff.role !== "Administrator")) {
        return res.status(400).json({ error: "Invalid staff member for performedById" });
      }
      updateData.performedById = targetStaff.id;
    }

    const updated = await prisma.actionTaken.update({
      where: { id: actionId },
      data: updateData,
      include: {
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error("handleUpdateActionTaken error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================================================
// Route Registrations
// ============================================================================

actionsRouter.get(
  "/:id/actions-taken",
  authenticateToken,
  requirePasswordChanged,
  handleListActionsTaken
);

actionsRouter.post(
  "/:id/actions-taken",
  authenticateToken,
  requirePasswordChanged,
  requireRole(["IT_Staff", "Administrator"]),
  handleCreateActionTaken
);

actionsRouter.patch(
  "/:id/actions-taken/:actionId",
  authenticateToken,
  requirePasswordChanged,
  requireRole(["IT_Staff", "Administrator"]),
  handleUpdateActionTaken
);
