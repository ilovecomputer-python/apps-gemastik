import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/admin.js";
import {
  adminSummary,
  approveBrand,
  listBrandApplications,
  rejectBrand,
} from "./admin.controller.js";

export const adminRouter = Router();

// Every route below is admin-only.
adminRouter.use(requireAuth, asyncHandler(requireAdmin));

adminRouter.get("/summary", asyncHandler(adminSummary));
adminRouter.get("/brands", asyncHandler(listBrandApplications));
adminRouter.post("/brands/:id/approve", asyncHandler(approveBrand));
adminRouter.post("/brands/:id/reject", asyncHandler(rejectBrand));
