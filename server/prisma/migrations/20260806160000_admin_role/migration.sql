-- Admin mode: brand applications arrive as PENDING but nothing could review
-- them. Only users with role ADMIN may approve or reject.
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
