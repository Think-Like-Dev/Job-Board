/**
 * Currency handling for the recruiter UI.
 *
 * The database stores a three-letter ISO 4217 code, never a display label. The
 * list of codes comes from the browser (`Intl.supportedValuesOf`), so a new
 * currency is supported as soon as the browser knows it, and every label and
 * amount is formatted with `Intl` for the active locale.
 */

export const DEFAULT_CURRENCY = 'USD';

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};

/** ISO codes the browser supports, alphabetically; small fallback for old engines. */
export function supportedCurrencies(): string[] {
  const intl = Intl as IntlWithSupportedValues;
  const codes =
    typeof intl.supportedValuesOf === 'function'
      ? intl.supportedValuesOf('currency')
      : [];
  const fallback = ['AED', 'EUR', 'INR', 'USD'];
  return (codes.length ? codes : fallback).slice().sort();
}

/**
 * Reads a code from either a bare ISO code ("INR") or a legacy display label
 * ("₹ INR"). Returns null when nothing usable is found.
 */
export function currencyCode(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  const trailing = trimmed.match(/([A-Za-z]{3})\s*$/);
  return trailing ? trailing[1].toUpperCase() : null;
}

/** "INR" → "INR — Indian Rupee". Falls back to the raw value. */
export function currencyLabel(value: string | undefined, locale?: string): string {
  if (!value) return '';
  const code = currencyCode(value);
  if (!code) return value;
  try {
    const name = new Intl.DisplayNames(locale ? [locale] : undefined, {
      type: 'currency',
    }).of(code);
    return name && name !== code ? `${code} — ${name}` : code;
  } catch {
    return code;
  }
}

/** Formats an amount with the currency, e.g. `₹ 18,00,000`. */
export function formatMoney(
  amount: number,
  currency?: string | null,
  locale?: string,
): string {
  const code = currencyCode(currency);
  if (code) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      // Unknown code: fall through to a plain number.
    }
  }
  const plain = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount);
  return currency ? `${plain} ${currency}` : plain;
}
