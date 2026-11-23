import { Module } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module';
import { CandidatesModule } from '@modules/candidates/candidates.module';
import { RbacModule } from '@modules/rbac/rbac.module';
import { MailModule } from '@modules/mail/mail.module';
import { AuthController } from './auth.controller';
import { SessionsController } from './sessions.controller';
import { AdminSessionsController } from './admin-sessions.controller';
import { SessionModule } from './session.module';

/**
 * Auth routes (OTP, login, me, logout, sessions). The guard and `AuthService`
 * live in `SessionModule` so feature modules can use them without importing
 * this module (which would create a cycle through Users/Candidates).
 */
@Module({
  imports: [
    UsersModule,
    CandidatesModule,
    SessionModule,
    RbacModule,
    MailModule,
  ],
  controllers: [AuthController, SessionsController, AdminSessionsController],
})
export class AuthModule {}
