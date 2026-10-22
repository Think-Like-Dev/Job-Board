import type { FieldErrors, FieldPath } from "react-hook-form";
import { CompensationType, Currency } from "@/types/job.types";
import type { JobFormValues, SalaryType } from "@/api/schemas/jobs.schema";

/** Ordered create-job wizard steps. */
export const STEP_KEYS = [
  "basics",
  "description",
  "compensation",
  "process",
  "questions",
  "review",
] as const;

export type StepKey = (typeof STEP_KEYS)[number];

/**
 * Fields validated before leaving each step. Only README-mandatory fields gate
 * progress; optional fields are validated again on the final publish submit.
 */
export const STEP_FIELDS: Record<StepKey, FieldPath<JobFormValues>[]> = {
  basics: ["title", "category", "employmentType", "location", "workMode"],
  description: ["description", "skills"],
  compensation: ["compensation", "vacancies"],
  process: ["totalInterviewRounds", "lastApplicationDate", "applicationSettings"],
  questions: [],
  review: [],
};

export const PERIODS = ["Yearly", "Monthly", "Hourly"] as const;

/** Produces a valid compensation object for the selected type. */
export const buildCompensation = (
  type: CompensationType | "NONE",
): SalaryType => {
  switch (type) {
    case CompensationType.FIXED:
      return { type, currency: Currency.USD, period: "Yearly", amount: 0 };
    case CompensationType.RANGE:
      return { type, currency: Currency.USD, period: "Yearly", amount: [0, 0] };
    case CompensationType.NEGOTIABLE:
      return { type };
    default:
      return null;
  }
};

/** Walks a nested RHF error object using a dot path (e.g. `applicationSettings.attachmentsAllowed`). */
export const hasErrorAtPath = (
  errors: FieldErrors<JobFormValues>,
  path: string,
): boolean => {
  let current: unknown = errors;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[part];
  }
  return Boolean(current);
};
