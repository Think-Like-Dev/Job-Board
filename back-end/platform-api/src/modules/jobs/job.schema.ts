import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import {
  CompensationType,
  EmploymentType,
  JobStatus,
  WorkMode,
} from '@common/constants/enums';
import { UserSchema } from '@modules/users/user.schema';

/** Compensation payload stored as JSONB, mirroring the recruiter form union. */
export interface JobCompensation {
  type: CompensationType;
  currency?: string;
  period?: string;
  amount?: number | number[];
}

export interface JobApplicationSettings {
  coverLetterRequired: boolean;
  attachmentsAllowed: boolean;
  maximumAttachments: number;
}

/**
 * Job posting owned by an internal user (`created_by` -> users.id).
 * Array/settings fields are JSONB so the create payload can be persisted
 * without a join table per list field. Dynamic application questions are a
 * separate module planned later.
 */
export interface Job {
  id: string;
  code: string;
  title: string;
  category: string;
  department?: string;
  designation?: string;
  employmentType: EmploymentType;
  location: string;
  description: string;
  responsibilities?: string;
  yearsOfExperience?: string;
  compensation?: JobCompensation | null;
  workMode: WorkMode[];
  workShiftTiming: string[];
  skills: string[];
  keywords: string[];
  benefits: string[];
  vacancies: number;
  totalInterviewRounds?: number;
  lastApplicationDate?: string;
  applicationSettings?: JobApplicationSettings | null;
  hiringProcess?: string[];
  status: JobStatus;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const JobSchema = new EntitySchema<Job>({
  name: 'Job',
  tableName: 'jobs',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    code: { type: 'string', unique: true },
    title: { type: 'string' },
    category: { type: 'string' },
    department: { type: 'string', nullable: true },
    designation: { type: 'string', nullable: true },
    employmentType: {
      enum: true,
      items: () => EmploymentType,
      nativeEnumName: 'employment_type',
    },
    location: { type: 'string' },
    description: { type: 'text' },
    responsibilities: { type: 'text', nullable: true },
    yearsOfExperience: { type: 'string', nullable: true },
    compensation: { type: 'json', columnType: 'jsonb', nullable: true },
    workMode: { type: 'json', columnType: 'jsonb' },
    workShiftTiming: { type: 'json', columnType: 'jsonb' },
    skills: { type: 'json', columnType: 'jsonb' },
    keywords: { type: 'json', columnType: 'jsonb' },
    benefits: { type: 'json', columnType: 'jsonb' },
    vacancies: { type: 'integer', default: 1 },
    totalInterviewRounds: { type: 'integer', nullable: true },
    lastApplicationDate: { type: 'date', nullable: true },
    applicationSettings: { type: 'json', columnType: 'jsonb', nullable: true },
    hiringProcess: { type: 'json', columnType: 'jsonb', nullable: true },
    status: {
      enum: true,
      items: () => JobStatus,
      nativeEnumName: 'job_status',
      default: JobStatus.DRAFT,
    },
    // `mapToPk` keeps the public property as the user's UUID string, matching
    // the candidate -> file profile-image relation.
    createdBy: {
      kind: 'm:1',
      entity: () => UserSchema,
      mapToPk: true,
      joinColumn: 'created_by',
      nullable: true,
      deleteRule: 'restrict',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_users_id_jobs',
    } as unknown as EntitySchemaProperty<string, Job>,
    createdAt: { type: 'datetime', nullable: true },
    updatedAt: { type: 'datetime', nullable: true },
  },
});
