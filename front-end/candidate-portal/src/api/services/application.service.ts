import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  ApplicationDetailResponseSchema,
  ApplicationListResponseSchema,
} from '../schemas/application.schema';
import type {
  ApplicationActionResponse,
  ApplicationDetail,
  ApplicationListResponse,
  ApplicationQueryParams,
  ApplyPayload,
} from '../../types/application.types';

export async function getApplications(
  params: ApplicationQueryParams = {},
): Promise<ApplicationListResponse> {
  const response = await api.get<unknown>(
    API_ENDPOINTS.APPLICATIONS.GET_ALL,
    { params },
  );
  const parsed = parseSchema(
    ApplicationListResponseSchema,
    response,
    'getApplications Response',
  );
  return parsed;
}

export async function getApplicationDetails(
  id: string,
): Promise<ApplicationDetail> {
  const response = await api.get<unknown>(
    API_ENDPOINTS.APPLICATIONS.GET_DETAILS(id),
  );
  const parsed = parseSchema(
    ApplicationDetailResponseSchema,
    response,
    'getApplicationDetails Response',
  );
  return parsed.data;
}

export async function applyForJob(
  jobId: string,
  payload: ApplyPayload,
): Promise<ApplicationActionResponse> {
  const hasFiles = Boolean(payload.resumeFile || payload.coverLetterFile);

  // Multipart is required only when a file part is present; the DTO also
  // accepts a JSON body for drafts and central-document-only applications.
  let data: FormData | ApplyPayload = payload;
  let headers: Record<string, string> = {};

  if (hasFiles) {
    const formData = new FormData();
    if (payload.resumeFile) formData.append('resumeFile', payload.resumeFile);
    if (payload.coverLetterFile) {
      formData.append('coverLetterFile', payload.coverLetterFile);
    }
    if (payload.existingResumeFileId) {
      formData.append('existingResumeFileId', payload.existingResumeFileId);
    }
    if (payload.updateProfileResume) {
      formData.append('updateProfileResume', 'true');
    }
    if (payload.updateProfileCoverLetter) {
      formData.append('updateProfileCoverLetter', 'true');
    }
    if (payload.isDraft) formData.append('isDraft', 'true');
    data = formData;
    headers = { 'Content-Type': 'multipart/form-data' };
  }

  const response = await api.post<unknown>(
    API_ENDPOINTS.APPLICATIONS.APPLY(jobId),
    data,
    { headers },
  );
  const parsed = parseSchema(
    ApplicationDetailResponseSchema,
    response,
    'applyForJob Response',
  );

  return {
    success: parsed.success,
    message: parsed.message,
    applicationId: parsed.data.id,
  };
}

export async function withdrawApplication(
  id: string,
  reason?: string,
): Promise<ApplicationActionResponse> {
  const response = await api.post<unknown>(
    API_ENDPOINTS.APPLICATIONS.WITHDRAW(id),
    reason ? { reason } : undefined,
  );
  const parsed = parseSchema(
    ApplicationDetailResponseSchema,
    response,
    'withdrawApplication Response',
  );

  return {
    success: parsed.success,
    message: parsed.message,
    applicationId: parsed.data.id,
  };
}

/** Hard-deletes a draft application. Submitted applications are immutable. */
export async function deleteApplication(id: string): Promise<void> {
  await api.delete(API_ENDPOINTS.APPLICATIONS.DELETE(id));
}


