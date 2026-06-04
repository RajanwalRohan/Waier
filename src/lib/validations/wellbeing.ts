import { z } from "zod";

/** Daily mood / energy / focus check-in. Each axis is a 1-5 self-report. */
export const moodCheckInSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  focus: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

export type MoodCheckInInput = z.infer<typeof moodCheckInSchema>;
