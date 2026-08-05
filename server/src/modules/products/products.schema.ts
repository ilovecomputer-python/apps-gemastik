import { z } from "zod";

export const listProductsQuerySchema = z.object({
  category: z.enum(["Skincare", "Makeup", "Bodycare"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  halal: z.coerce.boolean().optional(),
  umkm: z.coerce.boolean().optional(),
  sort: z.enum(["popular", "price-asc", "price-desc", "rating"]).default("popular"),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
