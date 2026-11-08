import { Module } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module';
import { CandidatesModule } from '@modules/candidates/candidates.module';
import { AuthController } from './auth.controller';
import { SessionModule } from './session.module';

/**
 * Auth routes (OTP, login, me, logout). The guard and `AuthService` live in
 * `SessionModule` so feature modules can use them without importing this
 * module (which would create a cycle through Users/Candidates).
 */
@Module({
  imports: [UsersModule, CandidatesModule, SessionModule],
  controllers: [AuthController],
})
export class AuthModule {}
