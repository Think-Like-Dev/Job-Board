/** Server-side sort values accepted by `GET /candidates`. */
export const CANDIDATE_SORT_OPTIONS = [
  "createdAt:DESC",
  "createdAt:ASC",
  "experience:DESC",
  "experience:ASC",
] as const;

export type CandidateSortValue = (typeof CANDIDATE_SORT_OPTIONS)[number];

export const DEFAULT_CANDIDATE_SORT: CandidateSortValue = "createdAt:DESC";

export const CANDIDATE_SORT_LABEL_KEYS: Record<CandidateSortValue, string> = {
  "createdAt:DESC": "candidate.list.sort.createdAtDesc",
  "createdAt:ASC": "candidate.list.sort.createdAtAsc",
  "experience:DESC": "candidate.list.sort.experienceDesc",
  "experience:ASC": "candidate.list.sort.experienceAsc",
};
