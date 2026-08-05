import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  createAddress,
  deleteAddress,
  listAddresses,
} from "./addresses.controller.js";

export const addressesRouter = Router();

addressesRouter.use(requireAuth);
addressesRouter.get("/", asyncHandler(listAddresses));
addressesRouter.post("/", asyncHandler(createAddress));
addressesRouter.delete("/:id", asyncHandler(deleteAddress));
