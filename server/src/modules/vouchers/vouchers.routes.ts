import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import {
  listVouchers,
  myVouchers,
  redeemVoucher,
} from "./vouchers.controller.js";

export const vouchersRouter = Router();

// Browsable logged out; the points balance is simply null then.
vouchersRouter.get("/", optionalAuth, asyncHandler(listVouchers));
vouchersRouter.get("/mine", requireAuth, asyncHandler(myVouchers));
vouchersRouter.post("/:id/redeem", requireAuth, asyncHandler(redeemVoucher));
