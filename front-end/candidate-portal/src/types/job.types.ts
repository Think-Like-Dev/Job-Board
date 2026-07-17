// Shared job domain types.
// Use this across services, hooks and UI components instead of local interface definitions.

export interface Job {
  id: string;
  title: string;
  category: string;
  location: string;
  experience: string;
  salaryRange: string;
  description: string;
  isBookmarked: boolean;
  postedAt: string;
}

/** Query-string filters sent to GET /jobs */
export interface JobFilters {
  search?: string;
  location?: string;
  category?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  page?: number;
  pageSize?: number;
}

export interface BookmarkPayload {
  jobId: string;
}

export interface BookmarkResponse {
  success: boolean;
  isBookmarked: boolean;
}
