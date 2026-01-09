import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name cannot be empty")
    .max(40, "Name must not exceed 40 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Name cannot be empty or whitespace-only",
    })
    .refine((val) => val === val.trim(), {
      message: "Name must not have leading or trailing spaces",
    }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name cannot be empty")
    .max(40, "Name must not exceed 40 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Name cannot be empty or whitespace-only",
    })
    .refine((val) => val === val.trim(), {
      message: "Name must not have leading or trailing spaces",
    }),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryIdSchema = z.string().uuid("Invalid category ID format");
