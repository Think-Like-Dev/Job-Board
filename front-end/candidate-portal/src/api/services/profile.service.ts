import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  CandidateProfileSchema,
  FileUploadResponseSchema,
  ProfileResponseSchema,
  UpdateProfilePayloadSchema,
} from '../schemas/profile.schema';
import type {
  CandidateProfile,
  UpdateProfilePayload,
  UploadedFile,
} from '../../types/profile.types';

export type ProfileFileType =
  | 'PROFILE_IMAGE'
  | 'RESUME'
  | 'COVER_LETTER'
  | 'CERTIFICATION';

export async function getProfile(): Promise<CandidateProfile> {
  const response = await api.get<unknown>(API_ENDPOINTS.PROFILE.GET);
  const parsed = parseSchema(
    ProfileResponseSchema,
    response,
    'getProfile Response',
  );
  return parseSchema(
    CandidateProfileSchema,
    parsed.data,
    'getProfile Data',
  );
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<CandidateProfile> {
  const validated = parseSchema(
    UpdateProfilePayloadSchema,
    payload,
    'updateProfile Payload',
  );
  const response = await api.put<unknown>(
    API_ENDPOINTS.PROFILE.UPDATE,
    validated,
  );
  const parsed = parseSchema(
    ProfileResponseSchema,
    response,
    'updateProfile Response',
  );
  return parseSchema(
    CandidateProfileSchema,
    parsed.data,
    'updateProfile Data',
  );
}

export async function uploadProfileFile(
  file: File,
  fileType: ProfileFileType,
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);

  const response = await api.post<unknown>(
    API_ENDPOINTS.FILES.UPLOAD,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  const parsed = parseSchema(
    FileUploadResponseSchema,
    response,
    'uploadProfileFile Response',
  );
  // The upload response is the source of truth, but fall back to the local
  // file metadata so the optimistic profile row always has a filename.
  return {
    ...parsed.data,
    filename: parsed.data.filename ?? file.name,
    mimeType: parsed.data.mimeType ?? file.type,
    size: parsed.data.size ?? file.size,
  };
}

export async function deleteFile(id: string): Promise<void> {
  await api.delete(API_ENDPOINTS.FILES.DELETE(id));
}

export async function fetchFileBlob(id: string): Promise<Blob> {
  return api.get<Blob>(API_ENDPOINTS.FILES.CONTENT(id), {
    responseType: 'blob',
  });
}
