import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import { ApplicationAiReviewService } from './application-ai-review.service';
import {
  RetryAiReviewDto,
  RetryAiReviewResponseDto,
} from './dto/ai-review.dto';

@ApiTags('applications')
@SessionAuth({ principalType: 'user' })
@Controller('jobs')
export class ApplicationAiReviewController {
  constructor(private readonly aiReview: ApplicationAiReviewService) {}

  @Post(':jobId/applications/ai-review')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Queue a fresh AI review for the selected applications',
    description:
      'Re-runs the same work as a submission: the resume is downloaded and extracted again, then scored. Works for any non-draft, non-withdrawn application, whether it was already scored or not.',
  })
  @ApiOkResponse({ type: RetryAiReviewResponseDto })
  @ApiBadRequestResponse({
    description: 'No application ids, or an id that is not a UUID',
  })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async retry(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Body() body: RetryAiReviewDto,
  ): Promise<RetryAiReviewResponseDto> {
    const outcome = await this.aiReview.queue(jobId, body.applicationIds);

    return {
      success: true,
      message:
        outcome.queued === 0
          ? 'No application could be queued for an AI review'
          : `AI review queued for ${outcome.queued} application${
              outcome.queued === 1 ? '' : 's'
            }`,
      data: outcome,
    };
  }
}
