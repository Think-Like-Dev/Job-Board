import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionPrincipalGuard } from './session-principal.guard';

/**
 * Session primitives shared by feature modules.
 *
 * Kept separate from `AuthModule` because `AuthModule` imports `UsersModule`
 * and `CandidatesModule` for the login flows. If those modules imported
 * `AuthModule` just to use the guard, Nest would create a circular dependency.
 * `SessionModule` depends on neither, so it can be imported everywhere.
 */
@Module({
  providers: [AuthService, SessionAuthGuard, SessionPrincipalGuard],
  exports: [AuthService, SessionAuthGuard, SessionPrincipalGuard],
})
export class SessionModule {}
