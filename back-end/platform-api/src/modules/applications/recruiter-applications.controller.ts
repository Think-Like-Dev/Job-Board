import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import { RecruiterApplicationsService } from './recruiter-applications.service';
import { RecruiterApplicationDetailResponseDto } from './dto/application-response.dto';

@ApiTags('applications')
@SessionAuth({ principalType: 'user' })
@Controller('applications')
export class RecruiterApplicationsController {
  constructor(
    private readonly recruiterApplicationsService: RecruiterApplicationsService,
  ) {}

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a submitted application with candidate profile and status history (internal users only)',
  })
  @ApiOkResponse({ type: RecruiterApplicationDetailResponseDto })
  @ApiNotFoundResponse({
    description: 'Application not found, or it is still a draft',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RecruiterApplicationDetailResponseDto> {
    const application =
      await this.recruiterApplicationsService.getApplication(id);

    return {
      success: true,
      message: 'Application fetched successfully',
      data: application,
    };
  }
}
