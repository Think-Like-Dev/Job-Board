import { z } from "zod";
import type { TFunction } from "i18next";
import {
  CompensationType,
  Currency,
  EmploymentType,
  JobStatus,
  WorkMode,
} from "@/types/job.types";
import {
  CommonServerResponseSchema,
  PaginatedServerResponseSchema,
} from "./common.schema";

/* -------------------------------------------------------------------------- */
/*                               Shared Schemas                               */
/* -------------------------------------------------------------------------- */
const SalaryBaseSchema = z.object({
  currency: z.enum(Currency),
  period: z.enum(["Yearly", "Monthly", "Hourly"]),
});

export const SalarySchema = z
  .discriminatedUnion("type", [
    SalaryBaseSchema.extend({
      type: z.literal(CompensationType.FIXED),
      amount: z.number().nonnegative(),
    }),
    SalaryBaseSchema.extend({
      type: z.literal(CompensationType.RANGE),
      amount: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
    }),
    SalaryBaseSchema.partial().extend({
      type: z.literal(CompensationType.NEGOTIABLE),
      amount: z.number().optional(),
    }),
  ])
  .nullable();

export type SalaryType = z.infer<typeof SalarySchema>;

const ApplicationSettingsSchema = z.object({
  coverLetterRequired: z.boolean(),
  attachmentsAllowed: z.boolean(),
  maximumAttachments: z.number().int().nonnegative(),
  customQuestions: z.array(z.object()).optional(),
});

const JobSummaryFieldsSchema = z.object({
  code: z.string(),
  title: z.string(),
  category: z.string(),
  status: z.enum(JobStatus),
  compensation: SalarySchema,
  location: z.string(),
  keywords: z.array(z.string()),
  employmentType: z.enum(EmploymentType),
  department: z.string().optional(),
  designation: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  totalInterviewRounds: z.number().optional(),
  lastApplicationDate: z.string().optional(),
});

/* -------------------------------------------------------------------------- */
/*                              Form Schema                                   */
/* -------------------------------------------------------------------------- */

/**
 * Built as a factory so validation messages can be localized through i18next.
 * README mandatory fields are required; everything else is optional.
 */
export const createJobFormSchema = (t: TFunction) =>
  z.object({
    // Step 1 — Basics
    title: z.string().min(1, t("jobForm.validation.required")),
    department: z.string(),
    designation: z.string(),
    category: z.string().min(1, t("jobForm.validation.required")),
    employmentType: z.enum(EmploymentType),
    location: z.string().min(1, t("jobForm.validation.required")),
    workMode: z
      .array(z.enum(WorkMode))
      .min(1, t("jobForm.validation.selectAtLeastOne")),
    // Step 2 — Description & requirements
    description: z.string().min(1, t("jobForm.validation.required")),
    responsibilities: z.string(),
    yearsOfExperience: z.string(),
    skills: z
      .array(z.string())
      .min(1, t("jobForm.validation.selectAtLeastOne")),
    keywords: z.array(z.string()),
    // Step 3 — Compensation & details
    compensation: SalarySchema,
    vacancies: z.number().int().positive(t("jobForm.validation.positiveNumber")),
    benefits: z.array(z.string()),
    workShiftTiming: z.array(z.string()),
    // Step 4 — Hiring process & settings
    totalInterviewRounds: z
      .number()
      .int()
      .positive(t("jobForm.validation.positiveNumber")),
    lastApplicationDate: z.string().min(1, t("jobForm.validation.required")),
    applicationSettings: ApplicationSettingsSchema,
  });

export type JobFormValues = z.infer<ReturnType<typeof createJobFormSchema>>;

export const jobFormDefaultValues: JobFormValues = {
  title: "",
  department: "",
  designation: "",
  category: "",
  employmentType: EmploymentType.FULL_TIME,
  location: "",
  workMode: [],
  description: "",
  responsibilities: "",
  yearsOfExperience: "",
  skills: [],
  keywords: [],
  compensation: null,
  vacancies: 1,
  benefits: [],
  workShiftTiming: [],
  totalInterviewRounds: 1,
  lastApplicationDate: "",
  applicationSettings: {
    coverLetterRequired: false,
    attachmentsAllowed: false,
    maximumAttachments: 1,
  },
};

/* -------------------------------------------------------------------------- */
/*                              Request Schemas                               */
/* -------------------------------------------------------------------------- */

export const JobFiltersSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
  orderBy: z.string().default("createdAt"),
  orderByDirection: z.enum(["ASC", "DESC"]).default("DESC"),
  status: z.enum(JobStatus).optional(),
  recruiterId: z.string().optional(),
  dateRange: z.string().optional(),
});

export type JobFilters = z.infer<typeof JobFiltersSchema>;

export type CreateJobRequest = JobFormValues & {
  code?: string;
  status: JobStatus;
};

export type UpdateJobRequest = CreateJobRequest & {
  id: string;
  updatedAt: string;
};

export const PatchJobRequestSchema = z.object({
  id: z.string(),
  status: z.enum(JobStatus),
});

export type PatchJobRequest = z.infer<typeof PatchJobRequestSchema>;

/* -------------------------------------------------------------------------- */
/*                             Response Schemas                               */
/* -------------------------------------------------------------------------- */

export const JobSummarySchema = JobSummaryFieldsSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type JobSummary = z.infer<typeof JobSummarySchema>;

export const JobDetailSchema = JobSummarySchema.extend({
  description: z.string(),
  responsibilities: z.string(),
  yearsOfExperience: z.string(),
  vacancies: z.number(),
  workMode: z.array(z.enum(WorkMode)),
  workShiftTiming: z.array(z.string()),
  skills: z.array(z.string()),
  applicationSettings: ApplicationSettingsSchema.optional(),
  hiringProcess: z.array(z.string()).optional(),
});

export type JobDetail = z.infer<typeof JobDetailSchema>;

/* -------------------------------------------------------------------------- */
/*                               Responses                                    */
/* -------------------------------------------------------------------------- */

export const JobsListResponseSchema =
  PaginatedServerResponseSchema(JobSummarySchema);

export type GetJobsResponse = z.infer<typeof JobsListResponseSchema>;

export const CreateJobResponseSchema =
  CommonServerResponseSchema(JobSummarySchema);

export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>;

export const SingleJobResponseSchema =
  CommonServerResponseSchema(JobDetailSchema);

export type GetSingleJobResponse = z.infer<typeof SingleJobResponseSchema>;

export const PatchJobResponseSchema = CommonServerResponseSchema(
  z.object({
    id: z.string(),
    status: z.enum(JobStatus),
    updatedAt: z.string(),
  }),
);

export type PatchJobResponse = z.infer<typeof PatchJobResponseSchema>;
