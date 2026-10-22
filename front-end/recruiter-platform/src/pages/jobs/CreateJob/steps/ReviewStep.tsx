import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { JobFormValues, SalaryType } from "@/api/schemas/jobs.schema";
import { CompensationType } from "@/types/job.types";
import { formatEnumToStartCase } from "@/lib/utils";

interface ReviewStepProps {
  form: UseFormReturn<JobFormValues>;
}

/** Step 6 — read-only summary of everything captured in the wizard. */
export function ReviewStep({ form }: ReviewStepProps) {
  const { t } = useTranslation();
  const values = form.watch();

  const reviewValue = (
    value: string | string[] | number | undefined | null,
  ): string => {
    if (value === undefined || value === null || value === "") {
      return t("jobForm.review.notProvided");
    }
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : t("jobForm.review.notProvided");
    }
    return String(value);
  };

  const formatCompensation = (value: SalaryType): string => {
    if (!value) return t("jobForm.review.notProvided");
    const period = value.period ?? "";
    switch (value.type) {
      case CompensationType.FIXED:
        return `${value.currency} ${value.amount} ${period}`;
      case CompensationType.RANGE:
        return `${value.currency} ${value.amount[0]} - ${value.amount[1]} ${period}`;
      case CompensationType.NEGOTIABLE:
        return t("jobForm.compensationOptions.NEGOTIABLE");
      default:
        return t("jobForm.review.notProvided");
    }
  };

  const rows: Array<{ label: string; value: string }> = [
    { label: t("jobForm.fields.title"), value: reviewValue(values.title) },
    {
      label: t("jobForm.fields.category"),
      value: reviewValue(values.category),
    },
    {
      label: t("jobForm.fields.department"),
      value: reviewValue(values.department),
    },
    {
      label: t("jobForm.fields.designation"),
      value: reviewValue(values.designation),
    },
    {
      label: t("jobForm.fields.employmentType"),
      value: formatEnumToStartCase(values.employmentType),
    },
    {
      label: t("jobForm.fields.location"),
      value: reviewValue(values.location),
    },
    {
      label: t("jobForm.fields.workMode"),
      value: reviewValue(
        values.workMode.map((mode) => formatEnumToStartCase(mode)),
      ),
    },
    {
      label: t("jobForm.fields.skills"),
      value: reviewValue(values.skills),
    },
    {
      label: t("jobForm.fields.keywords"),
      value: reviewValue(values.keywords),
    },
    {
      label: t("jobForm.fields.vacancies"),
      value: reviewValue(values.vacancies),
    },
    {
      label: t("jobForm.fields.compensationType"),
      value: formatCompensation(values.compensation),
    },
    {
      label: t("jobForm.fields.benefits"),
      value: reviewValue(values.benefits),
    },
    {
      label: t("jobForm.fields.workShiftTiming"),
      value: reviewValue(values.workShiftTiming),
    },
    {
      label: t("jobForm.fields.totalInterviewRounds"),
      value: reviewValue(values.totalInterviewRounds),
    },
    {
      label: t("jobForm.fields.lastApplicationDate"),
      value: reviewValue(values.lastApplicationDate),
    },
    {
      label: t("jobForm.fields.coverLetterRequired"),
      value: values.applicationSettings?.coverLetterRequired
        ? t("jobForm.review.yes")
        : t("jobForm.review.no"),
    },
    {
      label: t("jobForm.fields.attachmentsAllowed"),
      value: values.applicationSettings?.attachmentsAllowed
        ? t("jobForm.review.yes")
        : t("jobForm.review.no"),
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("jobForm.fields.description")}</p>
        <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">
          {reviewValue(values.description)}
        </p>
      </div>

      <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 border-b pb-2"
          >
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
