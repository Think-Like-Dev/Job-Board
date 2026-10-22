import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import configuration from '@src/config/configuration';
import { RedisModule } from '@common/redis/redis.module';
import { DatabaseModule } from '@src/database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { CandidatesModule } from '@modules/candidates/candidates.module';
import { FilesModule } from '@modules/files/files.module';
import { JobsModule } from '@modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Load environment-specific overrides: `.env.<NODE_ENV>` wins over `.env`.
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'local'}`, '.env'],
    }),
    RedisModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    CandidatesModule,
    FilesModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
