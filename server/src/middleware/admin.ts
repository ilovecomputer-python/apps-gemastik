import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";

/**
 * Gate for admin-only routes. Runs after requireAuth and re-reads the role
 * from the database rather than trusting the JWT, so revoking someone's admin
 * rights takes effect immediately instead of when their token expires.
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      next(HttpError.forbidden("Butuh akses admin", "ADMIN_ONLY"));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
