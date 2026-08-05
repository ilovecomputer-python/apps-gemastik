import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { analyzeScan, scanHistory } from "./scan.controller.js";

export const scanRouter = Router();

scanRouter.post("/:mode", optionalAuth, asyncHandler(analyzeScan));
scanRouter.get("/history", requireAuth, asyncHandler(scanHistory));
