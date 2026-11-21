import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@common/constants/enums';
import type { SessionPayload } from '@modules/auth/auth.service';
import type { UpdateUserDto } from './user.dto';
import type { User } from './user.schema';

/**
 * Who may do what to whom.
 *
 * Authorization is permission-based (`@RequirePermission`); these rules refine
 * it by target. They are deliberately in one service so the target matrix can
 * move to data along with the permission registry.
 *
 * Current matrix:
 *  - ADMIN: every internal user, any role/status, minus demoting the last admin.
 *  - RECRUITER: may invite and manage hiring managers; may read every hiring
 *    manager (company scoping arrives with organisations); may update only
 *    profile fields, never role/status, and never another recruiter or admin.
 */
@Injectable()
export class UserPolicyService {
  rolesActorMayManage(actor: Pick<SessionPayload, 'role'>): UserRole[] {
    if ((actor.role as UserRole) === UserRole.ADMIN) {
      return [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER];
    }
    if ((actor.role as UserRole) === UserRole.RECRUITER) {
      return [UserRole.HIRING_MANAGER];
    }
    return [];
  }

  canManage(
    actor: Pick<SessionPayload, 'role'>,
    target: Pick<User, 'role'>,
  ): boolean {
    if ((actor.role as UserRole) === UserRole.ADMIN) {
      return true;
    }
    return Boolean(
      target.role && this.rolesActorMayManage(actor).includes(target.role),
    );
  }

  assertCanInvite(actor: Pick<SessionPayload, 'role'>, role: UserRole): void {
    if (!this.rolesActorMayManage(actor).includes(role)) {
      throw new ForbiddenException('Your role cannot invite that kind of user');
    }
  }

  /** Throws unless the actor may read, update or revoke the target user. */
  assertCanManage(
    actor: Pick<SessionPayload, 'role'>,
    target: Pick<User, 'role'>,
  ): void {
    if (!this.canManage(actor, target)) {
      throw new ForbiddenException('You cannot manage this user');
    }
  }

  assertCanRead(
    actor: Pick<SessionPayload, 'role' | 'principalId'>,
    target: Pick<User, 'id' | 'role'>,
  ): void {
    if (
      (actor.role as UserRole) === UserRole.ADMIN ||
      actor.principalId === target.id
    ) {
      return;
    }
    if (!this.canManage(actor, target)) {
      throw new ForbiddenException('You cannot view this user');
    }
  }

  /**
   * Applies the update matrix. Throws before anything is written.
   *
   * `otherActiveAdmins` is the count of active admins excluding the target,
   * used to protect the last admin from demotion or suspension.
   */
  assertCanUpdate(
    actor: Pick<SessionPayload, 'role' | 'principalId'>,
    target: Pick<User, 'id' | 'role'>,
    dto: UpdateUserDto,
    otherActiveAdmins: number,
  ): void {
    const touchesRoleOrStatus =
      dto.role !== undefined || dto.status !== undefined;

    if ((actor.role as UserRole) === UserRole.ADMIN) {
      const demoting =
        target.role === UserRole.ADMIN &&
        ((dto.role !== undefined && dto.role !== UserRole.ADMIN) ||
          (dto.status !== undefined && dto.status !== UserStatus.ACTIVE));
      if (demoting && otherActiveAdmins === 0) {
        throw new ForbiddenException(
          'The last administrator cannot be demoted',
        );
      }
      return;
    }

    // Any signed-in user may edit their own profile, never their access.
    if (actor.principalId === target.id) {
      if (touchesRoleOrStatus) {
        throw new ForbiddenException(
          'You cannot change your own role or status',
        );
      }
      return;
    }

    if (!this.canManage(actor, target)) {
      throw new ForbiddenException('You cannot manage this user');
    }

    if (touchesRoleOrStatus) {
      throw new ForbiddenException(
        'Only an administrator can change a role or a status',
      );
    }
  }
}
