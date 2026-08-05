import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  addToWishlist,
  listWishlist,
  removeFromWishlist,
} from "./wishlist.controller.js";

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);
wishlistRouter.get("/", asyncHandler(listWishlist));
wishlistRouter.post("/:productId", asyncHandler(addToWishlist));
wishlistRouter.delete("/:productId", asyncHandler(removeFromWishlist));
