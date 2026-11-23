import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@ui/input";

import type { CandidateFormValues } from "@/api/schemas/candidates.schema";
import { Field } from "./Field";

interface LocationSectionProps {
  form: UseFormReturn<CandidateFormValues>;
}

/** Optional address fields; `currentLocation` is the list/detail display value. */
export function LocationSection({ form }: LocationSectionProps) {
  const { t } = useTranslation();
  const { register, formState } = form;
  const { errors } = formState;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label={t("candidate.form.fields.currentLocation")}
        htmlFor="currentLocation"
        error={errors.currentLocation?.message}
      >
        <Input id="currentLocation" {...register("currentLocation")} />
      </Field>
      <Field
        label={t("candidate.form.fields.address")}
        htmlFor="address"
        error={errors.address?.message}
      >
        <Input id="address" {...register("address")} />
      </Field>
      <Field
        label={t("candidate.form.fields.city")}
        htmlFor="city"
        error={errors.city?.message}
      >
        <Input id="city" {...register("city")} />
      </Field>
      <Field
        label={t("candidate.form.fields.state")}
        htmlFor="state"
        error={errors.state?.message}
      >
        <Input id="state" {...register("state")} />
      </Field>
      <Field
        label={t("candidate.form.fields.country")}
        htmlFor="country"
        error={errors.country?.message}
      >
        <Input id="country" {...register("country")} />
      </Field>
      <Field
        label={t("candidate.form.fields.postalCode")}
        htmlFor="postalCode"
        error={errors.postalCode?.message}
      >
        <Input id="postalCode" {...register("postalCode")} />
      </Field>
    </div>
  );
}
