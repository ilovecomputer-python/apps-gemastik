import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import {
  createProductReview,
  listProductReviews,
  myReviewerStats,
  toggleHelpful,
} from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.get(
  "/products/:productId/reviews",
  optionalAuth,
  asyncHandler(listProductReviews),
);
reviewsRouter.post(
  "/products/:productId/reviews",
  requireAuth,
  asyncHandler(createProductReview),
);
reviewsRouter.post(
  "/reviews/:reviewId/helpful",
  requireAuth,
  asyncHandler(toggleHelpful),
);
reviewsRouter.get(
  "/users/me/reviewer-stats",
  requireAuth,
  asyncHandler(myReviewerStats),
);
