/**
 * RabbitMQ topology used by the core API.
 *
 * These names are the contract with the AI service; its copy lives in
 * `back-end/ai-platform/app/core/messaging.py`. Change one and change the
 * other in the same commit.
 */

/** Topic exchange every domain event is published to. */
export const EVENTS_EXCHANGE = 'ats.events';

/** Dead-letter exchange: exchanges and queues that give up land here. */
export const DEAD_LETTER_EXCHANGE = 'ats.dlx';

/** Queue that holds messages nobody could process. */
export const DEAD_LETTER_QUEUE = 'ats.dlq';

/** Queue bound to the AI service's scoring consumer. */
export const AI_SCORING_QUEUE = 'ai.resume.scoring';

/** Queue bound to the core API's consumer of AI results. */
export const CORE_SCORING_RESULTS_QUEUE = 'core.ai.scoring.results';

/** A candidate submitted an application and it should be scored. */
export const ROUTING_APPLICATION_SUBMITTED = 'application.submitted';

/** The application was withdrawn or rejected: stop working on it. */
export const ROUTING_APPLICATION_CANCELLED = 'application.cancelled';

/** The AI service finished scoring an application. */
export const ROUTING_SCORING_COMPLETED = 'scoring.completed';

/** The AI service gave up scoring an application. */
export const ROUTING_SCORING_FAILED = 'scoring.failed';

/**
 * The language the AI writes its narrative in (fit analysis, strengths, risks,
 * interview questions).
 *
 * Today the recruiter platform ships one locale, so this is a constant. When
 * the recruiter's own locale is stored on the user, it replaces this value
 * per event and the AI writes the narrative in that language.
 */
export const DEFAULT_OUTPUT_LANGUAGE = 'en';
