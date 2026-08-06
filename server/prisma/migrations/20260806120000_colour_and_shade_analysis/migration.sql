-- Personal colour analysis: store the rated perceptual axes alongside the
-- derived season, so a stored result stays explainable even if the derivation
-- table changes later.
ALTER TABLE "scan_results" ADD COLUMN "colourValue" TEXT;
ALTER TABLE "scan_results" ADD COLUMN "colourChroma" TEXT;
ALTER TABLE "scan_results" ADD COLUMN "season" TEXT;

-- Skin shade analysis: Fitzpatrick phototype (I-VI as 1-6) and the catalogue
-- shade code it matched to.
ALTER TABLE "scan_results" ADD COLUMN "fitzpatrick" INTEGER;
ALTER TABLE "scan_results" ADD COLUMN "matchedShade" TEXT;

-- The scan no longer analyses face shape; the three modes were merged into one.
ALTER TABLE "scan_results" DROP COLUMN IF EXISTS "faceShape";
