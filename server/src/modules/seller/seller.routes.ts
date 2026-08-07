import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  createMyProduct,
  getMyStore,
  listMyProducts,
} from "./seller.controller.js";

export const sellerRouter = Router();

sellerRouter.use(requireAuth);
sellerRouter.get("/store", asyncHandler(getMyStore));
sellerRouter.get("/products", asyncHandler(listMyProducts));
sellerRouter.post("/products", asyncHandler(createMyProduct));
