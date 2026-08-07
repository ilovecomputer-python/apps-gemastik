-- A review can now be about a brand instead of a product, so a shopper can
-- vouch for a new UMKM seller directly rather than only through one of its
-- items. The existing (userId, productId) unique index still works once
-- productId is nullable - Postgres treats NULLs as distinct, so it never
-- blocks a user's one-and-only brand review.
ALTER TABLE "reviews" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "reviews" ADD COLUMN "storeId" TEXT;

CREATE UNIQUE INDEX "reviews_userId_storeId_key" ON "reviews"("userId", "storeId");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
