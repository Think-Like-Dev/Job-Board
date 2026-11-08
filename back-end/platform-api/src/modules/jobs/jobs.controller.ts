import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiJobNotFound } from '@common/decorators/api-responses.decorator';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
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
@SessionAuth({ principalType: 'user' })
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List jobs with pagination, search and filters' })
  @ApiOkResponse({ type: JobListResponseDto })
  @ApiForbiddenResponse({
    description: 'Candidate sessions cannot list jobs',
  })
  async findAll(@Query() query: ListJobsQueryDto): Promise<JobListResponseDto> {
    const result = await this.jobsService.listJobs(query);
    const stats = await this.jobsService.getApplicationStats(
      result.data.map((job) => job.id),
    );

    return {
      success: true,
      message: 'Jobs fetched successfully',
      data: result.data.map((job) => toJobSummaryDto(job, stats.get(job.id))),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.meta.totalItems,
        totalPages: result.meta.totalPages,
      },
    };
  }

  @Get(':id/archive-preview')
  @ApiOperation({
    summary: 'Check whether archiving needs the irreversible warning',
  })
  @ApiOkResponse({ type: JobArchivePreviewResponseDto })
  @ApiJobNotFound()
  async getArchivePreview(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<JobArchivePreviewResponseDto> {
    const preview = await this.jobsService.getArchivePreview(id);

    return {
      success: true,
      message: 'Archive preview fetched successfully',
      data: preview,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job with all editable fields' })
  @ApiOkResponse({ type: JobDetailResponseDto })
  @ApiJobNotFound()
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<JobDetailResponseDto> {
    const job = await this.jobsService.findJobById(id);
    const stats = await this.jobsService.getApplicationStats([job.id]);

    return {
      success: true,
      message: 'Job fetched successfully',
      data: toJobDetailDto(job, stats.get(job.id)),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a job as a draft or published posting' })
  @ApiCreatedResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid payload, compensation shape, or missing publish fields',
  })
  @ApiForbiddenResponse({
    description: 'Candidate sessions cannot create jobs',
  })
  async create(
    @Body() dto: CreateJobDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.createJob(dto, req.session.principalId);

    return {
      success: true,
      message: 'Job created successfully',
      data: toJobSummaryDto(job),
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a draft job (creator only)' })
  @ApiOkResponse({ type: JobDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiJobNotFound()
  @ApiConflictResponse({ description: 'Only draft jobs can be edited' })
  @ApiForbiddenResponse({
    description: 'Only the recruiter who created the job can edit it',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateJobDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<JobDetailResponseDto> {
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
  @ApiOperation({ summary: 'Publish or archive a job (creator only)' })
  @ApiOkResponse({ type: JobStatusResponseDto })
  @ApiBadRequestResponse({
    description: 'Missing publish fields or archive acknowledgement',
  })
  @ApiJobNotFound()
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
  @ApiOperation({ summary: 'Soft-delete a draft job (creator only)' })
  @ApiOkResponse({ type: DeleteJobResponseDto })
  @ApiJobNotFound()
  @ApiConflictResponse({ description: 'Only draft jobs can be deleted' })
  @ApiForbiddenResponse({
    description: 'Only the recruiter who created the job can delete it',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DeleteJobResponseDto> {
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
}
