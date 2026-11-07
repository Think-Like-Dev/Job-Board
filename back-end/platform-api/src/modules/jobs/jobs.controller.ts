import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '@modules/auth/session-auth.guard';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import { CreateJobDto, UpdateJobDto, UpdateJobStatusDto } from './job.dto';
import {
  DeleteJobResponseDto,
  JobArchivePreviewResponseDto,
  JobDetailResponseDto,
  JobListResponseDto,
  JobResponseDto,
  JobStatusResponseDto,
} from './job-response.dto';
import { ListJobsQueryDto } from './list-jobs-query.dto';
import { toJobDetailDto, toJobSummaryDto } from './job.presenter';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@ApiCookieAuth('session_token')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
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

  @Get(':id/archive-preview')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({
    summary: 'Check whether archiving needs the irreversible warning',
  })
  @ApiOkResponse({ type: JobArchivePreviewResponseDto })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async getArchivePreview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<JobArchivePreviewResponseDto> {
    this.assertInternalUser(req);

    const preview = await this.jobsService.getArchivePreview(id);

    return {
      success: true,
      message: 'Archive preview fetched successfully',
      data: preview,
    };
  }

  @Get(':id')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Get a job with all editable fields' })
  @ApiOkResponse({ type: JobDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<JobDetailResponseDto> {
    this.assertInternalUser(req);

    const job = await this.jobsService.findJobById(id);

    return {
      success: true,
      message: 'Job fetched successfully',
      data: toJobDetailDto(job),
    };
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Create a job as a draft or published posting' })
  @ApiCreatedResponse({ type: JobResponseDto })
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
  ): Promise<JobResponseDto> {
    this.assertInternalUser(req);

    const job = await this.jobsService.createJob(dto, req.session.principalId);

    return {
      success: true,
      message: 'Job created successfully',
      data: toJobSummaryDto(job),
    };
  }

  @Put(':id')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Replace a draft job (creator only)' })
  @ApiOkResponse({ type: JobDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiConflictResponse({ description: 'Only draft jobs can be edited' })
  @ApiForbiddenResponse({
    description: 'Only the recruiter who created the job can edit it',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateJobDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<JobDetailResponseDto> {
    this.assertInternalUser(req);

    const job = await this.jobsService.updateJob(
      id,
      dto,
      req.session.principalId,
    );

    return {
      success: true,
      message: 'Job updated successfully',
      data: toJobDetailDto(job),
    };
  }

  @Patch(':id/status')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Publish or archive a job (creator only)' })
  @ApiOkResponse({ type: JobStatusResponseDto })
  @ApiBadRequestResponse({
    description: 'Missing publish fields or archive acknowledgement',
  })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiConflictResponse({
    description:
      'Invalid status transition (no unpublish, archive is terminal)',
  })
  @ApiForbiddenResponse({
    description: 'Only the recruiter who created the job can change its status',
  })
  async changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateJobStatusDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<JobStatusResponseDto> {
    this.assertInternalUser(req);

    const job = await this.jobsService.changeStatus(
      id,
      dto,
      req.session.principalId,
    );

    return {
      success: true,
      message: 'Job status updated successfully',
      data: {
        id: job.id,
        status: job.status,
        updatedAt: job.updatedAt?.toISOString() ?? new Date().toISOString(),
        publishedAt: job.publishedAt?.toISOString(),
        archivedAt: job.archivedAt?.toISOString(),
      },
    };
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Soft-delete a draft job (creator only)' })
  @ApiOkResponse({ type: DeleteJobResponseDto })
  @ApiNotFoundResponse({ description: 'Job not found' })
  @ApiConflictResponse({ description: 'Only draft jobs can be deleted' })
  @ApiForbiddenResponse({
    description: 'Only the recruiter who created the job can delete it',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DeleteJobResponseDto> {
    this.assertInternalUser(req);

    const job = await this.jobsService.softDeleteJob(
      id,
      req.session.principalId,
    );

    return {
      success: true,
      message: 'Job deleted successfully',
      data: {
        id: job.id,
        deletedAt: job.deletedAt?.toISOString() ?? new Date().toISOString(),
      },
    };
  }

  private assertInternalUser(req: AuthenticatedRequest): void {
    if (req.session.principalType !== 'user') {
      throw new ForbiddenException('Only internal users can access jobs');
    }
  }
}
