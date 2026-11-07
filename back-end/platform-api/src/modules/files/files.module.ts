import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '@modules/auth/auth.module';
import { CandidatesModule } from '@modules/candidates/candidates.module';
import { FileSchema } from './file.schema';
import { FileAccessGrantSchema } from './file-access-grant.schema';
import { FilesService } from './files.service';
import { FileAccessGrantsService } from './file-access-grants.service';
import { FilesController } from './files.controller';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([FileSchema, FileAccessGrantSchema]),
    AuthModule,
    CandidatesModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, FileAccessGrantsService, S3StorageService],
  exports: [FilesService, FileAccessGrantsService, S3StorageService],
})
export class FilesModule {}
