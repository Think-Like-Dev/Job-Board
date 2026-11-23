import type { TFunction } from "i18next";
import type { CandidateListItem } from "@/api/schemas/candidates.schema";

type NamedCandidate = Pick<
  CandidateListItem,
  "firstName" | "lastName" | "email"
>;

/** Full name, falling back to the email for self-registered profiles. */
export function candidateDisplayName(candidate: NamedCandidate): string {
  const name = [candidate.firstName, candidate.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return name || candidate.email;
}

/** Two-letter avatar fallback; never fetches the guarded profile-image blob. */
export function candidateInitials(candidate: NamedCandidate): string {
  const first = candidate.firstName?.trim();
  const last = candidate.lastName?.trim();

  if (first || last) {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
  }

  return candidate.email.trim()[0]?.toUpperCase() ?? "?";
}

/**
 * `4 yrs 7 mos`, `4 yrs`, `7 mos`, or `Fresher`. Total months come from the
 * backend's merged experience calculation.
 */
export function formatExperienceMonths(
  months: number,
  t: TFunction,
): string {
  if (!months || months <= 0) {
    return t("candidate.experience.fresher");
  }

  const years = Math.floor(months / 12);
  const remaining = months % 12;

  if (years && remaining) {
    return t("candidate.experience.yearsMonths", { years, months: remaining });
  }
  if (years) {
    return t("candidate.experience.years", { count: years });
  }
  return t("candidate.experience.months", { count: remaining });
}
