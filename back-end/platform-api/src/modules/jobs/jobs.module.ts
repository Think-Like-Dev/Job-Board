import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '@modules/auth/auth.module';
import { JobSchema } from './job.schema';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [MikroOrmModule.forFeature([JobSchema]), AuthModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
