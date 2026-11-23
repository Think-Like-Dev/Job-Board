import * as amqp from 'amqplib';
import {
  CORE_SCORING_RESULTS_QUEUE,
  CORE_SCORING_RESULTS_RETRY_COMPLETED_QUEUE,
  CORE_SCORING_RESULTS_RETRY_FAILED_QUEUE,
  DEAD_LETTER_EXCHANGE,
  DEAD_LETTER_QUEUE,
  EVENTS_EXCHANGE,
  ROUTING_SCORING_COMPLETED,
  ROUTING_SCORING_FAILED,
  ROUTING_SCORING_RESULTS_RETRY_COMPLETED,
  ROUTING_SCORING_RESULTS_RETRY_FAILED,
  SCORING_RESULTS_RETRY_DELAY_MS,
} from './messaging.constants';

/**
 * The broker topology both ends of the messaging path share.
 *
 * The publisher and the consumer declare the same names with the same
 * arguments, because RabbitMQ refuses a queue that is declared twice with
 * different arguments. Declaring the topology twice is harmless; declaring it
 * differently is not.
 */
export async function declareMessagingTopology(
  channel: amqp.Channel,
): Promise<void> {
  await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', {
    durable: true,
  });

  // Messages nobody could process end up here.
  await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
  await channel.bindQueue(
    DEAD_LETTER_QUEUE,
    DEAD_LETTER_EXCHANGE,
    DEAD_LETTER_QUEUE,
  );

  // The queue the AI service's results arrive in.
  //
  // The queue deliberately has no dead-letter arguments: it was declared
  // without them before, and RabbitMQ refuses a queue that is declared again
  // with different arguments. The consumer sends a message it cannot handle
  // to the dead-letter exchange itself, which is the same result and does
  // not need the queue to be recreated.
  await channel.assertQueue(CORE_SCORING_RESULTS_QUEUE, { durable: true });
  await channel.bindQueue(
    CORE_SCORING_RESULTS_QUEUE,
    EVENTS_EXCHANGE,
    ROUTING_SCORING_COMPLETED,
  );
  await channel.bindQueue(
    CORE_SCORING_RESULTS_QUEUE,
    EVENTS_EXCHANGE,
    ROUTING_SCORING_FAILED,
  );

  // The retry queues. A result the core API could not store waits here for
  // its TTL and is then dead-lettered back onto the results queue with the
  // routing key it came in with.
  await channel.assertQueue(CORE_SCORING_RESULTS_RETRY_COMPLETED_QUEUE, {
    durable: true,
    arguments: {
      'x-message-ttl': SCORING_RESULTS_RETRY_DELAY_MS,
      'x-dead-letter-exchange': EVENTS_EXCHANGE,
      'x-dead-letter-routing-key': ROUTING_SCORING_COMPLETED,
    },
  });
  await channel.bindQueue(
    CORE_SCORING_RESULTS_RETRY_COMPLETED_QUEUE,
    EVENTS_EXCHANGE,
    ROUTING_SCORING_RESULTS_RETRY_COMPLETED,
  );

  await channel.assertQueue(CORE_SCORING_RESULTS_RETRY_FAILED_QUEUE, {
    durable: true,
    arguments: {
      'x-message-ttl': SCORING_RESULTS_RETRY_DELAY_MS,
      'x-dead-letter-exchange': EVENTS_EXCHANGE,
      'x-dead-letter-routing-key': ROUTING_SCORING_FAILED,
    },
  });
  await channel.bindQueue(
    CORE_SCORING_RESULTS_RETRY_FAILED_QUEUE,
    EVENTS_EXCHANGE,
    ROUTING_SCORING_RESULTS_RETRY_FAILED,
  );
}
