import { z } from "zod";
import { CompensationType, Currency, EmploymentType, JobStatus, WorkMode } from "@/types/job.types";
import { CommonServerResponseSchema, PaginatedServerResponseSchema } from "./common.schema";

/* -------------------------------------------------------------------------- */
/*                               Shared Schemas                               */
/* -------------------------------------------------------------------------- */
const SalaryBaseSchema = z.object({
  currency: z.enum(Currency),
  period: z.enum(["Yearly", "Monthly", "Hourly"]),
});

export const SalarySchema = z.discriminatedUnion("type" as const, [
  SalaryBaseSchema.extend({
    type: z.literal(CompensationType.FIXED),
    amount: z.number(),
  }),
  SalaryBaseSchema.extend({
    type: z.literal(CompensationType.RANGE),
    amount: z.tuple([z.number(),z.number()]),
  }),
  SalaryBaseSchema.partial().extend({type: z.literal(CompensationType.NEGOTIABLE),amount:z.number().optional()}),
]).nullable();

export type SalaryType = z.infer<typeof SalarySchema>;

const ApplicationSettingsSchema = z.object({
  coverLetterRequired: z.boolean(),
  attachmentsAllowed: z.boolean(),
  maximumAttachments: z.number(),
  customQuestions: z.array(z.object()).optional(),
});

const JobCommonSchema = z.object({
  code: z.string(),
  title: z.string(),
  category: z.string(),
  status: z.enum(JobStatus),
  compensation: SalarySchema,
  location: z.string(),
  keywords: z.array(z.string()),
  employmentType: z.enum(EmploymentType),
  autoClosingDate: z.string().optional(),
});

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

export const CreateJobRequestSchema = JobCommonSchema.extend({
  description: z.string(),
  vacancies: z.number().int().positive().default(1),
  yearsOfExperience: z.string(),
  responsibilities: z.string(),
  employmentType: z.enum(EmploymentType),
  workMode: z.array(z.enum(WorkMode)),
  workShiftTiming: z.array(z.string()),
  skills: z.array(z.string()),
  applicationSettings: ApplicationSettingsSchema.optional(),
  hiringProcess: z.array(z.string()).optional(),
});

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

export const UpdateJobRequestSchema = CreateJobRequestSchema.extend({id: z.number(),updatedAt:z.string()});

export type UpdateJobRequest = z.infer<typeof UpdateJobRequestSchema>;

export const PatchJobRequestSchema = z.object({id: z.number(),status: z.enum(JobStatus)});

export type PatchJobRequest = z.infer<typeof PatchJobRequestSchema>;

/* -------------------------------------------------------------------------- */
/*                             Response Schemas                               */
/* -------------------------------------------------------------------------- */

export const JobSummarySchema = JobCommonSchema.extend({
  id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});

export type JobSummary = z.infer<typeof JobSummarySchema>;

export const JobDetailSchema = JobSummarySchema.extend(CreateJobRequestSchema.shape);

export type JobDetail = z.infer<typeof JobDetailSchema>;

/* -------------------------------------------------------------------------- */
/*                               Responses                                    */
/* -------------------------------------------------------------------------- */

export const JobsListResponseSchema = PaginatedServerResponseSchema(JobSummarySchema);

export type GetJobsResponse = z.infer<typeof JobsListResponseSchema>;

export const CreateJobResponseSchema =CommonServerResponseSchema(JobSummarySchema);

export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>;

export const SingleJobResponseSchema = CommonServerResponseSchema(JobDetailSchema);

export type GetSingleJobResponse = z.infer<typeof SingleJobResponseSchema>;

export const PatchJobResponseSchema = CommonServerResponseSchema(
  z.object({
    id: z.number(),
    status: z.enum(JobStatus),
    updatedAt: z.string()
  })
);

export type PatchJobResponse = z.infer<typeof PatchJobResponseSchema>;