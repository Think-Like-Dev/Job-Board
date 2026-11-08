import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { createSkill, searchSkills } from '../services/skills.service';

export function useSkillSearch(term: string) {
  return useQuery({
    queryKey: QUERY_KEYS.SKILLS.SEARCH(term),
    queryFn: () => searchSkills(term),
    enabled: term.trim().length >= 2,
    staleTime: 60 * 1000,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createSkill(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}
