import { z } from "zod";

export const brandApplicationSchema = z.object({
  name: z.string().trim().min(2, "Nama brand minimal 2 karakter").max(60),
  tagline: z.string().trim().min(10, "Tagline minimal 10 karakter").max(120),
  story: z.string().trim().min(30, "Ceritakan brand-mu minimal 30 karakter").max(1000),
  city: z.string().trim().min(2).max(60),
  contactName: z.string().trim().min(2).max(80),
  contactEmail: z.string().trim().toLowerCase().email("Email tidak valid"),
});

export type BrandApplicationInput = z.infer<typeof brandApplicationSchema>;
