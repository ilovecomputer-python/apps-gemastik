import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { applyAsBrand, listSpotlightBrands } from "./brands.controller.js";

/**
 * Applications create rows, so cap how fast one client can submit them.
 * Nobody legitimately registers this many brands in an hour, but the ceiling
 * has to clear a full API test run, which exercises the rejected paths too.
 */
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Terlalu banyak pendaftaran. Coba lagi nanti.",
    },
  },
});

export const brandsRouter = Router();

brandsRouter.get("/spotlight", asyncHandler(listSpotlightBrands));
// Requires an account: the store is tied to the applicant so they get a
// Seller Center to manage it from once approved.
brandsRouter.post(
  "/apply",
  applyLimiter,
  requireAuth,
  asyncHandler(applyAsBrand),
);
