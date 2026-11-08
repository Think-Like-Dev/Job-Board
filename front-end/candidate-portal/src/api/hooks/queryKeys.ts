import type { JobFilters } from '@/types/job.types';
import type { ApplicationQueryParams } from '@/types/application.types';

/**
 * Centralised TanStack Query key factory.
 * Use these instead of raw string arrays to prevent typos and enable
 * precise cache invalidation.
 */
export const QUERY_KEYS = {
  AUTH: {
    ME: ['auth', 'me'] as const,
  },
  JOBS: {
    ALL: ['jobs'] as const,
    LIST: (filters: JobFilters) => ['jobs', 'list', filters] as const,
    DETAIL: (id: string) => ['jobs', 'detail', id] as const,
    BOOKMARKS: ['jobs', 'bookmarks'] as const,
  },
  APPLICATIONS: {
    ALL: ['applications'] as const,
    MY: (params: ApplicationQueryParams = {}) =>
      ['applications', 'my', params] as const,
    JOB: (jobId: string) => ['applications', 'job', jobId] as const,
    DETAIL: (id: string) => ['applications', 'detail', id] as const,
  },
  PROFILE: {
    ME: ['profile', 'me'] as const,
  },
  SKILLS: {
    SEARCH: (term: string) => ['skills', 'search', term] as const,
  },
  FILES: {
    CONTENT: (id: string) => ['files', 'content', id] as const,
  },
} as const;

// Legacy camelCase alias — keep until all hooks are migrated
export const queryKeys = QUERY_KEYS;
