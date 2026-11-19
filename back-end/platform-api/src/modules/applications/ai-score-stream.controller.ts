import {
  Controller,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import {
  AI_SCORE_STREAM_HEARTBEAT_MS,
  AiScoreEventsService,
} from '@modules/ai-scoring/ai-score-events.service';
import { AiScoringProjectionService } from '@modules/ai-scoring/ai-scoring-projection.service';
import {
  ApplicationAiScoreDto,
  toApplicationAiScoreDto,
} from '@modules/ai-scoring/dto/ai-score-response.dto';
import { RecruiterApplicationsService } from './recruiter-applications.service';

/**
 * The live AI assessment of one application, as Server-Sent Events.
 *
 * The drawer opens this stream next to the normal detail request. The stored
 * assessment is sent first, so a connection that opened after the result was
 * written still ends up holding it, and every later result arrives as it is
 * stored. A heartbeat keeps an idle connection from being closed by a proxy.
 *
 * Two things keep it honest:
 *
 * 1. It is guarded like the detail endpoint (internal users only) and checks
 *    that the application is one a recruiter may see, so a stream cannot be
 *    opened for a draft or a stranger's application.
 * 2. A result is only sent after it was stored, so a reconnect that races a
 *    result cannot make the drawer show something the API would not return.
 */
@ApiTags('applications')
@SessionAuth({ principalType: 'user' })
@Controller('applications')
export class AiScoreStreamController {
  constructor(
    private readonly recruiterApplications: RecruiterApplicationsService,
    private readonly projection: AiScoringProjectionService,
    private readonly events: AiScoreEventsService,
  ) {}

  @Sse(':id/ai-score/stream')
  @ApiProduces('text/event-stream')
  @ApiOperation({
    summary: 'Stream the AI assessment of an application (internal users only)',
    description:
      'Server-Sent Events. The stored assessment is sent first, then every new result. A heartbeat every 25 seconds keeps the connection alive.',
  })
  async stream(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Observable<MessageEvent>> {
    // The same visibility rule as `GET /applications/:id`: a draft or an
    // unknown id is a 404, never an open stream.
    await this.recruiterApplications.assertVisible(id);

    return new Observable<MessageEvent>((subscriber) => {
      let newestWasSent = false;
      let closed = false;

      // Subscribe before reading the stored row: a result that is stored in
      // between is then delivered, and the snapshot is skipped rather than
      // overwriting it.
      const subscription = this.events.stream(id).subscribe((event) => {
        if (event.kind === 'assessment') {
          newestWasSent = true;
        }
        subscriber.next({ data: JSON.stringify(event) });
      });

      void this.projection
        .findByApplicationId(id)
        .then((stored) => {
          if (closed || newestWasSent) {
            return;
          }
          const assessment = toApplicationAiScoreDto(stored);
          if (assessment) {
            subscriber.next(assessmentEvent(id, assessment));
          }
        })
        .catch(() => {
          // The detail request already carries the current assessment; a
          // stream that cannot replay it still delivers the next result.
        });

      const heartbeat = setInterval(() => {
        subscriber.next({ data: JSON.stringify(this.events.heartbeat(id)) });
      }, AI_SCORE_STREAM_HEARTBEAT_MS);
      heartbeat.unref?.();

      return () => {
        closed = true;
        clearInterval(heartbeat);
        subscription.unsubscribe();
      };
    });
  }
}

function assessmentEvent(
  applicationId: string,
  assessment: ApplicationAiScoreDto,
): MessageEvent {
  return {
    data: JSON.stringify({
      kind: 'assessment',
      applicationId,
      assessment,
    }),
  };
}
