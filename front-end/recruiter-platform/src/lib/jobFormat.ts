import { formatDate } from "date-fns";

import { CompensationType } from "@/types/job.types";

/** Minimal shape shared by the form, list and detail compensation payloads. */
export interface CompensationLike {
  type: CompensationType;
  currency?: string;
  period?: string;
  amount?: number | number[];
}

/** Human-readable compensation string used by the list and detail views. */
export function formatCompensation(
  compensation?: CompensationLike | null,
): string {
  if (!compensation) return "";

  switch (compensation.type) {
    case CompensationType.FIXED:
      return typeof compensation.amount === "number"
        ? `${compensation.currency ?? ""} ${compensation.amount} ${compensation.period ?? ""}`.trim()
        : "";
    case CompensationType.RANGE:
      return Array.isArray(compensation.amount)
        ? `${compensation.currency ?? ""} ${compensation.amount[0]} - ${compensation.amount[1]} ${compensation.period ?? ""}`.trim()
        : "";
    case CompensationType.NEGOTIABLE:
      return compensation.currency
        ? `${compensation.currency} ${compensation.period ?? ""} (Negotiable)`.trim()
        : "Negotiable";
    default:
      return "";
  }
}

/** Formats an ISO date or `YYYY-MM-DD` string for display. */
export function formatIsoDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date, "dd MMM yyyy");
}
