import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes.js";
import { cartRouter } from "./modules/cart/cart.routes.js";
import { addressesRouter } from "./modules/addresses/addresses.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { scanRouter } from "./modules/scan/scan.routes.js";
import { metaRouter } from "./modules/meta/meta.routes.js";
import { subscriptionRouter } from "./modules/subscription/subscription.routes.js";
import { quizRouter } from "./modules/quiz/quiz.routes.js";
import { brandsRouter } from "./modules/brands/brands.routes.js";
import { reviewsRouter } from "./modules/reviews/reviews.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { sellerRouter } from "./modules/seller/seller.routes.js";
import { vouchersRouter } from "./modules/vouchers/vouchers.routes.js";
import { stripeWebhook } from "./modules/payments/payments.controller.js";
import { asyncHandler } from "./middleware/async-handler.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  // Stripe signs the exact request bytes, so this route must see the raw body
  // and therefore has to be mounted ahead of the JSON parser.
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    asyncHandler(stripeWebhook),
  );

  // Generous enough for a base64 selfie sent to the AI scan endpoint.
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", apiLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/wishlist", wishlistRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/addresses", addressesRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/scan", scanRouter);
  app.use("/api/subscription", subscriptionRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/seller", sellerRouter);
  app.use("/api/vouchers", vouchersRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/quiz", quizRouter);
  app.use("/api/brands", brandsRouter);
  app.use("/api", reviewsRouter);
  app.use("/api", metaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
