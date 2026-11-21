import { RequiredEntityData, FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { GenericCrudService } from '@common/factory/generic-crud.service';
import { UserRole, UserStatus } from '@common/constants/enums';
import type { SessionPayload } from '@modules/auth/auth.service';
import { User, UserSchema } from './user.schema';
import {
  AcceptInvitationDto,
  CreateUserDto,
  InvitationPreviewDto,
  UpdateUserDto,
  UserQueryDto,
} from './user.dto';
import { InvitationService, hashInvitationToken } from './invitation.service';
import { UserPolicyService } from './user-policy.service';
import {
  INVITE_RATE_LIMIT,
  INVITE_RATE_WINDOW_MS,
} from './invitation.constants';

export interface InvitationResult {
  user: User;
  invitationUrl: string;
}

@Injectable()
export class UsersService extends GenericCrudService<User> {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserSchema)
    repository: EntityRepository<User>,
    private readonly invitations: InvitationService,
    private readonly policy: UserPolicyService,
  ) {
    super(repository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ email: email.trim().toLowerCase() });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return argon2.verify(user.passwordHash, password);
  }

  /** Replaces a user's password (password reset, onboarding). */
  async setPassword(id: string, password: string): Promise<void> {
    await this.update(
      { id },
      { passwordHash: await argon2.hash(password), updatedAt: new Date() },
    );
  }

  // ─── Invitations ───────────────────────────────────────────────────────────

  /**
   * Creates an `INVITED` user and emails the onboarding link.
   *
   * Existing addresses are never silently reused: a live account answers 409
   * with its current status, while a previously revoked invitation is revived
   * in place (the row is soft-deleted, not destroyed).
   */
  async inviteUser(
    actor: SessionPayload,
    dto: CreateUserDto,
  ): Promise<InvitationResult> {
    this.policy.assertCanInvite(actor, dto.role);
    await this.assertInviteRateLimit(actor.principalId);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.repository.findOne(
      { email },
      { filters: false },
    );

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        `A user with this email already exists (${existing.status})`,
      );
    }

    const token = this.invitations.createToken();
    const now = new Date();
    const firstName = dto.firstName?.trim() || null;
    const lastName = dto.lastName?.trim() || null;

    const data: Partial<User> = {
      email,
      role: dto.role,
      firstName,
      lastName,
      name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      status: UserStatus.INVITED,
      isActive: true,
      passwordHash: undefined,
      inviteTokenHash: token.hash,
      inviteExpiresAt: token.expiresAt,
      invitedBy: actor.principalId,
      invitedAt: now,
      inviteSendCount: 1,
      lastInviteSentAt: now,
      onboardedAt: null,
      deletedAt: null,
      updatedAt: now,
    };

    let user: User;
    if (existing) {
      this.repository.assign(existing, data);
      user = existing;
    } else {
      user = this.repository.create({
        ...data,
        createdAt: now,
      } as RequiredEntityData<User>);
      this.repository.getEntityManager().persist(user);
    }

    await this.repository.getEntityManager().flush();

    const url = await this.deliverInvitation(user, token.token, actor);
    return { user, invitationUrl: url };
  }

  /** Resends an invitation, rotating the token and enforcing the limits. */
  async resendInvitation(
    actor: SessionPayload,
    id: string,
  ): Promise<InvitationResult> {
    const user = await this.findOne({ id });
    this.policy.assertCanManage(actor, user);

    const eligibility = this.invitations.canResend(user);
    if (!eligibility.allowed) {
      throw new BadRequestException(eligibility.reason);
    }

    const token = this.invitations.createToken();
    user.inviteTokenHash = token.hash;
    user.inviteExpiresAt = token.expiresAt;
    user.inviteSendCount += 1;
    user.lastInviteSentAt = new Date();
    user.updatedAt = new Date();
    await this.repository.getEntityManager().flush();

    const url = await this.deliverInvitation(user, token.token, actor);
    return { user, invitationUrl: url };
  }

  /**
   * Hard-deletes a pending invitation.
   *
   * An invited user never signed in and owns no data, so the row is removed
   * instead of soft-deleted: the address can be invited again immediately and
   * no "INVITED + deleted" limbo row is left behind.
   */
  async deleteInvitationByActor(
    actor: SessionPayload,
    id: string,
  ): Promise<boolean> {
    const user = await this.findOne({ id });
    this.policy.assertCanManage(actor, user);

    if (user.status !== UserStatus.INVITED) {
      throw new BadRequestException('Only a pending invitation can be deleted');
    }

    const em = this.repository.getEntityManager();
    em.remove(user);
    await em.flush();
    return true;
  }

  /** Previews an invitation token for the public onboarding screen. */
  async previewInvitation(token: string): Promise<InvitationPreviewDto> {
    const user = await this.findByInvitationToken(token);
    return {
      email: user.email,
      role: user.role ?? UserRole.HIRING_MANAGER,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      expiresAt: (user.inviteExpiresAt as Date).toISOString(),
    };
  }

  /** Completes onboarding: password + details, status becomes `ACTIVE`. */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<User> {
    const user = await this.findByInvitationToken(dto.token);
    const now = new Date();

    user.passwordHash = await argon2.hash(dto.password);
    user.firstName = dto.firstName.trim();
    user.lastName = dto.lastName.trim();
    user.name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name;
    user.phone = dto.phone.trim();
    user.jobTitle = dto.jobTitle.trim();
    user.status = UserStatus.ACTIVE;
    user.isActive = true;
    user.onboardedAt = now;
    user.inviteTokenHash = null;
    user.inviteExpiresAt = null;
    user.updatedAt = now;

    await this.repository.getEntityManager().flush();
    return user;
  }

  // ─── Team listing and updates ──────────────────────────────────────────────

  /**
   * Lists the users the actor may manage. A recruiter only sees hiring
   * managers; an admin sees everyone and may filter.
   */
  async listForActor(actor: SessionPayload, query: UserQueryDto) {
    const where: FilterQuery<User> = {};

    if ((actor.role as UserRole) === UserRole.ADMIN) {
      if (query.role) where.role = query.role;
    } else {
      where.role = UserRole.HIRING_MANAGER;
    }

    if (query.status) where.status = query.status;

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      where.$or = [{ email: { $ilike: term } }, { name: { $ilike: term } }];
    }

    return this.findAllPaginated(query, where, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  async readForActor(actor: SessionPayload, id: string): Promise<User> {
    const user = await this.findOne({ id });
    this.policy.assertCanRead(actor, user);
    return user;
  }

  async updateUserByActor(
    actor: SessionPayload,
    id: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findOne({ id });
    const otherActiveAdmins =
      user.role === UserRole.ADMIN
        ? await this.repository.count({
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            id: { $ne: user.id },
          })
        : 0;
    this.policy.assertCanUpdate(actor, user, dto, otherActiveAdmins);

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.jobTitle !== undefined) user.jobTitle = dto.jobTitle;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.status !== undefined) {
      user.status = dto.status;
      user.isActive = dto.status === UserStatus.ACTIVE;
    }
    user.updatedAt = new Date();

    await this.repository.getEntityManager().flush();
    return user;
  }

  /** Soft-deletes a user, refusing to remove the last active administrator. */
  async deleteUserByActor(actor: SessionPayload, id: string): Promise<boolean> {
    if (actor.principalId === id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.findOne({ id });
    if (user.role === UserRole.ADMIN) {
      const otherAdmins = await this.repository.count({
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        id: { $ne: user.id },
      });
      if (otherAdmins === 0) {
        throw new BadRequestException(
          'The last administrator cannot be deleted',
        );
      }
    }

    return this.remove({ id });
  }

  // ─── internals ─────────────────────────────────────────────────────────────

  private async findByInvitationToken(token: string): Promise<User> {
    if (!token) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const user = await this.repository.findOne(
      { inviteTokenHash: hashInvitationToken(token) },
      { filters: false },
    );

    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.INVITED ||
      !user.inviteExpiresAt ||
      user.inviteExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    return user;
  }

  private async assertInviteRateLimit(actorId: string): Promise<void> {
    const since = new Date(Date.now() - INVITE_RATE_WINDOW_MS);
    const recent = await this.repository.count(
      { invitedBy: actorId, invitedAt: { $gte: since } },
      { filters: false },
    );
    if (recent >= INVITE_RATE_LIMIT) {
      throw new BadRequestException(
        'Invitation limit reached; try again tomorrow',
      );
    }
  }

  private async deliverInvitation(
    user: User,
    token: string,
    actor: SessionPayload,
  ): Promise<string> {
    const url = this.invitations.invitationUrl(token);
    const inviter = await this.repository.findOne({
      id: actor.principalId,
    });
    const inviterName = inviter?.name || inviter?.email || 'Your team';

    try {
      await this.invitations.send(user, token, inviterName);
    } catch (error) {
      // Keep the invitation (and return the link) when SMTP is unavailable;
      // the inviter can copy the link or resend later.
      this.logger.warn(
        `Invitation mail to ${user.email} failed: ${(error as Error).message}`,
      );
    }

    return url;
  }
}
