import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SessionModule } from '@modules/auth/session.module';
import { UserSchema } from './user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [MikroOrmModule.forFeature([UserSchema]), SessionModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
