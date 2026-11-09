import { z } from "zod";
import { CommonServerResponseSchema } from "./common.schema";

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const SkillListResponseSchema = CommonServerResponseSchema(
  z.array(SkillSchema),
);

export type Skill = z.infer<typeof SkillSchema>;
export type SkillListResponse = z.infer<typeof SkillListResponseSchema>;
