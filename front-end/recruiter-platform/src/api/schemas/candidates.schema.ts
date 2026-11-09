import { z } from "zod";
import { ApplicationStatus } from "@/types/application.types";
import {
  ApplicationProfileSnapshotSchema,
  ApplicationSkillSchema,
} from "./applications.schema";
import {
  CommonServerResponseSchema,
  PaginatedServerResponseSchema,
} from "./common.schema";

const nullableString = () => z.string().nullable().optional();

/* -------------------------------------------------------------------------- */
/*                                   List                                     */
/* -------------------------------------------------------------------------- */

export const CandidateListItemSchema = z.object({
  id: z.string(),
  firstName: nullableString(),
  lastName: nullableString(),
  email: z.string(),
  phone: nullableString(),
  currentLocation: nullableString(),
  skills: z.array(ApplicationSkillSchema),
  totalExperienceMonths: z.number(),
  totalApplicationsCount: z.number(),
  createdAt: nullableString(),
  resumeFileId: nullableString(),
  profileImageFileId: nullableString(),
  createdBy: nullableString(),
});

export const CandidateListResponseSchema = PaginatedServerResponseSchema(
  CandidateListItemSchema,
);

export type CandidateListItem = z.infer<typeof CandidateListItemSchema>;
export type CandidateListResponse = z.infer<
  typeof CandidateListResponseSchema
>;

/* -------------------------------------------------------------------------- */
/*                                  Detail                                    */
/* -------------------------------------------------------------------------- */

export const CandidateGapSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  months: z.number(),
});

export const CandidateDetailSchema = ApplicationProfileSnapshotSchema.extend({
  createdAt: nullableString(),
  createdBy: nullableString(),
  totalExperienceMonths: z.number(),
  careerStartDate: nullableString(),
  gaps: z.array(CandidateGapSchema),
});

export const CandidateDetailResponseSchema = CommonServerResponseSchema(
  CandidateDetailSchema,
);

export type CandidateGap = z.infer<typeof CandidateGapSchema>;
export type CandidateDetail = z.infer<typeof CandidateDetailSchema>;
export type CandidateDetailResponse = z.infer<
  typeof CandidateDetailResponseSchema
>;

/* -------------------------------------------------------------------------- */
/*                           Candidate applications                           */
/* -------------------------------------------------------------------------- */

export const CandidateApplicationListItemSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  jobTitle: z.string(),
  jobCode: z.string(),
  jobCategory: z.string(),
  jobDepartment: z.string().nullable().optional(),
  jobLocation: z.string(),
  status: z.enum(ApplicationStatus),
  appliedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const CandidateApplicationListResponseSchema =
  PaginatedServerResponseSchema(CandidateApplicationListItemSchema);

export type CandidateApplicationListItem = z.infer<
  typeof CandidateApplicationListItemSchema
>;
export type CandidateApplicationListResponse = z.infer<
  typeof CandidateApplicationListResponseSchema
>;

/* -------------------------------------------------------------------------- */
/*                                  Filters                                   */
/* -------------------------------------------------------------------------- */

export interface CandidateFilters {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
}

export interface CandidateApplicationFilters {
  page: number;
  limit: number;
  status?: ApplicationStatus;
}

/* -------------------------------------------------------------------------- */
/*                               Create form                                  */
/* -------------------------------------------------------------------------- */

const optionalText = z.string().optional();

const buildOptionalUrl = (t: (key: string) => string) =>
  z.union([z.url(t("candidate.form.validation.url")), z.literal("")]).optional();

export const createCandidateFormSchema = (t: (key: string) => string) =>
  z
    .object({
      firstName: z
        .string()
        .trim()
        .min(1, t("candidate.form.validation.required")),
      lastName: z
        .string()
        .trim()
        .min(1, t("candidate.form.validation.required")),
      email: z.email(t("candidate.form.validation.email")),
      phone: optionalText,
      currentLocation: optionalText,
      address: optionalText,
      city: optionalText,
      state: optionalText,
      country: optionalText,
      postalCode: optionalText,
      linkedinUrl: buildOptionalUrl(t),
      portfolioUrl: buildOptionalUrl(t),
      skills: z.array(z.string()),
      education: z.array(
        z.object({
          institution: z
            .string()
            .trim()
            .min(1, t("candidate.form.validation.required")),
          degree: z
            .string()
            .trim()
            .min(1, t("candidate.form.validation.required")),
          fieldOfStudy: z
            .string()
            .trim()
            .min(1, t("candidate.form.validation.required")),
          startDate: z
            .string()
            .min(1, t("candidate.form.validation.required")),
          endDate: optionalText,
          grade: optionalText,
          gpa: optionalText,
          additionalDetails: optionalText,
        }),
      ),
      experience: z.array(
        z.object({
          companyName: z
            .string()
            .trim()
            .min(1, t("candidate.form.validation.required")),
          jobTitle: z
            .string()
            .trim()
            .min(1, t("candidate.form.validation.required")),
          startDate: z
            .string()
            .min(1, t("candidate.form.validation.required")),
          endDate: optionalText,
          salary: optionalText,
          description: optionalText,
        }),
      ),
      certifications: z.array(
        z.object({
          title: z
            .string()
            .trim()
            .min(1, t("candidate.form.validation.required")),
          issuer: optionalText,
          credentialUrl: z.url(t("candidate.form.validation.url")),
          issueDate: optionalText,
          expiryDate: optionalText,
        }),
      ),
    })
    .superRefine((values, context) => {
      const checkOrder = (
        start: string | undefined,
        end: string | undefined,
        path: (string | number)[],
      ) => {
        if (!start || !end) return;
        if (end < start) {
          context.addIssue({
            code: "custom",
            path,
            message: t("candidate.form.validation.endBeforeStart"),
          });
        }
      };

      values.education.forEach((item, index) =>
        checkOrder(item.startDate, item.endDate, ["education", index, "endDate"]),
      );
      values.experience.forEach((item, index) =>
        checkOrder(item.startDate, item.endDate, [
          "experience",
          index,
          "endDate",
        ]),
      );
      values.certifications.forEach((item, index) =>
        checkOrder(item.issueDate, item.expiryDate, [
          "certifications",
          index,
          "expiryDate",
        ]),
      );
    });

export type CandidateFormValues = z.infer<
  ReturnType<typeof createCandidateFormSchema>
>;

export const candidateFormDefaultValues: CandidateFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  currentLocation: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  linkedinUrl: "",
  portfolioUrl: "",
  skills: [],
  education: [],
  experience: [],
  certifications: [],
};
