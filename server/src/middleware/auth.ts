import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../lib/jwt.js";
import { HttpError } from "../lib/http-error.js";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    next(HttpError.unauthorized("Silakan login terlebih dahulu"));
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(HttpError.unauthorized("Sesi tidak valid atau sudah kedaluwarsa"));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.sub;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}
