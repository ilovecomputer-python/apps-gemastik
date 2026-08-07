import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { login, me, register } from "./auth.controller.js";

const rateLimited = {
  error: {
    code: "RATE_LIMITED",
    message: "Terlalu banyak percobaan, coba lagi nanti",
  },
};

/**
 * Brute-force protection counts *failures* only. Indonesian mobile networks put
 * huge numbers of subscribers behind one carrier-grade NAT address, so a limiter
 * that counted successful logins too would lock a whole cell out of their own
 * accounts once twenty neighbours had signed in.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimited,
});

/**
 * Sign-up has to count every attempt, because a successful one is exactly what
 * an abuser wants. The ceiling is per hour rather than per quarter-hour so it
 * clears a full smoke test plus API suite run without weakening the control.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimited,
});

export const authRouter = Router();

authRouter.post("/register", registerLimiter, asyncHandler(register));
authRouter.post("/login", loginLimiter, asyncHandler(login));
authRouter.get("/me", requireAuth, asyncHandler(me));
