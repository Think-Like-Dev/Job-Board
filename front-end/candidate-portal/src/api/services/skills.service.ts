import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  SkillListResponseSchema,
  SkillResponseSchema,
} from '../schemas/profile.schema';
import type { Skill } from '../../types/profile.types';

export async function searchSkills(term: string): Promise<Skill[]> {
  const query = term.trim()
    ? `?search=${encodeURIComponent(term.trim())}`
    : '';
  const response = await api.get<unknown>(
    `${API_ENDPOINTS.SKILLS.SEARCH}${query}`,
  );
  const parsed = parseSchema(
    SkillListResponseSchema,
    response,
    'searchSkills Response',
  );
  return parsed.data;
}

export async function createSkill(name: string): Promise<Skill> {
  const response = await api.post<unknown>(API_ENDPOINTS.SKILLS.CREATE, {
    name: name.trim(),
  });
  const parsed = parseSchema(
    SkillResponseSchema,
    response,
    'createSkill Response',
  );
  return parsed.data;
}
