import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getPrisma } from "./prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "toktickit-super-secret-jwt-key-lab3-2026";
const JWT_EXPIRES_IN = "24h";

export type UserRole = "Requester" | "IT_Staff" | "Administrator";

export interface TokenPayload {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
}

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compares plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Issues a signed JWT token containing the user identity and mustChangePassword flag.
 */
export function signToken(user: { id: number; email: string; name: string; role: string; mustChangePassword: boolean }): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    mustChangePassword: user.mustChangePassword,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies and decodes a JWT token.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Validates password complexity: >=8 chars, at least one uppercase, one lowercase, and one digit or symbol.
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters long" };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[\d\W]/.test(password);

  if (!hasUpper) {
    return { valid: false, reason: "Password must contain at least one uppercase letter" };
  }
  if (!hasLower) {
    return { valid: false, reason: "Password must contain at least one lowercase letter" };
  }
  if (!hasNumberOrSymbol) {
    return { valid: false, reason: "Password must contain at least one number or special symbol" };
  }
  return { valid: true };
}

/**
 * Express middleware to authenticate Bearer token.
 * Populates req.user if valid and ensures user is still active in database.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication token required" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, mustChangePassword: true },
    });

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account has been deactivated" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * Express middleware to ensure the user does not have a mandatory password change pending.
 * If mustChangePassword is true, block access with 403 and code PASSWORD_CHANGE_REQUIRED.
 */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      error: "You must change your password before continuing",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
  }
  next();
}

/**
 * Express middleware factory to restrict access to specific roles.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions for this action" });
    }
    next();
  };
}
