import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createOrder, getOrder, listOrders } from "./orders.controller.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.get("/", asyncHandler(listOrders));
ordersRouter.post("/", asyncHandler(createOrder));
ordersRouter.get("/:id", asyncHandler(getOrder));
