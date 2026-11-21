import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SessionModule } from '@modules/auth/session.module';
import { MailModule } from '@modules/mail/mail.module';
import { RbacModule } from '@modules/rbac/rbac.module';
import { UserSchema } from './user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { InvitationService } from './invitation.service';
import { UserPolicyService } from './user-policy.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([UserSchema]),
    SessionModule,
    RbacModule,
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, InvitationService, UserPolicyService],
  exports: [UsersService],
})
export class UsersModule {}
