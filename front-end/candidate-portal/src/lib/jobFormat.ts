import { formatDate } from 'date-fns';
import { CompensationType } from '@/types/job.types';
import type { JobCompensation } from '@/types/job.types';
import { currencyCode, formatMoney } from '@/lib/currency';

const amountFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

/** Formats a raw salary amount with thousands separators. */
export function formatAmount(value: number): string {
  return amountFormatter.format(value);
}

/** Human-readable compensation string for job cards and the detail drawer. */
export function formatCompensation(
  compensation?: JobCompensation | null,
): string {
  if (!compensation) return '';

  const currency = currencyCode(compensation.currency) ?? compensation.currency ?? '';
  const period = compensation.period ?? '';

  switch (compensation.type) {
    case CompensationType.FIXED:
      return typeof compensation.amount === 'number'
        ? `${formatMoney(compensation.amount, compensation.currency)} ${period}`.trim()
        : '';
    case CompensationType.RANGE:
      return Array.isArray(compensation.amount)
        ? `${formatMoney(compensation.amount[0], compensation.currency)} - ${formatMoney(compensation.amount[1], compensation.currency)} ${period}`.trim()
        : '';
    case CompensationType.NEGOTIABLE:
      return currency ? `${currency} ${period} (Negotiable)`.trim() : 'Negotiable';
    default:
      return '';
  }
}

/** Formats an ISO date or `YYYY-MM-DD` string for display. */
export function formatIsoDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date, 'dd MMM yyyy');
}
