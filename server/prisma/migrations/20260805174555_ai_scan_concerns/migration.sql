-- AlterTable
ALTER TABLE "products" ADD COLUMN     "concerns" TEXT[];

-- AlterTable
ALTER TABLE "scan_results" ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "faceShape" TEXT,
ADD COLUMN     "skinType" TEXT,
ADD COLUMN     "undertone" TEXT;
