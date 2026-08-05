import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { listPaymentMethods, listShippingOptions } from "./meta.controller.js";

export const metaRouter = Router();

metaRouter.get("/shipping-options", asyncHandler(listShippingOptions));
metaRouter.get("/payment-methods", asyncHandler(listPaymentMethods));
