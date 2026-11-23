import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@ui/input";

import type { CandidateFormValues } from "@/api/schemas/candidates.schema";
import { Field } from "./Field";

interface LinksSectionProps {
  form: UseFormReturn<CandidateFormValues>;
}

/** Optional professional links. */
export function LinksSection({ form }: LinksSectionProps) {
  const { t } = useTranslation();
  const { register, formState } = form;
  const { errors } = formState;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label={t("candidate.form.fields.linkedinUrl")}
        htmlFor="linkedinUrl"
        error={errors.linkedinUrl?.message}
      >
        <Input
          id="linkedinUrl"
          type="url"
          placeholder="https://"
          {...register("linkedinUrl")}
        />
      </Field>
      <Field
        label={t("candidate.form.fields.portfolioUrl")}
        htmlFor="portfolioUrl"
        error={errors.portfolioUrl?.message}
      >
        <Input
          id="portfolioUrl"
          type="url"
          placeholder="https://"
          {...register("portfolioUrl")}
        />
      </Field>
    </div>
  );
}
