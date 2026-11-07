import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { ListJobsQueryDto } from './list-jobs-query.dto';
import { toPublicJobDetailDto, toPublicJobSummaryDto } from './job.presenter';
import {
  PublicJobDetailResponseDto,
  PublicJobListResponseDto,
} from './public-job-response.dto';

/**
 * Unauthenticated job reads for the candidate portal. It reuses the internal
 * service functions with `publicOnly` enabled, which restricts results to
 * published jobs whose last application date has not passed.
 */
@ApiTags('public-jobs')
@Controller('public/jobs')
export class PublicJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List published jobs open for applications' })
  @ApiOkResponse({ type: PublicJobListResponseDto })
  async findAll(
    @Query() query: ListJobsQueryDto,
  ): Promise<PublicJobListResponseDto> {
    const result = await this.jobsService.listJobs(query, {
      publicOnly: true,
    });

    return {
      success: true,
      message: 'Jobs fetched successfully',
      data: result.data.map(toPublicJobSummaryDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.meta.totalItems,
        totalPages: result.meta.totalPages,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a published job by id' })
  @ApiOkResponse({ type: PublicJobDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Job not found or no longer open' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PublicJobDetailResponseDto> {
    const job = await this.jobsService.findJobById(id, {
      publicOnly: true,
    });

    return {
      success: true,
      message: 'Job fetched successfully',
      data: toPublicJobDetailDto(job),
    };
  }
}
