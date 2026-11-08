import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { FileSchema } from '@modules/files/file.schema';
import { SkillSchema } from '@modules/skills/skill.schema';
import { CandidateSchema } from './candidate.schema';

/**
 * A certification on the candidate's live profile. A credential is either a
 * URL, an uploaded soft copy, or both; the migration enforces at least one.
 */
export interface CandidateCertification {
  id: string;
  candidateId: string;
  title: string;
  issuer?: string | null;
  skillId?: string | null;
  credentialUrl?: string | null;
  fileId?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const CandidateCertificationSchema =
  new EntitySchema<CandidateCertification>({
    name: 'CandidateCertification',
    tableName: 'candidate_certifications',
    indexes: [
      {
        name: 'candidate_certifications_candidate_id_index',
        properties: ['candidateId'],
      },
    ],
    checks: [
      {
        name: 'candidate_certifications_credential_check',
        expression: '("credential_url" is not null or "file_id" is not null)',
      },
    ],
    properties: {
      id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
      candidateId: {
        kind: 'm:1',
        entity: () => CandidateSchema,
        mapToPk: true,
        joinColumn: 'candidate_id',
        deleteRule: 'cascade',
        updateRule: 'no action',
        deferMode: DeferMode.INITIALLY_IMMEDIATE,
        foreignKeyName: 'fk_candidates_id_candidate_certifications',
      } as unknown as EntitySchemaProperty<string, CandidateCertification>,
      title: { type: 'string' },
      issuer: { type: 'string', nullable: true },
      skillId: {
        kind: 'm:1',
        entity: () => SkillSchema,
        mapToPk: true,
        joinColumn: 'skill_id',
        nullable: true,
        deleteRule: 'set null',
        updateRule: 'no action',
        deferMode: DeferMode.INITIALLY_IMMEDIATE,
        foreignKeyName: 'fk_skills_id_candidate_certifications',
      } as unknown as EntitySchemaProperty<string, CandidateCertification>,
      credentialUrl: { type: 'text', nullable: true },
      fileId: {
        kind: 'm:1',
        entity: () => FileSchema,
        mapToPk: true,
        joinColumn: 'file_id',
        nullable: true,
        deleteRule: 'restrict',
        updateRule: 'no action',
        deferMode: DeferMode.INITIALLY_IMMEDIATE,
        foreignKeyName: 'fk_files_id_candidate_certifications',
      } as unknown as EntitySchemaProperty<string, CandidateCertification>,
      issueDate: { type: 'date', nullable: true },
      expiryDate: { type: 'date', nullable: true },
      createdAt: { type: 'datetime', defaultRaw: 'now()' },
      updatedAt: {
        type: 'datetime',
        defaultRaw: 'now()',
        onUpdate: () => new Date(),
      },
    },
  });
