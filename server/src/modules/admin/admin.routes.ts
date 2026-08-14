import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/admin.js";
import {
  adminSummary,
  approveBrand,
  listBrandApplications,
  listCommissionTiers,
  rejectBrand,
  unlinkStoreOwner,
  updateCommissionTier,
  updateProductImage,
} from "./admin.controller.js";

export const adminRouter = Router();

// Every route below is admin-only.
adminRouter.use(requireAuth, asyncHandler(requireAdmin));

adminRouter.get("/summary", asyncHandler(adminSummary));
adminRouter.get("/brands", asyncHandler(listBrandApplications));
adminRouter.post("/brands/:id/approve", asyncHandler(approveBrand));
adminRouter.post("/brands/:id/reject", asyncHandler(rejectBrand));
adminRouter.post("/stores/:id/unlink-owner", asyncHandler(unlinkStoreOwner));
adminRouter.get("/commission-tiers", asyncHandler(listCommissionTiers));
adminRouter.patch("/commission-tiers/:id", asyncHandler(updateCommissionTier));
adminRouter.patch("/products/:id/image", asyncHandler(updateProductImage));
