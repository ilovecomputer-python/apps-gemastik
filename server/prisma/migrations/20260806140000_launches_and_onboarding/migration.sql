-- New product launching: when a product actually went on sale. Separate from
-- createdAt so seeding or a data migration doesn't make everything look new.
ALTER TABLE "products" ADD COLUMN "launchedAt" TIMESTAMP(3);

-- Brand on-boarding: applications arrive as PENDING and stay hidden from
-- shoppers until reviewed. Existing seeded brands default to APPROVED.
ALTER TABLE "stores" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "stores" ADD COLUMN "contactName" TEXT;
ALTER TABLE "stores" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "stores" ADD COLUMN "city" TEXT;
ALTER TABLE "stores" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
