import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  JobListResponseSchema,
  JobDetailResponseSchema,
  JobFiltersSchema,
  BookmarkListResponseSchema,
  BookmarkResponseSchema,
} from '../schemas/job.schema';
import type {
  JobDetail,
  JobFilters,
  JobListResponse,
  JobSummary,
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

export async function getBookmarks(): Promise<JobSummary[]> {
  const response = await api.get<unknown>(API_ENDPOINTS.BOOKMARKS.GET_ALL);
  const parsed = parseSchema(
    BookmarkListResponseSchema,
    response,
    'getBookmarks Response',
  );
  return parsed.data;
}

export async function addBookmark(jobId: string): Promise<BookmarkResponse> {
  const response = await api.post<unknown>(API_ENDPOINTS.BOOKMARKS.ADD(jobId));
  return toBookmarkResponse(
    parseSchema(BookmarkResponseSchema, response, 'addBookmark Response'),
  );
}

export async function removeBookmark(jobId: string): Promise<BookmarkResponse> {
  const response = await api.delete<unknown>(
    API_ENDPOINTS.BOOKMARKS.REMOVE(jobId),
  );
  return toBookmarkResponse(
    parseSchema(BookmarkResponseSchema, response, 'removeBookmark Response'),
  );
}

function toBookmarkResponse(parsed: {
  success: boolean;
  message: string;
  data: { jobId: string; isBookmarked: boolean };
}): BookmarkResponse {
  return {
    success: parsed.success,
    message: parsed.message,
    jobId: parsed.data.jobId,
    isBookmarked: parsed.data.isBookmarked,
  };
}
