import { z } from "zod";

export const updateProfileSchema = z.object({
  timezone: z.string().min(1, "Timezone is required").max(64, "Timezone must be at most 64 characters"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
