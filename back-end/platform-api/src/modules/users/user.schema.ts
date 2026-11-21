import { EntitySchema } from '@mikro-orm/core';
import { UserRole } from '@common/constants/enums';
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
 * Defined with the MikroORM v7 `EntitySchema` API (decorators were removed in v7).
 */
export interface User extends SoftDeletable {
  id: string;
  name?: string;
  email: string;
  passwordHash?: string;
  role?: UserRole;
  isActive: boolean;
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
  filters: softDeleteFilter,
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    name: { type: 'string', nullable: true },
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
    isActive: { type: 'boolean', default: true },
    ...softDeleteProperty,
    createdAt: { type: 'datetime', nullable: true },
    updatedAt: { type: 'datetime', nullable: true },
  },
});
