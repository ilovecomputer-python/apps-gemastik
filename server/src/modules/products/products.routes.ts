import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import {
  getProduct,
  listNewProducts,
  listProducts,
} from "./products.controller.js";

export const productsRouter = Router();

productsRouter.get("/", asyncHandler(listProducts));
// Must precede "/:id", otherwise "new" is read as a product id.
productsRouter.get("/new", asyncHandler(listNewProducts));
productsRouter.get("/:id", asyncHandler(getProduct));
