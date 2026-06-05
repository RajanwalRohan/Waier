import { z } from "zod";

export const uploadPhotoSchema = z.object({
  // A compressed image data URL. The client downscales before upload.
  dataUrl: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/, "Must be a JPEG, PNG, or WebP image")
    .max(3_000_000, "Image too large; it should be compressed before upload"),
  kind: z.enum(["body", "meal"]).optional(),
  date: z.coerce.date().optional(),
});
