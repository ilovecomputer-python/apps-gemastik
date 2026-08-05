import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  cancelSubscription,
  getMySubscription,
  listPlans,
  subscribe,
} from "./subscription.controller.js";

export const subscriptionRouter = Router();

subscriptionRouter.get("/plans", asyncHandler(listPlans));
subscriptionRouter.get("/", requireAuth, asyncHandler(getMySubscription));
subscriptionRouter.post("/subscribe", requireAuth, asyncHandler(subscribe));
subscriptionRouter.post("/cancel", requireAuth, asyncHandler(cancelSubscription));
