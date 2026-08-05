import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  addToCart,
  clearCart,
  decrementCartItem,
  listCart,
  removeCartItem,
} from "./cart.controller.js";

export const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.get("/", asyncHandler(listCart));
cartRouter.post("/:productId", asyncHandler(addToCart));
cartRouter.post("/:productId/decrement", asyncHandler(decrementCartItem));
cartRouter.delete("/:productId", asyncHandler(removeCartItem));
cartRouter.delete("/", asyncHandler(clearCart));
