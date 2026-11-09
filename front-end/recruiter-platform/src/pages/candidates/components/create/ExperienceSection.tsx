import { useTranslation } from "react-i18next";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { Input } from "@ui/input";
import { Textarea } from "@ui/textarea";

import type { CandidateFormValues } from "@/api/schemas/candidates.schema";
import { Field } from "./Field";
import { AddEntryButton, RepeaterEntry } from "./RepeaterEntry";

interface ExperienceSectionProps {
  form: UseFormReturn<CandidateFormValues>;
}

const EMPTY_EXPERIENCE: CandidateFormValues["experience"][number] = {
  companyName: "",
  jobTitle: "",
  startDate: "",
  endDate: "",
  salary: "",
  description: "",
};

/** Optional employment history. Leave the end date empty for a current role. */
export function ExperienceSection({ form }: ExperienceSectionProps) {
  const { t } = useTranslation();
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "experience",
  });
  const { errors } = formState;

  return (
    <div className="space-y-3">
      {fields.map((field, index) => {
        const itemErrors = errors.experience?.[index];
        return (
          <RepeaterEntry
            key={field.id}
            index={index}
            label={t("candidate.form.sections.experience")}
            removeLabel={t("candidate.form.removeEntry")}
            onRemove={() => remove(index)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("candidate.form.fields.companyName")}
                htmlFor={`experience-${index}-company`}
                required
                error={itemErrors?.companyName?.message}
              >
                <Input
                  id={`experience-${index}-company`}
                  {...register(`experience.${index}.companyName`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.jobTitle")}
                htmlFor={`experience-${index}-title`}
                required
                error={itemErrors?.jobTitle?.message}
              >
                <Input
                  id={`experience-${index}-title`}
                  {...register(`experience.${index}.jobTitle`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.startDate")}
                htmlFor={`experience-${index}-start`}
                required
                error={itemErrors?.startDate?.message}
              >
                <Input
                  id={`experience-${index}-start`}
                  type="date"
                  {...register(`experience.${index}.startDate`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.endDate")}
                htmlFor={`experience-${index}-end`}
                error={itemErrors?.endDate?.message}
              >
                <Input
                  id={`experience-${index}-end`}
                  type="date"
                  {...register(`experience.${index}.endDate`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.salary")}
                htmlFor={`experience-${index}-salary`}
                error={itemErrors?.salary?.message}
              >
                <Input
                  id={`experience-${index}-salary`}
                  {...register(`experience.${index}.salary`)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label={t("candidate.form.fields.description")}
                  htmlFor={`experience-${index}-description`}
                  error={itemErrors?.description?.message}
                >
                  <Textarea
                    id={`experience-${index}-description`}
                    rows={2}
                    {...register(`experience.${index}.description`)}
                  />
                </Field>
              </div>
            </div>
          </RepeaterEntry>
        );
      })}

      <AddEntryButton
        label={t("candidate.form.addExperience")}
        onAdd={() => append({ ...EMPTY_EXPERIENCE })}
      />
    </div>
  );
}
