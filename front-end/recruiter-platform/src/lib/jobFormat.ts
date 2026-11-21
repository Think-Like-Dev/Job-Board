import { formatDate } from "date-fns";

import { CompensationType } from "@/types/job.types";
import { currencyCode, formatMoney } from "@/lib/currency";

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

  const currency = currencyCode(compensation.currency) ?? compensation.currency;

  switch (compensation.type) {
    case CompensationType.FIXED:
      return typeof compensation.amount === "number"
        ? `${formatMoney(compensation.amount, compensation.currency)} ${compensation.period ?? ""}`.trim()
        : "";
    case CompensationType.RANGE:
      return Array.isArray(compensation.amount)
        ? `${formatMoney(compensation.amount[0], compensation.currency)} - ${formatMoney(compensation.amount[1], compensation.currency)} ${compensation.period ?? ""}`.trim()
        : "";
    case CompensationType.NEGOTIABLE:
      return compensation.currency
        ? `${currency} ${compensation.period ?? ""} (Negotiable)`.trim()
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
