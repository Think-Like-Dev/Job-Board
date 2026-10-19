import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { FileSchema } from './file.schema';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [MikroOrmModule.forFeature([FileSchema])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
