// Schema estricto con Zod
import { z } from "zod";

export const respondentInfoSchema = z.object({
  name: z.string().min(2),
  age: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  email: z.string().email().optional(),
});

export type RespondentInfo = z.infer<typeof respondentInfoSchema>;
