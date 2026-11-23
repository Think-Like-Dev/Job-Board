import type { Candidate } from '@modules/candidates/candidate.schema';
import type { File } from '@modules/files/file.schema';
import type { Job } from '@modules/jobs/job.schema';
import type { ProfileView } from '@modules/profiles/profile.types';
import { toProfileDto } from '@modules/profiles/profile.presenter';
import type { ApplicationStatusHistory } from './application-status-history.schema';
import type { Application } from './application.schema';
import type {
  ApplicationStatusHistoryDto,
  CandidateApplicationDetailDto,
  CandidateApplicationSummaryDto,
  CandidateJobApplicationListItemDto,
  RecruiterApplicationDetailDto,
  RecruiterApplicationListItemDto,
} from './dto/application-response.dto';

/** Guarded streaming route, relative to the API base (the client adds `/api`). */
const FILE_CONTENT_BASE = '/files';

function toIso(value?: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

function fileUrl(fileId: string): string {
  return `${FILE_CONTENT_BASE}/${fileId}/content`;
}

function downloadUrl(fileId: string): string {
  return `${fileUrl(fileId)}?download=true`;
}

export function toStatusHistoryDto(
  history: ApplicationStatusHistory,
): ApplicationStatusHistoryDto {
  return {
    id: history.id,
    oldStatus: history.oldStatus ?? null,
    newStatus: history.newStatus,
    reason: history.reason ?? null,
    changedBy: history.changedBy ?? null,
    createdAt: history.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function toCandidateApplicationSummaryDto(
  application: Application,
  job: Job | null | undefined,
  resume: File | null | undefined,
  coverLetter: File | null | undefined,
): CandidateApplicationSummaryDto {
  return {
    id: application.id,
    jobId: application.jobId,
    jobTitle: job?.title ?? '',
    jobCategory: job?.category ?? '',
    jobLocation: job?.location ?? '',
    status: application.status,
    appliedAt: toIso(application.appliedAt) ?? null,
    createdAt: application.createdAt?.toISOString() ?? new Date().toISOString(),
    withdrawnAt: toIso(application.withdrawnAt) ?? null,
    resumeFileId: application.resumeFileId,
    resumeFileName: resume?.filename ?? '',
    resumeFileUrl: downloadUrl(application.resumeFileId),
    coverLetterFileId: application.coverLetterFileId ?? undefined,
    coverLetterFileName: coverLetter?.filename ?? undefined,
    coverLetterFileUrl: application.coverLetterFileId
      ? downloadUrl(application.coverLetterFileId)
      : undefined,
  };
}

export function toCandidateApplicationDetailDto(
  application: Application,
  job: Job | null | undefined,
  resume: File | null | undefined,
  coverLetter: File | null | undefined,
  history: ApplicationStatusHistory[],
): CandidateApplicationDetailDto {
  return {
    ...toCandidateApplicationSummaryDto(application, job, resume, coverLetter),
    updatedAt: toIso(application.updatedAt),
    statusHistory: history.map(toStatusHistoryDto),
  };
}

export function candidateDisplayName(candidate: Candidate): string {
  return displayName(candidate.firstName, candidate.lastName, candidate.email);
}

function profileDisplayName(profile: ProfileView): string {
  return displayName(profile.firstName, profile.lastName, profile.email);
}

function displayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string,
): string {
  const name = [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return name || email;
}

export function toRecruiterApplicationListItemDto(
  application: Application,
  candidate: Candidate,
  resume: File | null | undefined,
  profile?: ProfileView,
): RecruiterApplicationListItemDto {
  return {
    id: application.id,
    candidateId: application.candidateId,
    candidateName: profile
      ? profileDisplayName(profile)
      : candidateDisplayName(candidate),
    candidateEmail: profile?.email ?? candidate.email,
    candidatePhone: profile?.phone ?? candidate.phone ?? undefined,
    resumeFileId: application.resumeFileId,
    resumeFileName: resume?.filename ?? '',
    status: application.status,
    appliedAt: toIso(application.appliedAt) ?? null,
    createdAt: application.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function toCandidateJobApplicationListItemDto(
  application: Application,
  job: Job,
): CandidateJobApplicationListItemDto {
  return {
    id: application.id,
    jobId: application.jobId,
    jobTitle: job.title,
    jobCode: job.code,
    jobCategory: job.category,
    jobDepartment: job.department ?? null,
    jobLocation: job.location,
    status: application.status,
    appliedAt: toIso(application.appliedAt) ?? null,
    createdAt: application.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function toRecruiterApplicationDetailDto(
  application: Application,
  candidate: Candidate,
  resume: File | null | undefined,
  coverLetter: File | null | undefined,
  history: ApplicationStatusHistory[],
  profile: ProfileView,
): RecruiterApplicationDetailDto {
  return {
    ...toRecruiterApplicationListItemDto(
      application,
      candidate,
      resume,
      profile,
    ),
    resumeFileUrl: downloadUrl(application.resumeFileId),
    coverLetterFileId: application.coverLetterFileId ?? undefined,
    coverLetterFileName: coverLetter?.filename ?? undefined,
    coverLetterFileUrl: application.coverLetterFileId
      ? downloadUrl(application.coverLetterFileId)
      : undefined,
    withdrawnAt: toIso(application.withdrawnAt) ?? null,
    updatedAt: toIso(application.updatedAt),
    profileVersionId: application.profileVersionId ?? undefined,
    profile: toProfileDto(profile),
    candidate: {
      firstName: profile.firstName ?? undefined,
      lastName: profile.lastName ?? undefined,
      email: profile.email,
      phone: profile.phone ?? undefined,
      linkedinUrl: profile.linkedinUrl ?? undefined,
      portfolioUrl: profile.portfolioUrl ?? undefined,
      profileImageFileId: profile.profileImage?.id,
      resumeFileId: profile.resume?.id,
    },
    statusHistory: history.map(toStatusHistoryDto),
  };
}
