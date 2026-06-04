import { z } from "zod";

export const medicationSchema = z.object({
  name: z.string().min(1).max(100),
  dosage: z.string().max(60).optional(),
  frequency: z.string().max(60).optional(),
  startDate: z.coerce.date().optional(),
  prescriber: z.string().max(80).optional(),
  reminderEnabled: z.boolean().optional(),
});

export const medicalRecordSchema = z.object({
  type: z.enum(["procedure", "vaccine", "doctor_visit"]),
  name: z.string().min(1).max(120),
  date: z.coerce.date().optional(),
  providerName: z.string().max(80).optional(),
  detail: z.string().max(400).optional(),
});

export const labResultSchema = z.object({
  testName: z.string().min(1).max(60),
  value: z.number().finite(),
  unit: z.string().max(20).optional(),
  refRangeLow: z.number().finite().optional(),
  refRangeHigh: z.number().finite().optional(),
  panel: z.string().max(60).optional(),
  collectedAt: z.coerce.date().optional(),
});
