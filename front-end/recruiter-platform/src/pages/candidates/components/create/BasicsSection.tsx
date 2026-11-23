import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@ui/input";

import type { CandidateFormValues } from "@/api/schemas/candidates.schema";
import { Field } from "./Field";

interface BasicsSectionProps {
  form: UseFormReturn<CandidateFormValues>;
}

/** Mandatory identity fields plus phone. */
export function BasicsSection({ form }: BasicsSectionProps) {
  const { t } = useTranslation();
  const { register, formState } = form;
  const { errors } = formState;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label={t("candidate.form.fields.firstName")}
        htmlFor="firstName"
        required
        error={errors.firstName?.message}
      >
        <Input id="firstName" {...register("firstName")} aria-invalid={Boolean(errors.firstName)} />
      </Field>
      <Field
        label={t("candidate.form.fields.lastName")}
        htmlFor="lastName"
        required
        error={errors.lastName?.message}
      >
        <Input id="lastName" {...register("lastName")} aria-invalid={Boolean(errors.lastName)} />
      </Field>
      <Field
        label={t("candidate.form.fields.email")}
        htmlFor="email"
        required
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="off"
          {...register("email")}
          aria-invalid={Boolean(errors.email)}
        />
      </Field>
      <Field
        label={t("candidate.form.fields.phone")}
        htmlFor="phone"
        error={errors.phone?.message}
      >
        <Input id="phone" {...register("phone")} />
      </Field>
    </div>
  );
}
