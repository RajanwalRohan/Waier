import { z } from "zod";

export const logCycleSchema = z.object({
  kind: z.enum(["period_start", "period_end", "symptom"]),
  date: z.coerce.date().optional(),
  flow: z.enum(["light", "medium", "heavy"]).optional(),
  symptoms: z.array(z.string().max(30)).max(12).optional(),
  note: z.string().max(200).optional(),
});

export type LogCycleInput = z.infer<typeof logCycleSchema>;
