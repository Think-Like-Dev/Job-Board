import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Input } from "@ui/input";
import { Switch } from "@ui/switch";

import type { JobFormValues } from "@/api/schemas/jobs.schema";
import { FieldError } from "../components/FieldError";
import { FormLabel } from "../components/FormLabel";

interface ProcessStepProps {
  form: UseFormReturn<JobFormValues>;
}

/** Step 4 — interview rounds, closing date and application settings. */
export function ProcessStep({ form }: ProcessStepProps) {
  const { t } = useTranslation();
  const { errors } = form.formState;
  const attachmentsAllowed = form.watch(
    "applicationSettings.attachmentsAllowed",
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <FormLabel htmlFor="totalInterviewRounds" required>
          {t("jobForm.fields.totalInterviewRounds")}
        </FormLabel>
        <Input
          id="totalInterviewRounds"
          type="number"
          min={1}
          aria-invalid={!!errors.totalInterviewRounds}
          {...form.register("totalInterviewRounds", { valueAsNumber: true })}
        />
        <FieldError message={errors.totalInterviewRounds?.message} />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="lastApplicationDate" required>
          {t("jobForm.fields.lastApplicationDate")}
        </FormLabel>
        <Input
          id="lastApplicationDate"
          type="date"
          aria-invalid={!!errors.lastApplicationDate}
          {...form.register("lastApplicationDate")}
        />
        <FieldError message={errors.lastApplicationDate?.message} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <FormLabel htmlFor="coverLetterRequired" className="cursor-pointer">
          {t("jobForm.fields.coverLetterRequired")}
        </FormLabel>
        <Controller
          control={form.control}
          name="applicationSettings.coverLetterRequired"
          render={({ field }) => (
            <Switch
              id="coverLetterRequired"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
            />
          )}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <FormLabel htmlFor="attachmentsAllowed" className="cursor-pointer">
          {t("jobForm.fields.attachmentsAllowed")}
        </FormLabel>
        <Controller
          control={form.control}
          name="applicationSettings.attachmentsAllowed"
          render={({ field }) => (
            <Switch
              id="attachmentsAllowed"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
            />
          )}
        />
      </div>

      {attachmentsAllowed && (
        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="maximumAttachments">
            {t("jobForm.fields.maximumAttachments")}
          </FormLabel>
          <Input
            id="maximumAttachments"
            type="number"
            min={0}
            aria-invalid={!!errors.applicationSettings?.maximumAttachments}
            {...form.register("applicationSettings.maximumAttachments", {
              valueAsNumber: true,
            })}
          />
          <FieldError
            message={errors.applicationSettings?.maximumAttachments?.message}
          />
        </div>
      )}
    </div>
  );
}
