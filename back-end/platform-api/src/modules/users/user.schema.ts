import { EntitySchema } from '@mikro-orm/core';
import { UserRole } from '@common/constants/enums';

/**
 * User accounts for recruiters / admins / hiring managers.
 * Candidate accounts are NOT stored here — candidates live in the
 * `candidates` table and are authenticated by email + OTP without a password.
 *
 * Defined with the MikroORM v7 `EntitySchema` API (decorators were removed in v7).
 */
export interface User {
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
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    name: { type: 'string', nullable: true },
    email: { type: 'string', unique: true },
    passwordHash: { type: 'string', nullable: true },
    role: {
      enum: true,
      items: () => UserRole,
      nativeEnumName: 'user_role',
      nullable: true,
    },
    isActive: { type: 'boolean', default: true },
    createdAt: { type: 'datetime', nullable: true },
    updatedAt: { type: 'datetime', nullable: true },
  },
});
