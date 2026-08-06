import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../middleware/async-handler.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { analyzeScan, scanHistory, scanStatus } from "./scan.controller.js";

/** Vision calls cost money, so cap how often a client can trigger them. */
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Terlalu banyak permintaan analisa. Tunggu sebentar ya.",
    },
  },
});

export const scanRouter = Router();

scanRouter.get("/status", asyncHandler(scanStatus));
scanRouter.get("/history", requireAuth, asyncHandler(scanHistory));
scanRouter.post("/", analyzeLimiter, optionalAuth, asyncHandler(analyzeScan));
