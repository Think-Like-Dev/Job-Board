import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '@modules/auth/session-auth.guard';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import { CreateJobDto } from './job.dto';
import { CreateJobResponseDto, JobListResponseDto } from './job-response.dto';
import { ListJobsQueryDto } from './list-jobs-query.dto';
import { toJobSummaryDto } from './job.presenter';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth('session_token')
  @ApiOperation({ summary: 'List jobs with pagination, search and filters' })
  @ApiOkResponse({ type: JobListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @ApiForbiddenResponse({
    description: 'Candidate sessions cannot list jobs',
  })
  async findAll(
    @Query() query: ListJobsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<JobListResponseDto> {
    this.assertInternalUser(req);

    const result = await this.jobsService.listJobs(query);

    return {
      success: true,
      message: 'Jobs fetched successfully',
      data: result.data.map(toJobSummaryDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.meta.totalItems,
        totalPages: result.meta.totalPages,
      },
    };
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth('session_token')
  @ApiOperation({ summary: 'Create a job as a draft or published posting' })
  @ApiCreatedResponse({ type: CreateJobResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid payload, compensation shape, or missing publish fields',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @ApiForbiddenResponse({
    description: 'Candidate sessions cannot create jobs',
  })
  async create(
    @Body() dto: CreateJobDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateJobResponseDto> {
    this.assertInternalUser(req);

    const job = await this.jobsService.createJob(dto, req.session.principalId);

    return {
      success: true,
      message: 'Job created successfully',
      data: toJobSummaryDto(job),
    };
  }

  private assertInternalUser(req: AuthenticatedRequest): void {
    if (req.session.principalType !== 'user') {
      throw new ForbiddenException('Only internal users can access jobs');
    }
  }
}
