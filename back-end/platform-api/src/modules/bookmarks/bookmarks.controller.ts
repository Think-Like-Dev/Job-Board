import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiJobNotFound } from '@common/decorators/api-responses.decorator';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import { toPublicJobSummaryDto } from '@modules/jobs/job.presenter';
import {
  BookmarkListResponseDto,
  BookmarkResponseDto,
} from './bookmark-response.dto';
import { BookmarksService } from './bookmarks.service';

@ApiTags('bookmarks')
@SessionAuth({ principalType: 'candidate' })
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: "List the candidate's saved jobs" })
  @ApiOkResponse({ type: BookmarkListResponseDto })
  @ApiForbiddenResponse({ description: 'Candidate session required' })
  async findAll(
    @Req() req: AuthenticatedRequest,
  ): Promise<BookmarkListResponseDto> {
    const jobs = await this.bookmarksService.list(req.session.principalId);

    return {
      success: true,
      message: 'Bookmarks fetched successfully',
      data: jobs.map(toPublicJobSummaryDto),
    };
  }

  @Post(':jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a job for later (idempotent)' })
  @ApiOkResponse({ type: BookmarkResponseDto })
  @ApiJobNotFound()
  @ApiForbiddenResponse({ description: 'Candidate session required' })
  async add(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<BookmarkResponseDto> {
    await this.bookmarksService.add(req.session.principalId, jobId);

    return {
      success: true,
      message: 'Job saved',
      data: { jobId, isBookmarked: true },
    };
  }

  @Delete(':jobId')
  @ApiOperation({ summary: 'Remove a saved job (idempotent)' })
  @ApiOkResponse({ type: BookmarkResponseDto })
  @ApiForbiddenResponse({ description: 'Candidate session required' })
  async remove(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<BookmarkResponseDto> {
    await this.bookmarksService.remove(req.session.principalId, jobId);

    return {
      success: true,
      message: 'Job removed from saved jobs',
      data: { jobId, isBookmarked: false },
    };
  }
}
