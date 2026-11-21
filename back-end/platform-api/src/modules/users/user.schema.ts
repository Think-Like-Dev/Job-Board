import { EntitySchema, type EntitySchemaProperty } from '@mikro-orm/core';
import { UserRole, UserStatus } from '@common/constants/enums';
import {
  softDeleteFilter,
  softDeleteProperty,
  type SoftDeletable,
} from '@common/persistence/soft-delete';

/**
 * User accounts for recruiters / admins / hiring managers.
 * Candidate accounts are NOT stored here — candidates live in the
 * `candidates` table and are authenticated by email + OTP without a password.
 *
 * An invited user exists immediately (`status = INVITED`, no password) and
 * becomes `ACTIVE` after onboarding through the emailed single-use link.
 *
 * Defined with the MikroORM v7 `EntitySchema` API (decorators were removed in v7).
 */
export interface User extends SoftDeletable {
  id: string;
  /** Display name, kept in sync with the parts collected at onboarding. */
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  email: string;
  passwordHash?: string;
  role?: UserRole;
  status: UserStatus;
  isActive: boolean;
  /** SHA-256 of the current invitation token (single use). */
  inviteTokenHash?: string | null;
  inviteExpiresAt?: Date | null;
  invitedBy?: string | null;
  invitedAt?: Date | null;
  /** How many times the invitation email has been sent (max 3). */
  inviteSendCount: number;
  lastInviteSentAt?: Date | null;
  onboardedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = new EntitySchema<User>({
  name: 'User',
  tableName: 'users',
  // Email is unique only among live rows: a deleted account must not block a
  // new account (or a re-invite) on the same address.
  uniques: [
    {
      name: 'users_email_unique',
      properties: ['email'],
      where: { deletedAt: null },
    },
  ],
  indexes: [
    { name: 'users_role_index', properties: ['role'] },
    { name: 'users_status_index', properties: ['status'] },
    { name: 'users_invite_token_hash_index', properties: ['inviteTokenHash'] },
  ],
  filters: softDeleteFilter,
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    name: { type: 'string', nullable: true },
    firstName: { type: 'string', nullable: true },
    lastName: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    jobTitle: { type: 'string', nullable: true },
    email: { type: 'string' },
    // Never serialized: responses go through `toUserResponse`. `hidden` is a
    // second line of defence if an entity is ever serialized directly.
    passwordHash: { type: 'string', nullable: true, hidden: true },
    role: {
      enum: true,
      items: () => UserRole,
      nativeEnumName: 'user_role',
      nullable: true,
    },
    status: {
      enum: true,
      items: () => UserStatus,
      nativeEnumName: 'user_status',
      default: UserStatus.ACTIVE,
    },
    isActive: { type: 'boolean', default: true },
    inviteTokenHash: { type: 'string', nullable: true },
    inviteExpiresAt: { type: 'datetime', nullable: true },
    invitedBy: {
      kind: 'm:1',
      entity: () => UserSchema,
      mapToPk: true,
      joinColumn: 'invited_by',
      nullable: true,
      deleteRule: 'set null',
      updateRule: 'no action',
      foreignKeyName: 'fk_users_id_invited_by',
    } as unknown as EntitySchemaProperty<string, User>,
    invitedAt: { type: 'datetime', nullable: true },
    inviteSendCount: { type: 'integer', default: 0 },
    lastInviteSentAt: { type: 'datetime', nullable: true },
    onboardedAt: { type: 'datetime', nullable: true },
    ...softDeleteProperty,
    createdAt: { type: 'datetime', nullable: true },
    updatedAt: { type: 'datetime', nullable: true },
  },
});
