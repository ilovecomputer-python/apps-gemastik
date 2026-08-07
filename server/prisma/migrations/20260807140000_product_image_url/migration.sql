-- Product cards were rendering a flat colour swatch with initials for every
-- item. Real photography needs somewhere to live; nullable so products
-- without a sourced photo keep falling back to the swatch.
ALTER TABLE "products" ADD COLUMN "imageUrl" TEXT;
