import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  JobListResponseSchema,
  JobDetailResponseSchema,
  JobFiltersSchema,
  BookmarkResponseSchema,
} from '../schemas/job.schema';
import type {
  JobDetail,
  JobFilters,
  JobListResponse,
  BookmarkResponse,
} from '../../types/job.types';

export async function getJobs(filters: JobFilters): Promise<JobListResponse> {
  const validatedFilters = parseSchema(
    JobFiltersSchema,
    filters,
    'getJobs filters',
  );
  const response = await api.get<unknown>(API_ENDPOINTS.JOBS.GET_ALL, {
    params: validatedFilters,
  });
  return parseSchema(JobListResponseSchema, response, 'getJobs Response');
}

export async function getJobDetails(id: string): Promise<JobDetail> {
  const response = await api.get<unknown>(API_ENDPOINTS.JOBS.GET_DETAILS(id));
  const parsed = parseSchema(
    JobDetailResponseSchema,
    response,
    'getJobDetails Response',
  );
  return parsed.data;
}

/**
 * Reserved for the future bookmarks module. The current UI keeps bookmarks in
 * local storage, so this function is not called yet.
 */
export async function toggleBookmark(jobId: string): Promise<BookmarkResponse> {
  const response = await api.post<unknown>(
    API_ENDPOINTS.JOBS.BOOKMARK(jobId),
  );
  return parseSchema(BookmarkResponseSchema, response, 'toggleBookmark Response');
}
