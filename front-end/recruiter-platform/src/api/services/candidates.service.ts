import { parseSchema } from "@/lib/schemaValidation";
import { API_ENDPOINTS } from "../endpoints.config";
import { api } from "../httpClient";
import {
  CandidateApplicationListResponseSchema,
  CandidateDetailResponseSchema,
  CandidateListResponseSchema,
  type CandidateApplicationFilters,
  type CandidateApplicationListResponse,
  type CandidateDetailResponse,
  type CandidateFilters,
  type CandidateListResponse,
} from "../schemas/candidates.schema";

export async function getCandidates(
  filters: CandidateFilters,
): Promise<CandidateListResponse> {
  const response = await api.get<CandidateListResponse>(
    API_ENDPOINTS.CANDIDATES.GET_ALL,
    { params: filters },
  );

  return parseSchema(
    CandidateListResponseSchema,
    response,
    "getCandidates Response",
  );
}

export async function getCandidate(
  id: string,
): Promise<CandidateDetailResponse> {
  const response = await api.get<CandidateDetailResponse>(
    API_ENDPOINTS.CANDIDATES.GET_DETAILS(id),
  );

  return parseSchema(
    CandidateDetailResponseSchema,
    response,
    "getCandidate Response",
  );
}

export async function getCandidateApplications(
  id: string,
  filters: CandidateApplicationFilters,
): Promise<CandidateApplicationListResponse> {
  const response = await api.get<CandidateApplicationListResponse>(
    API_ENDPOINTS.CANDIDATES.LIST_APPLICATIONS(id),
    { params: filters },
  );

  return parseSchema(
    CandidateApplicationListResponseSchema,
    response,
    "getCandidateApplications Response",
  );
}

export async function createCandidate(
  payload: FormData,
): Promise<CandidateDetailResponse> {
  const response = await api.post<CandidateDetailResponse>(
    API_ENDPOINTS.CANDIDATES.CREATE,
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return parseSchema(
    CandidateDetailResponseSchema,
    response,
    "createCandidate Response",
  );
}
