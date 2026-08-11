import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  advanceOrderStatus,
  createMyProduct,
  getMyFinance,
  getMyStore,
  listMyOrders,
  listMyProducts,
} from "./seller.controller.js";

export const sellerRouter = Router();

sellerRouter.use(requireAuth);
sellerRouter.get("/store", asyncHandler(getMyStore));
sellerRouter.get("/finance", asyncHandler(getMyFinance));
sellerRouter.get("/products", asyncHandler(listMyProducts));
sellerRouter.post("/products", asyncHandler(createMyProduct));
sellerRouter.get("/orders", asyncHandler(listMyOrders));
sellerRouter.patch("/orders/:id/advance", asyncHandler(advanceOrderStatus));
