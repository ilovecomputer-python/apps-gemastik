-- Seller Center: a brand needs an owner, otherwise an approved application has
-- nowhere to lead and the seller can never manage their own store.
ALTER TABLE "stores" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "stores" ADD CONSTRAINT "stores_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Vouchers give points something to be spent on; without them the reviewer
-- rewards were a scoreboard with nothing behind it.
CREATE TABLE "vouchers" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "pointsCost" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL,
  "minSpend" INTEGER NOT NULL DEFAULT 0,
  "validForDays" INTEGER NOT NULL DEFAULT 30,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

CREATE TABLE "user_vouchers" (
  "id" TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "voucherId" TEXT NOT NULL,
  "orderId" TEXT,
  CONSTRAINT "user_vouchers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_vouchers_userId_idx" ON "user_vouchers"("userId");
-- Unique so one voucher can never be applied to two orders.
CREATE UNIQUE INDEX "user_vouchers_orderId_key" ON "user_vouchers"("orderId");

ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0;
