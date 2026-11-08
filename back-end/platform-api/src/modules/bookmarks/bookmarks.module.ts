import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SessionModule } from '@modules/auth/session.module';
import { JobsModule } from '@modules/jobs/jobs.module';
import { CandidateBookmarkSchema } from './candidate-bookmark.schema';
import { BookmarksService } from './bookmarks.service';
import { BookmarksController } from './bookmarks.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([CandidateBookmarkSchema]),
    SessionModule,
    JobsModule,
  ],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
