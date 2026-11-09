/**
 * Pure, framework-free experience math shared by the recruiter candidate
 * module and the candidate profile write path.
 *
 * Rules:
 * - Overlapping/adjacent employment ranges are merged before counting, so
 *   concurrent roles never double-count.
 * - Open-ended ranges end today.
 * - Career start is the earliest completed education end date, falling back to
 *   the earliest employment start when no completed education exists.
 * - Gaps are employment-only periods of at least 90 days between career start
 *   and today.
 * - Totals are reported as whole months (rounded).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GAP_THRESHOLD_DAYS = 90;

export interface ExperienceIntervalInput {
  startDate: string;
  endDate?: string | null;
}

export interface EducationIntervalInput {
  startDate: string;
  endDate?: string | null;
}

export interface CareerGap {
  startDate: string;
  endDate: string;
  months: number;
}

export interface ExperienceCalculation {
  totalMonths: number;
  careerStartDate: string | null;
  gaps: CareerGap[];
}

interface DateRange {
  start: number;
  end: number;
}

function parseDateOnly(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  return Number.isNaN(time) ? null : time;
}

function toDateOnly(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function toUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Inclusive day count converted to whole months, rounded to nearest. */
export function monthsBetweenInclusive(start: number, end: number): number {
  const days = Math.floor((end - start) / MS_PER_DAY) + 1;
  if (days <= 0) return 0;
  return Math.max(0, Math.round(days / 30.4375));
}

function collectRanges(
  rows: readonly ExperienceIntervalInput[],
  asOf: number,
): DateRange[] {
  const ranges: DateRange[] = [];

  for (const row of rows) {
    const start = parseDateOnly(row.startDate);
    if (start === null || start > asOf) continue;

    const end = row.endDate ? parseDateOnly(row.endDate) : asOf;
    if (end === null) continue;

    const clampedEnd = Math.min(end, asOf);
    if (start > clampedEnd) continue;

    ranges.push({ start, end: clampedEnd });
  }

  return ranges;
}

function mergeRanges(ranges: DateRange[]): DateRange[] {
  const sorted = [...ranges].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  const merged: DateRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end + MS_PER_DAY) {
      merged.push({ ...range });
      continue;
    }
    last.end = Math.max(last.end, range.end);
  }

  return merged;
}

function earliestCompletedEducationEnd(
  education: readonly EducationIntervalInput[],
  asOf: number,
): number | null {
  let earliest: number | null = null;

  for (const row of education) {
    if (!row.endDate) continue;
    const end = parseDateOnly(row.endDate);
    if (end === null || end > asOf) continue;
    if (earliest === null || end < earliest) earliest = end;
  }

  return earliest;
}

export function calculateExperience(
  experience: readonly ExperienceIntervalInput[],
  education: readonly EducationIntervalInput[],
  asOfInput: Date = new Date(),
): ExperienceCalculation {
  const asOf = toUtcDay(asOfInput);
  const merged = mergeRanges(collectRanges(experience, asOf));

  const totalMonths = merged.reduce(
    (total, range) => total + monthsBetweenInclusive(range.start, range.end),
    0,
  );

  const employmentStart = merged.length ? merged[0].start : null;
  const educationEnd = earliestCompletedEducationEnd(education, asOf);
  const careerStart = educationEnd ?? employmentStart;

  const gaps: CareerGap[] = [];

  if (careerStart !== null && careerStart <= asOf) {
    let cursor = careerStart;

    for (const range of merged) {
      if (range.end < cursor) continue;

      const start = Math.max(range.start, cursor);
      if (start > cursor) {
        const gapEnd = start - MS_PER_DAY;
        const days = Math.floor((gapEnd - cursor) / MS_PER_DAY) + 1;
        if (days >= GAP_THRESHOLD_DAYS) {
          gaps.push({
            startDate: toDateOnly(cursor),
            endDate: toDateOnly(gapEnd),
            months: monthsBetweenInclusive(cursor, gapEnd),
          });
        }
      }

      cursor = Math.max(cursor, range.end + MS_PER_DAY);
      if (cursor > asOf) break;
    }

    if (cursor <= asOf) {
      const days = Math.floor((asOf - cursor) / MS_PER_DAY) + 1;
      if (days >= GAP_THRESHOLD_DAYS) {
        gaps.push({
          startDate: toDateOnly(cursor),
          endDate: toDateOnly(asOf),
          months: monthsBetweenInclusive(cursor, asOf),
        });
      }
    }
  }

  return {
    totalMonths,
    careerStartDate: careerStart === null ? null : toDateOnly(careerStart),
    gaps,
  };
}
