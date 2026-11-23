import { parseSchema } from "@/lib/schemaValidation";
import { API_ENDPOINTS } from "../endpoints.config";
import { api } from "../httpClient";
import {
  SkillListResponseSchema,
  type SkillListResponse,
} from "../schemas/skills.schema";

export async function searchSkills(term: string): Promise<SkillListResponse> {
  const response = await api.get<SkillListResponse>(
    API_ENDPOINTS.SKILLS.SEARCH,
    { params: { search: term } },
  );

  return parseSchema(
    SkillListResponseSchema,
    response,
    "searchSkills Response",
  );
}
