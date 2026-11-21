import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { UserRole, UserStatus } from '@common/constants/enums';
import { appUrl } from '@common/utils/app-url';
import type { User } from './user.schema';
import { MailService } from '@modules/mail/mail.service';
import type { AppConfig } from '@src/config/configuration';
import {
  INVITE_MAX_SENDS,
  INVITE_RESEND_COOLDOWN_MS,
  INVITE_TTL_MS,
} from './invitation.constants';

export interface InvitationToken {
  token: string;
  hash: string;
  expiresAt: Date;
}

/** Human label used in the invitation email. */
export function roleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return 'an administrator';
    case UserRole.RECRUITER:
      return 'a recruiter';
    default:
      return 'a hiring manager';
  }
}

/**
 * Invitation tokens and delivery.
 *
 * Only the SHA-256 hash of a token is persisted, the link is single use and
 * expires after `INVITE_TTL_DAYS`. The service also owns the send counters
 * (cooldown, maximum sends) so the rules live in one place.
 */
@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);
  private readonly appBaseUrl: string;

  constructor(
    private readonly mail: MailService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.appBaseUrl = config
      .get('mail', { infer: true })
      .appBaseUrl.replace(/\/$/, '');
  }

  /** Generates a token, returning the raw value and the hash to persist. */
  createToken(): InvitationToken {
    const token = crypto.randomBytes(32).toString('hex');
    return {
      token,
      hash: hashInvitationToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    };
  }

  invitationUrl(token: string): string {
    return appUrl(this.appBaseUrl, `/onboard/${token}`);
  }

  /** Sends (or resends) the invitation email. */
  async send(
    user: Pick<User, 'email' | 'role'>,
    token: string,
    inviterName: string,
  ): Promise<void> {
    const role = user.role;
    if (!role) {
      throw new Error('An invited user must have a role');
    }
    await this.mail.sendInvitation(
      user.email,
      this.invitationUrl(token),
      roleLabel(role),
      inviterName,
      7,
    );
    this.logger.log(`Invitation sent to ${user.email}`);
  }

  /**
   * Resend eligibility: invited only, inside the cooldown window, and the
   * send counter below the maximum.
   */
  canResend(
    user: Pick<User, 'status' | 'inviteSendCount' | 'lastInviteSentAt'>,
  ): { allowed: true } | { allowed: false; reason: string } {
    if (user.status !== UserStatus.INVITED) {
      return {
        allowed: false,
        reason: 'This user is not waiting for an invite',
      };
    }
    if (user.inviteSendCount >= INVITE_MAX_SENDS) {
      return {
        allowed: false,
        reason: 'The invitation was already sent the maximum number of times',
      };
    }
    if (user.lastInviteSentAt) {
      const elapsed = Date.now() - user.lastInviteSentAt.getTime();
      if (elapsed < INVITE_RESEND_COOLDOWN_MS) {
        return {
          allowed: false,
          reason: 'The invitation was sent recently; wait before resending',
        };
      }
    }
    return { allowed: true };
  }
}

export function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
