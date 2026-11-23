import { useTranslation } from "react-i18next";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { Input } from "@ui/input";
import { Textarea } from "@ui/textarea";

import type { CandidateFormValues } from "@/api/schemas/candidates.schema";
import { Field } from "./Field";
import { AddEntryButton, RepeaterEntry } from "./RepeaterEntry";

interface EducationSectionProps {
  form: UseFormReturn<CandidateFormValues>;
}

const EMPTY_EDUCATION: CandidateFormValues["education"][number] = {
  institution: "",
  degree: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  grade: "",
  gpa: "",
  additionalDetails: "",
};

/** Optional education entries, rendered as removable cards. */
export function EducationSection({ form }: EducationSectionProps) {
  const { t } = useTranslation();
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "education" });
  const { errors } = formState;

  return (
    <div className="space-y-3">
      {fields.map((field, index) => {
        const itemErrors = errors.education?.[index];
        return (
          <RepeaterEntry
            key={field.id}
            index={index}
            label={t("candidate.form.sections.education")}
            removeLabel={t("candidate.form.removeEntry")}
            onRemove={() => remove(index)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("candidate.form.fields.institution")}
                htmlFor={`education-${index}-institution`}
                required
                error={itemErrors?.institution?.message}
              >
                <Input
                  id={`education-${index}-institution`}
                  {...register(`education.${index}.institution`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.degree")}
                htmlFor={`education-${index}-degree`}
                required
                error={itemErrors?.degree?.message}
              >
                <Input
                  id={`education-${index}-degree`}
                  {...register(`education.${index}.degree`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.fieldOfStudy")}
                htmlFor={`education-${index}-field`}
                required
                error={itemErrors?.fieldOfStudy?.message}
              >
                <Input
                  id={`education-${index}-field`}
                  {...register(`education.${index}.fieldOfStudy`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.grade")}
                htmlFor={`education-${index}-grade`}
                error={itemErrors?.grade?.message}
              >
                <Input
                  id={`education-${index}-grade`}
                  {...register(`education.${index}.grade`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.startDate")}
                htmlFor={`education-${index}-start`}
                required
                error={itemErrors?.startDate?.message}
              >
                <Input
                  id={`education-${index}-start`}
                  type="date"
                  {...register(`education.${index}.startDate`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.endDate")}
                htmlFor={`education-${index}-end`}
                error={itemErrors?.endDate?.message}
              >
                <Input
                  id={`education-${index}-end`}
                  type="date"
                  {...register(`education.${index}.endDate`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.gpa")}
                htmlFor={`education-${index}-gpa`}
                error={itemErrors?.gpa?.message}
              >
                <Input
                  id={`education-${index}-gpa`}
                  type="number"
                  step="0.01"
                  min="0"
                  {...register(`education.${index}.gpa`)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label={t("candidate.form.fields.additionalDetails")}
                  htmlFor={`education-${index}-details`}
                  error={itemErrors?.additionalDetails?.message}
                >
                  <Textarea
                    id={`education-${index}-details`}
                    rows={2}
                    {...register(`education.${index}.additionalDetails`)}
                  />
                </Field>
              </div>
            </div>
          </RepeaterEntry>
        );
      })}

      <AddEntryButton
        label={t("candidate.form.addEducation")}
        onAdd={() => append({ ...EMPTY_EDUCATION })}
      />
    </div>
  );
}
