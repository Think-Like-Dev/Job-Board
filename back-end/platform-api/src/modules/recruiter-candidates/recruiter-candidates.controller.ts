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
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import { CandidateJobApplicationsQueryDto } from '@modules/applications/dto/application-query.dto';
import { CandidateJobApplicationListResponseDto } from '@modules/applications/dto/application-response.dto';
import { RecruiterApplicationsService } from '@modules/applications/recruiter-applications.service';
import { MAX_APPLICATION_UPLOAD_BYTES } from '@modules/files/file-validation';
import { CandidateCreateService } from './candidate-create.service';
import { CandidateDetailService } from './candidate-detail.service';
import { CandidateListService } from './candidate-list.service';
import {
  CandidateDetailResponseDto,
  CandidateListResponseDto,
} from './dto/candidate-response.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { ListCandidatesQueryDto } from './dto/list-candidates-query.dto';

@ApiTags('candidates')
@SessionAuth({ principalType: 'user' })
@Controller('candidates')
export class RecruiterCandidatesController {
  constructor(
    private readonly listService: CandidateListService,
    private readonly detailService: CandidateDetailService,
    private readonly createService: CandidateCreateService,
    private readonly applications: RecruiterApplicationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List candidates (internal users only)' })
  @ApiOkResponse({ type: CandidateListResponseDto })
  async findAll(
    @Query() query: ListCandidatesQueryDto,
  ): Promise<CandidateListResponseDto> {
    const result = await this.listService.list(query);

    return {
      success: true,
      message: 'Candidates fetched successfully',
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.meta.totalItems,
        totalPages: result.meta.totalPages,
      },
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Create a candidate profile with a resume (internal users only)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['firstName', 'lastName', 'email', 'resumeFile'],
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        currentLocation: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        country: { type: 'string' },
        postalCode: { type: 'string' },
        linkedinUrl: { type: 'string' },
        portfolioUrl: { type: 'string' },
        skills: {
          type: 'string',
          description: 'JSON array of skill names',
        },
        education: {
          type: 'string',
          description: 'JSON array of education entries',
        },
        experience: {
          type: 'string',
          description: 'JSON array of experience entries',
        },
        certifications: {
          type: 'string',
          description: 'JSON array of certification entries',
        },
        resumeFile: { type: 'string', format: 'binary' },
        profileImageFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: CandidateDetailResponseDto })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'resumeFile', maxCount: 1 },
        { name: 'profileImageFile', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_APPLICATION_UPLOAD_BYTES } },
    ),
  )
  async create(
    @Body() dto: CreateCandidateDto,
    @UploadedFiles()
    files:
      | {
          resumeFile?: Express.Multer.File[];
          profileImageFile?: Express.Multer.File[];
        }
      | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<CandidateDetailResponseDto> {
    const data = await this.createService.create(
      dto,
      {
        resumeFile: files?.resumeFile?.[0],
        profileImageFile: files?.profileImageFile?.[0],
      },
      req.session,
    );

    return {
      success: true,
      message: 'Candidate created successfully',
      data,
    };
  }

  @Get(':id/applications')
  @ApiOperation({
    summary: "List one candidate's applications (internal users only)",
  })
  @ApiOkResponse({ type: CandidateJobApplicationListResponseDto })
  @ApiNotFoundResponse({ description: 'Candidate not found' })
  async findApplications(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: CandidateJobApplicationsQueryDto,
  ): Promise<CandidateJobApplicationListResponseDto> {
    const result = await this.applications.listCandidateApplications(id, query);

    return {
      success: true,
      message: 'Candidate applications fetched successfully',
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.meta.totalItems,
        totalPages: result.meta.totalPages,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one candidate profile (internal users only)' })
  @ApiOkResponse({ type: CandidateDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Candidate not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CandidateDetailResponseDto> {
    const data = await this.detailService.get(id);

    return {
      success: true,
      message: 'Candidate fetched successfully',
      data,
    };
  }
}
