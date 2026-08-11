import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(3, "Nama produk minimal 3 karakter").max(80),
  price: z.coerce.number().int().min(1000, "Harga minimal Rp1.000").max(50_000_000),
  category: z.enum(["SKINCARE", "MAKEUP", "BODYCARE"]),
  description: z
    .string()
    .trim()
    .min(30, "Deskripsi minimal 30 karakter")
    .max(1000),
  /** Must match the taxonomy in quiz.scoring.ts so the beauty quiz can recommend this product. */
  concerns: z
    .array(z.enum(["acne", "blackheads", "dark_spots", "pores", "wrinkles"]))
    .max(5)
    .default([]),
  shades: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  halal: z.boolean().default(false),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Warna harus format hex, misal #D3968C")
    .default("#839958"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
