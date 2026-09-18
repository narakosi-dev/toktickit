import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  authenticateToken,
  comparePassword,
  hashPassword,
  signToken,
  validatePasswordStrength,
} from "../auth.js";

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns JWT token and sanitized profile.
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account has been deactivated. Please contact IT Administrator." });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/logout
 * Stateless token logout confirmation.
 */
authRouter.post("/logout", (_req: Request, res: Response) => {
  return res.status(200).json({ message: "Logged out successfully" });
});

/**
 * GET /api/auth/me
 * Returns currently authenticated user profile.
 */
authRouter.get("/me", authenticateToken, (req: Request, res: Response) => {
  return res.status(200).json({ user: req.user });
});

/**
 * POST /api/auth/change-password
 * Changes the authenticated user's password.
 * Clears mustChangePassword and returns a refreshed token.
 */
authRouter.post("/change-password", authenticateToken, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }

  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const newHash = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    const newToken = signToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      mustChangePassword: false,
    });

    return res.status(200).json({
      message: "Password changed successfully",
      token: newToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
