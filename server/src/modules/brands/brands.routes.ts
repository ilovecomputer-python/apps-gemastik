import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../middleware/async-handler.js";
import { applyAsBrand, listSpotlightBrands } from "./brands.controller.js";

/** Applications create rows, so cap how fast one client can submit them. */
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
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
brandsRouter.post("/apply", applyLimiter, asyncHandler(applyAsBrand));
