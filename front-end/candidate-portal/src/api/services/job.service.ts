import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  JobListSchema,
  JobSchema,
  JobFiltersSchema,
  BookmarkResponseSchema,
} from '../schemas/job.schema';
import type { Job, JobFilters, BookmarkResponse } from '../../types/job.types';

export async function getJobs(filters: JobFilters): Promise<Job[]> {
  const validatedFilters = parseSchema(JobFiltersSchema, filters, 'getJobs filters');
  const response = await api.get<unknown>(API_ENDPOINTS.JOBS.GET_ALL, { params: validatedFilters });
  return parseSchema(JobListSchema, response, 'getJobs Response');
}

export async function getJobDetails(id: string): Promise<Job> {
  const response = await api.get<unknown>(API_ENDPOINTS.JOBS.GET_DETAILS(id));
  return parseSchema(JobSchema, response, 'getJobDetails Response');
}

export async function toggleBookmark(jobId: string): Promise<BookmarkResponse> {
  const response = await api.post<unknown>(API_ENDPOINTS.JOBS.BOOKMARK(jobId));
  return parseSchema(BookmarkResponseSchema, response, 'toggleBookmark Response');
}
