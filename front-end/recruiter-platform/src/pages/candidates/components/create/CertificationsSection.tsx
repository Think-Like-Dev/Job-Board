import { useTranslation } from "react-i18next";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { Input } from "@ui/input";

import type { CandidateFormValues } from "@/api/schemas/candidates.schema";
import { Field } from "./Field";
import { AddEntryButton, RepeaterEntry } from "./RepeaterEntry";

interface CertificationsSectionProps {
  form: UseFormReturn<CandidateFormValues>;
}

const EMPTY_CERTIFICATION: CandidateFormValues["certifications"][number] = {
  title: "",
  issuer: "",
  credentialUrl: "",
  issueDate: "",
  expiryDate: "",
};

/**
 * Certification metadata plus a public credential URL. Soft-copy uploads are
 * intentionally deferred, matching the backend DTO.
 */
export function CertificationsSection({ form }: CertificationsSectionProps) {
  const { t } = useTranslation();
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "certifications",
  });
  const { errors } = formState;

  return (
    <div className="space-y-3">
      {fields.map((field, index) => {
        const itemErrors = errors.certifications?.[index];
        return (
          <RepeaterEntry
            key={field.id}
            index={index}
            label={t("candidate.form.sections.certifications")}
            removeLabel={t("candidate.form.removeEntry")}
            onRemove={() => remove(index)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("candidate.form.fields.certificationTitle")}
                htmlFor={`certification-${index}-title`}
                required
                error={itemErrors?.title?.message}
              >
                <Input
                  id={`certification-${index}-title`}
                  {...register(`certifications.${index}.title`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.issuer")}
                htmlFor={`certification-${index}-issuer`}
                error={itemErrors?.issuer?.message}
              >
                <Input
                  id={`certification-${index}-issuer`}
                  {...register(`certifications.${index}.issuer`)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label={t("candidate.form.fields.credentialUrl")}
                  htmlFor={`certification-${index}-url`}
                  required
                  error={itemErrors?.credentialUrl?.message}
                >
                  <Input
                    id={`certification-${index}-url`}
                    type="url"
                    placeholder="https://"
                    {...register(`certifications.${index}.credentialUrl`)}
                  />
                </Field>
              </div>
              <Field
                label={t("candidate.form.fields.issueDate")}
                htmlFor={`certification-${index}-issue`}
                error={itemErrors?.issueDate?.message}
              >
                <Input
                  id={`certification-${index}-issue`}
                  type="date"
                  {...register(`certifications.${index}.issueDate`)}
                />
              </Field>
              <Field
                label={t("candidate.form.fields.expiryDate")}
                htmlFor={`certification-${index}-expiry`}
                error={itemErrors?.expiryDate?.message}
              >
                <Input
                  id={`certification-${index}-expiry`}
                  type="date"
                  {...register(`certifications.${index}.expiryDate`)}
                />
              </Field>
            </div>
          </RepeaterEntry>
        );
      })}

      <AddEntryButton
        label={t("candidate.form.addCertification")}
        onAdd={() => append({ ...EMPTY_CERTIFICATION })}
      />
    </div>
  );
}
