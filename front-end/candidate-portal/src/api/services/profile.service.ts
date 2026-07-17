import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  CandidateProfileSchema,
  UpdateProfilePayloadSchema,
  UploadResponseSchema,
} from '../schemas/profile.schema';
import type { CandidateProfile, UpdateProfilePayload, UploadResponse } from '../../types/profile.types';

export async function getProfile(): Promise<CandidateProfile> {
  const response = await api.get<unknown>(API_ENDPOINTS.PROFILE.GET);
  return parseSchema(CandidateProfileSchema, response, 'getProfile Response');
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<CandidateProfile> {
  const validatedPayload = parseSchema(UpdateProfilePayloadSchema, payload, 'updateProfile Payload');
  const response = await api.post<unknown>(API_ENDPOINTS.PROFILE.UPDATE, validatedPayload);
  return parseSchema(CandidateProfileSchema, response, 'updateProfile Response');
}

export async function uploadPicture(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<unknown>(API_ENDPOINTS.PROFILE.UPLOAD_PIC, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return parseSchema(UploadResponseSchema, response, 'uploadPicture Response');
}

export async function uploadResume(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<unknown>(API_ENDPOINTS.PROFILE.UPLOAD_RESUME, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return parseSchema(UploadResponseSchema, response, 'uploadResume Response');
}
