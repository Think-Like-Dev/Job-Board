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
  type PatchJobRequest,
  type CreateJobRequest,
  type UpdateJobRequest,
  ArchivePreviewResponseSchema,
  type ArchivePreviewResponse,
  DeleteJobResponseSchema,
  type DeleteJobResponse,
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
  payload: PatchJobRequest,
): Promise<PatchJobResponse> {
  const response = await api.patch<PatchJobResponse>(
    API_ENDPOINTS.JOBS.PATCH(id),
    payload,
  );
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

export async function getArchivePreview(
  id: string,
): Promise<ArchivePreviewResponse> {
  const response = await api.get<ArchivePreviewResponse>(
    API_ENDPOINTS.JOBS.ARCHIVE_PREVIEW(id),
  );
  return parseSchema(
    ArchivePreviewResponseSchema,
    response,
    "getArchivePreview Response",
  );
}

export async function deleteJob(id: string): Promise<DeleteJobResponse> {
  const response = await api.delete<DeleteJobResponse>(
    API_ENDPOINTS.JOBS.DELETE(id),
  );
  return parseSchema(DeleteJobResponseSchema, response, "deleteJob Response");
}
