import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  createPaymentIntent,
  getPaymentStatus,
  paymentsStatus,
} from "./payments.controller.js";

export const paymentsRouter = Router();

paymentsRouter.get("/status", asyncHandler(paymentsStatus));
paymentsRouter.post("/intent", requireAuth, asyncHandler(createPaymentIntent));
paymentsRouter.get(
  "/orders/:orderId",
  requireAuth,
  asyncHandler(getPaymentStatus),
);
