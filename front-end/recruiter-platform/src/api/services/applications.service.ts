import { API_ENDPOINTS } from "../endpoints.config";
import { api } from "../httpClient";
import { parseSchema } from "@/lib/schemaValidation";
import {
  JobApplicationDetailResponseSchema,
  JobApplicationsListResponseSchema,
  type JobApplicationDetailResponse,
  type JobApplicationsListResponse,
} from "../schemas/applications.schema";
import type { JobApplicationsFilters } from "@/types/application.types";

export async function getJobApplications(
  jobId: string,
  filters: JobApplicationsFilters,
): Promise<JobApplicationsListResponse> {
  const response = await api.get<JobApplicationsListResponse>(
    API_ENDPOINTS.APPLICATIONS.LIST_BY_JOB(jobId),
    { params: filters },
  );

  return parseSchema(
    JobApplicationsListResponseSchema,
    response,
    "getJobApplications Response",
  );
}

export async function getJobApplication(
  id: string,
): Promise<JobApplicationDetailResponse> {
  const response = await api.get<JobApplicationDetailResponse>(
    API_ENDPOINTS.APPLICATIONS.GET_DETAILS(id),
  );

  return parseSchema(
    JobApplicationDetailResponseSchema,
    response,
    "getJobApplication Response",
  );
}

/**
 * Collects the ids of every application matching the active filters by
 * walking the paginated endpoint. Used by the "select all filtered" action;
 * the backend caps `limit` at 100, so this loops until the last page.
 */
export async function getAllJobApplicationIds(
  jobId: string,
  filters: Pick<JobApplicationsFilters, "search" | "status">,
): Promise<string[]> {
  const limit = 100;
  const firstPage = await getJobApplications(jobId, {
    ...filters,
    page: 1,
    limit,
  });

  const ids = firstPage.data.map((application) => application.id);
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const nextPage = await getJobApplications(jobId, {
      ...filters,
      page,
      limit,
    });
    ids.push(...nextPage.data.map((application) => application.id));
  }

  return ids;
}
