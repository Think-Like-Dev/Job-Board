import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { ApplicationStatus } from '@common/constants/enums';
import { CandidateSchema } from '@modules/candidates/candidate.schema';
import { FileSchema } from '@modules/files/file.schema';
import { JobSchema } from '@modules/jobs/job.schema';

/**
 * A candidate's application to a job. The `(candidate_id, job_id)` pair is
 * unique: a draft and its submitted form are the same row, and later status
 * changes never create duplicates.
 */
export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  resumeFileId: string;
  coverLetterFileId?: string | null;
  status: ApplicationStatus;
  appliedAt?: Date | null;
  withdrawnAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ApplicationSchema = new EntitySchema<Application>({
  name: 'Application',
  tableName: 'applications',
  uniques: [
    {
      name: 'applications_candidate_job_unique',
      properties: ['candidateId', 'jobId'],
    },
  ],
  indexes: [
    { name: 'applications_job_id_index', properties: ['jobId'] },
    {
      name: 'applications_candidate_id_index',
      properties: ['candidateId'],
    },
    { name: 'applications_status_index', properties: ['status'] },
    { name: 'applications_applied_at_index', properties: ['appliedAt'] },
  ],
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    candidateId: {
      kind: 'm:1',
      entity: () => CandidateSchema,
      mapToPk: true,
      joinColumn: 'candidate_id',
      deleteRule: 'restrict',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_candidates_id_applications',
    } as unknown as EntitySchemaProperty<string, Application>,
    jobId: {
      kind: 'm:1',
      entity: () => JobSchema,
      mapToPk: true,
      joinColumn: 'job_id',
      deleteRule: 'restrict',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_jobs_id_applications',
    } as unknown as EntitySchemaProperty<string, Application>,
    resumeFileId: {
      kind: 'm:1',
      entity: () => FileSchema,
      mapToPk: true,
      joinColumn: 'resume_file_id',
      deleteRule: 'restrict',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_files_id_applications_resume',
    } as unknown as EntitySchemaProperty<string, Application>,
    coverLetterFileId: {
      kind: 'm:1',
      entity: () => FileSchema,
      mapToPk: true,
      joinColumn: 'cover_letter_file_id',
      nullable: true,
      deleteRule: 'set null',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_files_id_applications_cover',
    } as unknown as EntitySchemaProperty<string, Application>,
    status: {
      enum: true,
      items: () => ApplicationStatus,
      nativeEnumName: 'application_status',
      default: ApplicationStatus.APPLIED,
    },
    appliedAt: { type: 'datetime', nullable: true },
    withdrawnAt: { type: 'datetime', nullable: true },
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
    updatedAt: {
      type: 'datetime',
      defaultRaw: 'now()',
      onUpdate: () => new Date(),
    },
  },
});
