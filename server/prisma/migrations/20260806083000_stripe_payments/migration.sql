-- AlterTable: track the Stripe PaymentIntent that settles an order.
-- Nullable because COD orders never touch the gateway; unique so a replayed
-- webhook can never create or settle a second order for the same intent.
ALTER TABLE "orders" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "orders" ADD COLUMN "paidAt" TIMESTAMP(3);

-- AlterTable: how a payment method settles.
ALTER TABLE "payment_methods" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'cod';

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripePaymentIntentId_key" ON "orders"("stripePaymentIntentId");
