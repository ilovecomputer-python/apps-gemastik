import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { getProduct, listProducts } from "./products.controller.js";

export const productsRouter = Router();

productsRouter.get("/", asyncHandler(listProducts));
productsRouter.get("/:id", asyncHandler(getProduct));
