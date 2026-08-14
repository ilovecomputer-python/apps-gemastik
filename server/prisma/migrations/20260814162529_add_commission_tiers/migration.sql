-- CreateTable
CREATE TABLE "commission_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minGmv" INTEGER NOT NULL,
    "maxGmv" INTEGER,
    "feePercent" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commission_tiers_sortOrder_key" ON "commission_tiers"("sortOrder");
