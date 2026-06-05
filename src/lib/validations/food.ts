import { z } from "zod";

export const savePersonalFoodSchema = z.object({
  barcode: z.string().regex(/^\d{8,14}$/),
  name: z.string().min(1).max(100),
  calories: z.number().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  fiberG: z.number().nonnegative().optional(),
  serving: z.string().max(40).optional(),
});
