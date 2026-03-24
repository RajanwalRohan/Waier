import { z } from "zod";
import { emailSchema, passwordSchema, safeString } from "./common";

export const signupSchema = z.object({
  name: safeString(100).optional(),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
