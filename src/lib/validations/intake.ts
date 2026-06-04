import { z } from "zod";

export const addHydrationSchema = z.object({
  amountMl: z.number().int().min(1).max(5000),
});

export const addModifierSchema = z.object({
  kind: z.enum(["caffeine", "alcohol", "supplement", "sleep_aid"]),
  name: z.string().max(60).optional(),
  amount: z.number().finite().nonnegative().optional(),
  unit: z.string().max(12).optional(),
  note: z.string().max(200).optional(),
});

export type AddModifierInput = z.infer<typeof addModifierSchema>;
