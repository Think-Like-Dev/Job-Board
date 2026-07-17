import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  ApplicationListSchema,
  ApplicationSchema,
  ApplicationActionResponseSchema,
} from '../schemas/application.schema';
import type {
  Application,
  ApplyPayload,
  OfferResponsePayload,
  ApplicationActionResponse,
} from '../../types/application.types';

export async function getApplications(): Promise<Application[]> {
  const response = await api.get<unknown>(API_ENDPOINTS.APPLICATIONS.GET_ALL);
  return parseSchema(ApplicationListSchema, response, 'getApplications Response');
}

export async function getApplicationDetails(id: string): Promise<Application> {
  const response = await api.get<unknown>(API_ENDPOINTS.APPLICATIONS.GET_DETAILS(id));
  return parseSchema(ApplicationSchema, response, 'getApplicationDetails Response');
}

export async function applyForJob(
  jobId: string,
  payload: ApplyPayload,
): Promise<ApplicationActionResponse> {
  // If there are files, we need FormData, otherwise JSON
  let data: FormData | ApplyPayload = payload;
  let headers = {};

  if (payload.resumeFile || payload.coverLetterFile) {
    const formData = new FormData();
    if (payload.resumeFile) formData.append('resumeFile', payload.resumeFile);
    if (payload.coverLetterFile) formData.append('coverLetterFile', payload.coverLetterFile);
    if (payload.answers) formData.append('answers', JSON.stringify(payload.answers));
    if (payload.isDraft) formData.append('isDraft', 'true');
    data = formData;
    headers = { 'Content-Type': 'multipart/form-data' };
  }

  const response = await api.post<unknown>(API_ENDPOINTS.APPLICATIONS.APPLY(jobId), data, {
    headers,
  });
  return parseSchema(ApplicationActionResponseSchema, response, 'applyForJob Response');
}

export async function withdrawApplication(id: string): Promise<ApplicationActionResponse> {
  const response = await api.post<unknown>(API_ENDPOINTS.APPLICATIONS.WITHDRAW(id));
  return parseSchema(ApplicationActionResponseSchema, response, 'withdrawApplication Response');
}

export async function respondToOffer(
  id: string,
  payload: OfferResponsePayload,
): Promise<ApplicationActionResponse> {
  let data: FormData | OfferResponsePayload = payload;
  let headers = {};

  if (payload.acceptanceDocFile) {
    const formData = new FormData();
    formData.append('acceptanceDocFile', payload.acceptanceDocFile);
    formData.append('accept', String(payload.accept));
    if (payload.reason) formData.append('reason', payload.reason);
    data = formData;
    headers = { 'Content-Type': 'multipart/form-data' };
  }

  const response = await api.post<unknown>(API_ENDPOINTS.APPLICATIONS.RESPOND_OFFER(id), data, {
    headers,
  });
  return parseSchema(ApplicationActionResponseSchema, response, 'respondToOffer Response');
}
