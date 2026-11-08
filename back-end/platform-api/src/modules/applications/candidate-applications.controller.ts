import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiApplicationNotFound } from '@common/decorators/api-responses.decorator';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import { ApplicationsService } from './applications.service';
import { CandidateApplicationsQueryDto } from './dto/application-query.dto';
import {
  CandidateApplicationDetailResponseDto,
  CandidateApplicationListResponseDto,
  DeleteApplicationResponseDto,
} from './dto/application-response.dto';
import { WithdrawApplicationDto } from './dto/withdraw-application.dto';

@ApiTags('applications')
@SessionAuth({ principalType: 'candidate' })
@Controller('applications')
export class CandidateApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('my')
  @ApiOperation({
    summary: "List the candidate's applications, including drafts",
  })
  @ApiOkResponse({ type: CandidateApplicationListResponseDto })
  async findMine(
    @Query() query: CandidateApplicationsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CandidateApplicationListResponseDto> {
    const result = await this.applicationsService.listCandidateApplications(
      query,
      req.session.principalId,
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

  @Get('my/:id')
  @ApiOperation({
    summary: 'Get one of the candidate’s applications with status history',
  })
  @ApiOkResponse({ type: CandidateApplicationDetailResponseDto })
  @ApiApplicationNotFound()
  async findMineById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CandidateApplicationDetailResponseDto> {
    const application = await this.applicationsService.getCandidateApplication(
      id,
      req.session.principalId,
    );

    return {
      success: true,
      message: 'Application fetched successfully',
      data: application,
    };
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw an application that is still APPLIED' })
  @ApiOkResponse({ type: CandidateApplicationDetailResponseDto })
  @ApiConflictResponse({
    description: 'Only APPLIED applications can be withdrawn',
  })
  @ApiApplicationNotFound()
  async withdraw(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: WithdrawApplicationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CandidateApplicationDetailResponseDto> {
    const application = await this.applicationsService.withdraw(
      id,
      dto,
      req.session.principalId,
    );

    return {
      success: true,
      message: 'Application withdrawn successfully',
      data: application,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hard-delete a draft application (drafts only)' })
  @ApiOkResponse({ type: DeleteApplicationResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid application id' })
  @ApiConflictResponse({ description: 'Only drafts can be deleted' })
  @ApiApplicationNotFound()
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DeleteApplicationResponseDto> {
    await this.applicationsService.deleteDraft(id, req.session.principalId);

    return {
      success: true,
      message: 'Draft application deleted successfully',
      data: { id },
    };
  }
}
