import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type { ApplicationAiScoreDto } from './dto/ai-score-response.dto';

/**
 * One message on the stream of an application's AI score.
 *
 * Every message carries a `kind`, so a client ignores the ones it does not
 * understand: the drawer only draws an `assessment`. The heartbeat exists so
 * an idle connection is not closed by a proxy that drops silent streams.
 */
export interface AiScoreStreamEvent {
  kind: 'assessment' | 'heartbeat';
  applicationId: string;
  /** Present on an `assessment`. */
  assessment?: ApplicationAiScoreDto;
  /** Present on a `heartbeat`. */
  sentAt?: string;
}

/** How often a silent stream is kept alive, in milliseconds. */
export const AI_SCORE_STREAM_HEARTBEAT_MS = 25_000;

/**
 * The open score streams of this API process.
 *
 * The consumer stores a result and tells the hub; the hub hands it to every
 * recruiter looking at that application. Nothing is stored here: the row in
 * `application_ai_scores` stays the source of truth, and a drawer that
 * connects sends the stored row before it starts listening.
 *
 * This is one process's memory. Two API instances would each hold their own
 * listeners, so scaling the API out would need the notification fanned out
 * through the broker instead of this map.
 */
@Injectable()
export class AiScoreEventsService {
  private readonly logger = new Logger(AiScoreEventsService.name);
  private readonly streams = new Map<string, Subject<AiScoreStreamEvent>>();

  /** The updates for one application, until the subscriber goes away. */
  stream(applicationId: string): Observable<AiScoreStreamEvent> {
    return new Observable<AiScoreStreamEvent>((subscriber) => {
      const subject = this.subjectFor(applicationId);
      const subscription = subject.subscribe(subscriber);

      return () => {
        subscription.unsubscribe();
        // Nobody is listening any more: do not keep the subject forever.
        if (!subject.observed) {
          this.streams.delete(applicationId);
        }
      };
    });
  }

  /**
   * Hands a new assessment to the open drawers of an application.
   *
   * Called after the row is stored. A notification that fails must not undo
   * the write, so the problem is logged and swallowed.
   */
  publish(applicationId: string, assessment: ApplicationAiScoreDto): void {
    const subject = this.streams.get(applicationId);
    if (!subject) {
      return;
    }

    try {
      subject.next({ kind: 'assessment', applicationId, assessment });
    } catch (error) {
      this.logger.warn(
        `Could not notify the open streams of application ${applicationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** A message that keeps an idle stream from being closed by a proxy. */
  heartbeat(applicationId: string): AiScoreStreamEvent {
    return {
      kind: 'heartbeat',
      applicationId,
      sentAt: new Date().toISOString(),
    };
  }

  private subjectFor(applicationId: string): Subject<AiScoreStreamEvent> {
    let subject = this.streams.get(applicationId);
    if (!subject) {
      subject = new Subject<AiScoreStreamEvent>();
      this.streams.set(applicationId, subject);
    }
    return subject;
  }
}
