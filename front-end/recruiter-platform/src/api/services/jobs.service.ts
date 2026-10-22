import { api } from "../httpClient";
import { API_ENDPOINTS } from "../endpoints.config";
import { parseSchema } from "@/lib/schemaValidation";
import {
  type GetJobsResponse,
  type JobFilters,
  type CreateJobResponse,
  type GetSingleJobResponse,
  CreateJobResponseSchema,
  JobsListResponseSchema,
  SingleJobResponseSchema,
  PatchJobResponseSchema,
  type PatchJobResponse,
  type CreateJobRequest,
  type UpdateJobRequest,
} from "../schemas/jobs.schema";

export async function getJobs(filters: JobFilters): Promise<GetJobsResponse> {
  const response = await api.get<GetJobsResponse>(API_ENDPOINTS.JOBS.GET_ALL, {
    params: filters,
  });
  return parseSchema(JobsListResponseSchema, response, "getJobs Response");
}

export async function createJob(payload: CreateJobRequest): Promise<CreateJobResponse> {
  const response = await api.post<CreateJobResponse>(API_ENDPOINTS.JOBS.CREATE, payload);
  return parseSchema(CreateJobResponseSchema, response, "createJob Response");
}

export async function updateJob(
  id: string,
  payload: UpdateJobRequest,
): Promise<GetSingleJobResponse> {
  const response = await api.put<GetSingleJobResponse>(API_ENDPOINTS.JOBS.UPDATE(id), payload);
  return parseSchema(SingleJobResponseSchema, response, "updateJob Response");
}

export async function patchJob(
  id: string,
  status: string,
): Promise<PatchJobResponse> {
  const response = await api.patch<PatchJobResponse>(API_ENDPOINTS.JOBS.PATCH(id),{id,status});
  return parseSchema(PatchJobResponseSchema, response, "patchJob Response");
}
export async function getJobById(id: string): Promise<GetSingleJobResponse> {
  const response = await api.get<GetSingleJobResponse>(API_ENDPOINTS.JOBS.GET_DETAILS(id));
  return parseSchema(
    SingleJobResponseSchema,
    response,
    "getSingleJob Response",
  );
}
