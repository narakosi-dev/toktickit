import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requirePasswordChanged, requireRole } from "../auth.js";

export const commentsRouter = Router();

// ============================================================================
// Public Comments Handlers
// ============================================================================

/**
 * POST /api/tickets/:id/comments
 * Accessible to ticket's Requester (must own ticket), IT Staff, and Administrator
 */
export const handleCreateComment = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, status: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const currentUser = req.user!;

    // Requester ticket isolation (BR-07): Requesters may only comment on own tickets
    if (currentUser.role === "Requester" && ticket.requesterId !== currentUser.id) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const rawContent = req.body?.content;
    if (typeof rawContent !== "string") {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const trimmedContent = rawContent.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 1000) {
      return res.status(400).json({
        error: "Comment content must be between 1 and 1000 characters",
      });
    }

    const comment = await prisma.publicComment.create({
      data: {
        ticketId,
        userId: currentUser.id,
        content: trimmedContent,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    try {
      await prisma.activityLog.create({
        data: {
          ticketId,
          userId: currentUser.id,
          action: "PUBLIC_COMMENT_ADDED",
          details: `Public comment added by ${currentUser.name} (${currentUser.role})`,
        },
      });
    } catch (logErr) {
      console.error("Failed to create activity log for public comment:", logErr);
    }

    res.status(201).json({
      id: comment.id,
      ticketId: comment.ticketId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user,
      author: comment.user,
    });
  } catch (error) {
    console.error("Failed to create public comment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /api/tickets/:id/comments
 * Accessible to ticket's Requester (must own ticket), IT Staff, and Administrator
 */
export const handleGetComments = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const currentUser = req.user!;

    // Requester ticket isolation (BR-07)
    if (currentUser.role === "Requester" && ticket.requesterId !== currentUser.id) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = comments.map((c: any) => ({
      id: c.id,
      ticketId: c.ticketId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt,
      user: c.user,
      author: c.user,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Failed to get public comments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Append-only enforcement for comments (BR-10 / TC-COMM-09)
 */
export const handleCommentAppendOnly = (_req: Request, res: Response) => {
  res.status(405).json({ error: "Method Not Allowed: Comments are append-only" });
};

// ============================================================================
// Internal Notes Handlers
// ============================================================================

/**
 * POST internal note handler (accessible strictly to IT_Staff and Administrator)
 */
export const handleCreateInternalNote = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const currentUser = req.user!;

    const rawContent = req.body?.content;
    if (typeof rawContent !== "string") {
      return res.status(400).json({ error: "Note content is required" });
    }

    const trimmedContent = rawContent.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 1000) {
      return res.status(400).json({
        error: "Note content must be between 1 and 1000 characters",
      });
    }

    const note = await prisma.internalNote.create({
      data: {
        ticketId,
        userId: currentUser.id,
        content: trimmedContent,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    try {
      await prisma.activityLog.create({
        data: {
          ticketId,
          userId: currentUser.id,
          action: "INTERNAL_NOTE_ADDED",
          details: `Internal note added by ${currentUser.name} (${currentUser.role})`,
        },
      });
    } catch (logErr) {
      console.error("Failed to create activity log for internal note:", logErr);
    }

    res.status(201).json({
      id: note.id,
      ticketId: note.ticketId,
      userId: note.userId,
      content: note.content,
      createdAt: note.createdAt,
      user: note.user,
      author: note.user,
    });
  } catch (error) {
    console.error("Failed to create internal note:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET internal notes handler (accessible strictly to IT_Staff and Administrator)
 */
export const handleGetInternalNotes = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "Invalid ticket ID" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = notes.map((n: any) => ({
      id: n.id,
      ticketId: n.ticketId,
      userId: n.userId,
      content: n.content,
      createdAt: n.createdAt,
      user: n.user,
      author: n.user,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Failed to get internal notes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Append-only enforcement for internal notes (BR-10 / TC-COMM-09)
 */
export const handleNoteAppendOnly = (_req: Request, res: Response) => {
  res.status(405).json({ error: "Method Not Allowed: Internal notes are append-only" });
};

// ============================================================================
// Comments Router Routes (/api/tickets/...)
// ============================================================================

// Public comments routes
commentsRouter.post(
  "/:id/comments",
  authenticateToken,
  requirePasswordChanged,
  handleCreateComment
);
commentsRouter.get(
  "/:id/comments",
  authenticateToken,
  requirePasswordChanged,
  handleGetComments
);
commentsRouter.all("/:id/comments/:commentId", handleCommentAppendOnly);

// Internal notes routes under /api/tickets/:id/notes and /api/tickets/:id/internal-notes
// Explicitly protected by requireRole(["IT_Staff", "Administrator"])
const staffOnlyAuth = [
  authenticateToken,
  requirePasswordChanged,
  requireRole(["IT_Staff", "Administrator"]),
];

commentsRouter.post("/:id/notes", staffOnlyAuth, handleCreateInternalNote);
commentsRouter.get("/:id/notes", staffOnlyAuth, handleGetInternalNotes);
commentsRouter.all("/:id/notes/:noteId", handleNoteAppendOnly);

commentsRouter.post("/:id/internal-notes", staffOnlyAuth, handleCreateInternalNote);
commentsRouter.get("/:id/internal-notes", staffOnlyAuth, handleGetInternalNotes);
commentsRouter.all("/:id/internal-notes/:noteId", handleNoteAppendOnly);
