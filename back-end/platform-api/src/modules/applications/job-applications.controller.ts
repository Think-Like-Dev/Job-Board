import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiJobNotFound } from '@common/decorators/api-responses.decorator';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import { MAX_APPLICATION_UPLOAD_BYTES } from '@modules/files/file-validation';
import { ApplicationsService } from './applications.service';
import { RecruiterApplicationsService } from './recruiter-applications.service';
import { ApplyJobDto } from './dto/apply-job.dto';
import { JobApplicationsQueryDto } from './dto/application-query.dto';
import {
  CandidateApplicationDetailResponseDto,
  RecruiterApplicationListResponseDto,
} from './dto/application-response.dto';

@ApiTags('applications')
@SessionAuth()
@Controller('jobs')
export class JobApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly recruiterApplicationsService: RecruiterApplicationsService,
  ) {}

  @Post(':jobId/apply')
  @SessionAuth({ principalType: 'candidate' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'resumeFile', maxCount: 1 },
        { name: 'coverLetterFile', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_APPLICATION_UPLOAD_BYTES } },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resumeFile: { type: 'string', format: 'binary' },
        coverLetterFile: { type: 'string', format: 'binary' },
        isDraft: { type: 'boolean', default: false },
        updateProfileResume: { type: 'boolean', default: false },
        updateProfileCoverLetter: { type: 'boolean', default: false },
        existingResumeFileId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Apply to a published job, or save/update a draft application (candidate only)',
  })
  @ApiCreatedResponse({ type: CandidateApplicationDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      'Missing resume, invalid file type/size, or a missing required cover letter',
  })
  @ApiConflictResponse({
    description:
      'Job is not accepting applications, or the candidate already applied',
  })
  @ApiForbiddenResponse({ description: 'Candidate session required' })
  async apply(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Body() dto: ApplyJobDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @Req() req: AuthenticatedRequest,
  ): Promise<CandidateApplicationDetailResponseDto> {
    const application = await this.applicationsService.apply(
      jobId,
      dto,
      {
        resumeFile: files?.resumeFile?.[0],
        coverLetterFile: files?.coverLetterFile?.[0],
      },
      req.session,
    );

    return {
      success: true,
      message:
        dto.isDraft === true
          ? 'Application saved as draft'
          : 'Application submitted successfully',
      data: application,
    };
  }

  @Get(':jobId/applications')
  @SessionAuth({ principalType: 'user' })
  @ApiOperation({
    summary: 'List non-draft applications for a job (internal users only)',
  })
  @ApiOkResponse({ type: RecruiterApplicationListResponseDto })
  @ApiJobNotFound()
  @ApiForbiddenResponse({ description: 'Internal user session required' })
  async findByJob(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Query() query: JobApplicationsQueryDto,
  ): Promise<RecruiterApplicationListResponseDto> {
    const result = await this.recruiterApplicationsService.listJobApplications(
      jobId,
      query,
    );

    return {
      success: true,
      message: 'Applications fetched successfully',
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.meta.totalItems,
        totalPages: result.meta.totalPages,
      },
    };
  }
}
