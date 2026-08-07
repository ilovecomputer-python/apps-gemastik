import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import {
  createProductReview,
  createStoreReview,
  listProductReviews,
  listStoreReviews,
  myReviewerStats,
  reviewFeed,
  toggleHelpful,
} from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.get("/reviews/feed", optionalAuth, asyncHandler(reviewFeed));

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
reviewsRouter.get(
  "/brands/:storeId/reviews",
  optionalAuth,
  asyncHandler(listStoreReviews),
);
reviewsRouter.post(
  "/brands/:storeId/reviews",
  requireAuth,
  asyncHandler(createStoreReview),
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
