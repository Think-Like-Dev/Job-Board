import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Plus, X } from 'lucide-react';
import { useCreateSkill, useSkillSearch } from '@api/hooks/useSkills';
import type { Skill } from '../../../types/profile.types';

interface SkillsInputProps {
  value: string[];
  onChange: (skillIds: string[]) => void;
  initialSkills?: Skill[];
  single?: boolean;
  placeholder?: string;
}

export function SkillsInput({
  value,
  onChange,
  initialSkills = [],
  single = false,
  placeholder,
}: SkillsInputProps) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [extraSkills, setExtraSkills] = useState<Skill[]>([]);
  const search = useSkillSearch(term);
  const createSkill = useCreateSkill();

  const knownSkills = useMemo(() => {
    const map = new Map<string, Skill>();
    for (const skill of [...initialSkills, ...extraSkills]) {
      map.set(skill.id, skill);
    }
    return map;
  }, [initialSkills, extraSkills]);

  const results = (search.data ?? []).filter(
    (skill) => !value.includes(skill.id),
  );
  const exactMatch = (search.data ?? []).some(
    (skill) => skill.name.toLowerCase() === term.trim().toLowerCase(),
  );

  function select(skill: Skill) {
    setExtraSkills((current) =>
      current.some((item) => item.id === skill.id)
        ? current
        : [...current, skill],
    );
    onChange(single ? [skill.id] : [...value, skill.id]);
    setTerm('');
  }

  async function addNew() {
    const name = term.trim();
    if (name.length < 2) return;
    const skill = await createSkill.mutateAsync(name);
    select(skill);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((skillId) => {
          const skill = knownSkills.get(skillId);
          return (
            <Badge key={skillId} variant="secondary" className="gap-1 pe-1">
              {skill?.name ?? skillId}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => onChange(value.filter((id) => id !== skillId))}
                aria-label={t('profile.skills.remove', {
                  name: skill?.name ?? skillId,
                })}
              >
                <X className="size-3" />
              </button>
            </Badge>
          );
        })}
      </div>

      {(!single || value.length === 0) && (
        <div className="relative">
          <Input
            value={term}
            placeholder={placeholder ?? t('profile.skills.placeholder')}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (results[0]) {
                select(results[0]);
              } else if (term.trim().length >= 2 && !exactMatch) {
                void addNew();
              }
            }}
          />

          {term.trim().length >= 2 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
              {results.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => select(skill)}
                >
                  {skill.name}
                </button>
              ))}

              {!exactMatch && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  disabled={createSkill.isPending}
                  onClick={() => void addNew()}
                >
                  <Plus className="mr-2 size-4" />
                  {t('profile.skills.addNew', { name: term.trim() })}
                </Button>
              )}

              {search.isLoading && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  {t('profile.skills.searching')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
