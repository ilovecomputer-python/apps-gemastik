import { z } from "zod";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Accepts either a full data URL ("data:image/jpeg;base64,....") or a bare
 * base64 payload plus an explicit mimeType.
 */
export const analyzeScanSchema = z
  .object({
    image: z.string().min(32, "Gambar tidak valid"),
    mimeType: z.enum(ALLOWED_MIME).optional(),
  })
  .transform((input, ctx) => {
    let mimeType = input.mimeType as string | undefined;
    let base64 = input.image.trim();

    const dataUrl = base64.match(
      /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i,
    );
    if (dataUrl) {
      mimeType = dataUrl[1].toLowerCase().replace("image/jpg", "image/jpeg");
      base64 = dataUrl[2];
    }

    if (!mimeType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Format gambar tidak dikenali. Gunakan JPEG, PNG, atau WebP.",
      });
      return z.NEVER;
    }

    base64 = base64.replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data gambar rusak.",
      });
      return z.NEVER;
    }

    // base64 inflates by ~4/3; check decoded size against the limit.
    const approxBytes = Math.floor((base64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ukuran gambar maksimal 6MB.",
      });
      return z.NEVER;
    }

    return { base64, mimeType };
  });

export type AnalyzeScanInput = z.infer<typeof analyzeScanSchema>;
