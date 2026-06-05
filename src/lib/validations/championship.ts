import { z } from "zod";

export const createLeagueSchema = z.object({
  name: z.string().min(1).max(60),
  matchupDays: z.number().int().min(7).max(28).optional(),
});

export const joinLeagueSchema = z.object({
  joinCode: z.string().min(4).max(10),
});
