import { ApplicationStatus } from "@/types/application.types";

export type ApplicationStatusBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

/**
 * Maps an application status to the closest semantic badge variant. Kept in
 * one place so the table, drawer and timeline stay visually consistent.
 */
export function applicationStatusBadgeVariant(
  status: ApplicationStatus,
): ApplicationStatusBadgeVariant {
  switch (status) {
    case ApplicationStatus.IN_REVIEW:
    case ApplicationStatus.SHORTLISTED:
    case ApplicationStatus.INTERVIEW:
    case ApplicationStatus.OFFER_EXTENDED:
    case ApplicationStatus.OFFER_ACCEPTED:
      return "default";
    case ApplicationStatus.REJECTED:
    case ApplicationStatus.OFFER_REJECTED:
    case ApplicationStatus.AUTO_REJECTED:
      return "destructive";
    case ApplicationStatus.WITHDRAWN:
      return "outline";
    case ApplicationStatus.DRAFT:
    case ApplicationStatus.APPLIED:
    default:
      return "secondary";
  }
}
