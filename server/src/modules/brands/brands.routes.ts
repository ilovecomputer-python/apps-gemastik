import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { listSpotlightBrands } from "./brands.controller.js";

export const brandsRouter = Router();

brandsRouter.get("/spotlight", asyncHandler(listSpotlightBrands));
