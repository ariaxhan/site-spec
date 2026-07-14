import { z } from "zod";
import { finding } from "./policy";

export const validationResult = z.object({
  ok: z.boolean(),
  findings: z.array(finding),
});

export type ValidationResult = z.infer<typeof validationResult>;
