import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import { PlusIcon, XIcon } from "lucide-react";

import { Button } from "@ui/button";
import { Input } from "@ui/input";

import type { CandidateFormValues } from "@/api/schemas/candidates.schema";
import { useSearchSkills } from "@/api/hooks/useSkills";

interface SkillsSectionProps {
  form: UseFormReturn<CandidateFormValues>;
}

/**
 * Tag-style skill picker. Free text is allowed; the backend resolves unknown
 * names into the canonical taxonomy, and suggestions come from `GET /skills`.
 */
export function SkillsSection({ form }: SkillsSectionProps) {
  const { t } = useTranslation();
  const [term, setTerm] = useState("");
  const skills = form.watch("skills");
  const suggestionsQuery = useSearchSkills(term);

  const setSkills = (next: string[]) =>
    form.setValue("skills", next, { shouldDirty: true, shouldValidate: true });

  const addSkill = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setTerm("");
    if (skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      return;
    }
    setSkills([...skills, value]);
  };

  const removeSkill = (value: string) =>
    setSkills(skills.filter((skill) => skill !== value));

  const suggestions = (suggestionsQuery.data?.data ?? [])
    .map((skill) => skill.name)
    .filter(
      (name) =>
        !skills.some((skill) => skill.toLowerCase() === name.toLowerCase()),
    )
    .slice(0, 6);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addSkill(term);
            }
          }}
          placeholder={t("candidate.form.fields.skillsPlaceholder")}
          aria-label={t("candidate.form.fields.skillsPlaceholder")}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addSkill(term)}
          disabled={!term.trim()}
        >
          <PlusIcon data-icon="inline-start" />
          {t("candidate.form.addEntryShort")}
        </Button>
      </div>

      {suggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((name) => (
            <Button
              key={name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSkill(name)}
            >
              <PlusIcon data-icon="inline-start" />
              {name}
            </Button>
          ))}
        </div>
      ) : null}

      {skills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 ps-2.5 pe-1 text-xs"
            >
              {skill}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${t("candidate.form.removeEntry")} ${skill}`}
                onClick={() => removeSkill(skill)}
              >
                <XIcon className="size-3" />
              </Button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("candidate.form.fields.skillsEmpty")}
        </p>
      )}
    </div>
  );
}
