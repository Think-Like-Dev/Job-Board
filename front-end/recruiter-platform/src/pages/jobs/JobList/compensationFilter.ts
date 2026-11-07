import type { SliderRange } from "@ui/slider";

/** Compensation filter modes shown in the job-list dropdown. */
export type CompensationFilterMode =
  | "ALL"
  | "RANGE"
  | "NEGOTIABLE"
  | "NONE";

export const SALARY_RANGE_MIN = 0;
export const SALARY_RANGE_MAX = 1_000_000;
export const SALARY_RANGE_STEP = 5_000;

export const DEFAULT_SALARY_RANGE: SliderRange = [
  SALARY_RANGE_MIN,
  SALARY_RANGE_MAX,
];

/** Delay before a slider change is committed to the API. */
export const RANGE_DEBOUNCE_MS = 1500;

const amountFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

export function formatAmount(value: number): string {
  return amountFormatter.format(value);
}

export function formatSalaryRange(range: SliderRange): string {
  return `${formatAmount(range[0])} – ${formatAmount(range[1])}`;
}
