import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { ApplicationStatus } from '@common/constants/enums';
import { ApplicationSchema } from './application.schema';

/**
 * Append-only trail of application status transitions. `changed_by` is a bare
 * UUID because the actor can be a user (recruiter) or a candidate.
 */
export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  oldStatus?: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt?: Date;
}

export const ApplicationStatusHistorySchema =
  new EntitySchema<ApplicationStatusHistory>({
    name: 'ApplicationStatusHistory',
    tableName: 'application_status_history',
    indexes: [
      {
        name: 'application_status_history_application_id_index',
        properties: ['applicationId'],
      },
      {
        name: 'application_status_history_created_at_index',
        properties: ['createdAt'],
      },
    ],
    properties: {
      id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
      applicationId: {
        kind: 'm:1',
        entity: () => ApplicationSchema,
        mapToPk: true,
        joinColumn: 'application_id',
        deleteRule: 'cascade',
        updateRule: 'no action',
        deferMode: DeferMode.INITIALLY_IMMEDIATE,
        foreignKeyName: 'fk_applications_id_status_history',
      } as unknown as EntitySchemaProperty<string, ApplicationStatusHistory>,
      oldStatus: {
        enum: true,
        items: () => ApplicationStatus,
        nativeEnumName: 'application_status',
        nullable: true,
      },
      newStatus: {
        enum: true,
        items: () => ApplicationStatus,
        nativeEnumName: 'application_status',
      },
      reason: { type: 'text', nullable: true },
      changedBy: { type: 'uuid', nullable: true },
      createdAt: { type: 'datetime', defaultRaw: 'now()' },
    },
  });
