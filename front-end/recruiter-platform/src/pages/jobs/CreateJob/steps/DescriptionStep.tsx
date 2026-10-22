import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Input } from "@ui/input";
import { Textarea } from "@ui/textarea";

import { TagInput } from "@/components/jobs/TagInput";
import type { JobFormValues } from "@/api/schemas/jobs.schema";
import { FieldError } from "../components/FieldError";
import { FormLabel } from "../components/FormLabel";

interface DescriptionStepProps {
  form: UseFormReturn<JobFormValues>;
}

/** Step 2 — job description, responsibilities, experience, skills and keywords. */
export function DescriptionStep({ form }: DescriptionStepProps) {
  const { t } = useTranslation();
  const { errors } = form.formState;

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <FormLabel htmlFor="description" required>
          {t("jobForm.fields.description")}
        </FormLabel>
        <Textarea
          id="description"
          rows={6}
          placeholder={t("jobForm.placeholders.description")}
          aria-invalid={!!errors.description}
          {...form.register("description")}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="responsibilities">
          {t("jobForm.fields.responsibilities")}
        </FormLabel>
        <Textarea
          id="responsibilities"
          rows={4}
          placeholder={t("jobForm.placeholders.responsibilities")}
          {...form.register("responsibilities")}
        />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="yearsOfExperience">
          {t("jobForm.fields.yearsOfExperience")}
        </FormLabel>
        <Input
          id="yearsOfExperience"
          placeholder={t("jobForm.placeholders.yearsOfExperience")}
          {...form.register("yearsOfExperience")}
        />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="skills" required>
          {t("jobForm.fields.skills")}
        </FormLabel>
        <Controller
          control={form.control}
          name="skills"
          render={({ field }) => (
            <TagInput
              id="skills"
              value={field.value}
              onChange={field.onChange}
              placeholder={t("jobForm.placeholders.tags")}
              invalid={!!errors.skills}
            />
          )}
        />
        <FieldError message={errors.skills?.message} />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="keywords">{t("jobForm.fields.keywords")}</FormLabel>
        <Controller
          control={form.control}
          name="keywords"
          render={({ field }) => (
            <TagInput
              id="keywords"
              value={field.value}
              onChange={field.onChange}
              placeholder={t("jobForm.placeholders.tags")}
            />
          )}
        />
      </div>
    </div>
  );
}
