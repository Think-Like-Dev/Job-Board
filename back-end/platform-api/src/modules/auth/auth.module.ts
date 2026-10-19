import { Module } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module';
import { CandidatesModule } from '@modules/candidates/candidates.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  imports: [UsersModule, CandidatesModule],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard],
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
