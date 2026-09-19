import { Router, Request, Response } from "express";
import crypto from "crypto";
import { getPrisma } from "../prisma.js";
import {
  authenticateToken,
  requirePasswordChanged,
  requireRole,
  hashPassword,
  validatePasswordStrength,
} from "../auth.js";

export const adminRouter = Router();

// Enforce authentication, password change check, and Administrator role only
adminRouter.use(authenticateToken);
adminRouter.use(requirePasswordChanged);
adminRouter.use(requireRole(["Administrator"]));

/**
 * Generates a cryptographically strong temporary password that satisfies password complexity:
 * Minimum 8 characters, at least one uppercase, one lowercase, and one number or special symbol.
 * Uses Fisher-Yates shuffle to ensure a statistically uniform distribution without bias.
 */
export function generateTemporaryPassword(): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const specials = "!@#$%^&*";
  const all = uppers + lowers + digits + specials;

  const getRandomChar = (chars: string) => chars[crypto.randomInt(0, chars.length)];

  const combined = [
    getRandomChar(uppers),
    getRandomChar(lowers),
    getRandomChar(digits),
    getRandomChar(specials),
    ...Array.from({ length: 8 }, () => getRandomChar(all)),
  ];

  // Fisher-Yates unbiased shuffle
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = combined[i];
    combined[i] = combined[j];
    combined[j] = temp;
  }

  return combined.join("");
}

/**
 * GET /api/admin/users
 * Returns list of all users, with optional search and role filtering.
 */
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const where: any = {};

    // Filter: search by name or email
    const search = (req.query.search || req.query.q) as string | undefined;
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    // Filter: by role (Requester, IT_Staff, Administrator)
    const role = req.query.role as string | undefined;
    if (role && role !== "All" && role.trim()) {
      where.role = role.trim();
    }

    // Filter: active status
    if (req.query.active !== undefined || req.query.isActive !== undefined) {
      const val = req.query.active !== undefined ? req.query.active : req.query.isActive;
      where.isActive = val === "true" || String(val) === "true";
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    });

    const formatted = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      active: u.isActive,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Failed to list users:", error);
    res.status(500).json({ error: "Failed to list users" });
  }
});

/**
 * POST /api/admin/users
 * Creates a new user with temporary password and mustChangePassword: true.
 * Rejects duplicate email addresses with 409 Conflict.
 */
adminRouter.post("/users", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const { name, email, role, active, isActive } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: "Name is required and must be between 2 and 100 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "Valid email address is required" });
    }

    const validRoles = ["Requester", "IT_Staff", "Administrator"];
    const targetRole = role ? role.trim() : "Requester";
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({ error: "Role must be one of: Requester, IT_Staff, Administrator" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check unique email across users (BR-12 / TC-ADMIN-05)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email address already registered" });
    }

    // Determine temporary initial password
    const explicitPassword =
      req.body.initialPassword || req.body.password || req.body.temporaryPassword;
    let plainPassword = explicitPassword;
    if (explicitPassword) {
      if (typeof explicitPassword !== "string") {
        return res.status(400).json({ error: "Initial password must be at least 8 characters" });
      }
      const strength = validatePasswordStrength(explicitPassword);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.reason });
      }
    } else {
      plainPassword = generateTemporaryPassword();
    }

    const passwordHash = await hashPassword(plainPassword);

    const userActive =
      active !== undefined ? Boolean(active) : isActive !== undefined ? Boolean(isActive) : true;

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        role: targetRole,
        passwordHash,
        isActive: userActive,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      isActive: created.isActive,
      active: created.isActive,
      mustChangePassword: created.mustChangePassword,
      initialPassword: plainPassword,
      temporaryPassword: plainPassword,
      message: "User created successfully",
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (error) {
    console.error("Failed to create user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Updates user name, role, and active status.
 * Enforces safety invariants:
 * 1. Admin cannot deactivate own account (400)
 * 2. Admin cannot deactivate or change role of the last active Administrator (400)
 * Evaluated atomically inside a transaction to prevent race conditions on concurrent deactivations.
 */
adminRouter.patch("/users/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId) || userId <= 0) {
      return res.status(404).json({ error: "Invalid user ID" });
    }

    const currentAdmin = req.user!;
    const { name, email, role, active, isActive } = req.body;

    const requestedActive =
      active !== undefined ? Boolean(active) : isActive !== undefined ? Boolean(isActive) : undefined;

    const runUpdate = async (client: any) => {
      const targetUser = await client.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return { status: 404, body: { error: "User not found" } };
      }

      // Safety Invariant 2: Cannot deactivate the last active Administrator (BR-14 / TC-ADMIN-08)
      if (requestedActive === false && targetUser.role === "Administrator" && targetUser.isActive) {
        const activeAdminCount = await client.user.count({
          where: { role: "Administrator", isActive: true },
        });
        if (activeAdminCount <= 1) {
          return { status: 400, body: { error: "Cannot deactivate the only active Administrator" } };
        }
      }

      // Safety Invariant 1: Admin cannot deactivate own account (BR-13 / TC-ADMIN-07)
      if (requestedActive === false && targetUser.id === currentAdmin.id) {
        return { status: 400, body: { error: "You cannot deactivate your own account" } };
      }

      // Safety Invariant 2b: Cannot change role of last active Administrator away from Administrator
      if (
        role &&
        role !== "Administrator" &&
        targetUser.role === "Administrator" &&
        targetUser.isActive
      ) {
        const activeAdminCount = await client.user.count({
          where: { role: "Administrator", isActive: true },
        });
        if (activeAdminCount <= 1) {
          return {
            status: 400,
            body: {
              error: "Cannot deactivate or change role of the last active Administrator",
            },
          };
        }
      }

      // Email uniqueness check if updated
      if (email && email.toLowerCase().trim() !== targetUser.email.toLowerCase()) {
        const normalizedEmail = email.toLowerCase().trim();
        const duplicate = await client.user.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: "insensitive" },
            NOT: { id: userId },
          },
        });
        if (duplicate) {
          return { status: 409, body: { error: "Email address already registered" } };
        }
      }

      const updateData: any = {};
      if (name && typeof name === "string" && name.trim()) {
        updateData.name = name.trim();
      }
      if (email && typeof email === "string" && email.trim()) {
        updateData.email = email.toLowerCase().trim();
      }
      if (role && ["Requester", "IT_Staff", "Administrator"].includes(role.trim())) {
        updateData.role = role.trim();
      }
      if (requestedActive !== undefined) {
        updateData.isActive = requestedActive;
      }

      const updated = await client.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        status: 200,
        body: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          isActive: updated.isActive,
          active: updated.isActive,
          mustChangePassword: updated.mustChangePassword,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      };
    };

    const result = typeof prisma.$transaction === "function"
      ? await prisma.$transaction(async (tx) => runUpdate(tx))
      : await runUpdate(prisma);

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Failed to update user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Generates a compliant temporary password, updates password hash, and sets mustChangePassword: true.
 */
adminRouter.post("/users/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId) || userId <= 0) {
      return res.status(404).json({ error: "Invalid user ID" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const explicitPassword =
      req.body?.newInitialPassword ||
      req.body?.newPassword ||
      req.body?.initialPassword ||
      req.body?.temporaryPassword;

    let plainPassword = explicitPassword;
    if (explicitPassword) {
      if (typeof explicitPassword !== "string") {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }
      const strength = validatePasswordStrength(explicitPassword);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.reason });
      }
    } else {
      plainPassword = generateTemporaryPassword();
    }

    const passwordHash = await hashPassword(plainPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    res.status(200).json({
      message: "Initial password reset successfully. User must change it at next login.",
      temporaryPassword: plainPassword,
      newInitialPassword: plainPassword,
      mustChangePassword: true,
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Hard deletion forbidden (BR-15 / TC-ADMIN-09). Preserves users for audit trail.
 */
adminRouter.delete("/users/:id", (_req: Request, res: Response) => {
  res.status(405).json({
    error: "Method Not Allowed: Hard delete is forbidden. Use soft deactivation instead.",
  });
});
