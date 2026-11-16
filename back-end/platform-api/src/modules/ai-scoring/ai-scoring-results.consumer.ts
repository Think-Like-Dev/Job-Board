import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as amqp from 'amqplib';
import type { AppConfig } from '@src/config/configuration';
import {
  CORE_SCORING_RESULTS_QUEUE,
  DEAD_LETTER_EXCHANGE,
  DEAD_LETTER_QUEUE,
  EVENTS_EXCHANGE,
  ROUTING_SCORING_COMPLETED,
  ROUTING_SCORING_FAILED,
  ROUTING_SCORING_RESULTS_RETRY_COMPLETED,
  ROUTING_SCORING_RESULTS_RETRY_FAILED,
  SCORING_RESULTS_MAX_ATTEMPTS,
} from '@modules/messaging/messaging.constants';
import { declareMessagingTopology } from '@modules/messaging/messaging.topology';
import { AiScoringProjectionService } from './ai-scoring-projection.service';
import {
  ScoringCompletedMessageDto,
  ScoringFailedMessageDto,
} from './dto/scoring-result.dto';

/** Longest the consumer waits before trying to reach the broker again. */
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Reads the AI service's results and stores them in the projection.
 *
 * The consumer lives in the API process, next to the publisher: there is no
 * second worker to run. It takes one message at a time, so the results are
 * handled in the order they arrive.
 *
 * A message that does not match the contract is dead-lettered: it will never
 * become valid, and leaving it unacknowledged would redeliver it in a hot
 * loop forever. A message the database refuses is sent to the retry queue and
 * comes back after a pause; after a few attempts it is dead-lettered too.
 */
@Injectable()
export class AiScoringResultsConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AiScoringResultsConsumer.name);

  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;
  private consumerTag?: string;
  private closing = false;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempt = 1;

  constructor(
    private readonly projection: AiScoringProjectionService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    this.closing = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    const channel = this.channel;
    const connection = this.connection;
    this.channel = undefined;
    this.connection = undefined;
    this.consumerTag = undefined;

    try {
      if (this.consumerTag && channel) {
        await channel.cancel(this.consumerTag);
      }
    } catch {
      // The channel is already gone; nothing to clean up.
    }
    try {
      await channel?.close();
    } catch {
      // Same.
    }
    try {
      await connection?.close();
    } catch {
      // Same.
    }
  }

  /** Opens the connection and starts consuming. */
  private async connect(): Promise<void> {
    if (this.closing) {
      return;
    }

    const rabbit = this.config.get('rabbitmq', { infer: true });
    const url = this.buildUrl(rabbit);

    try {
      this.connection = await amqp.connect(url);
      this.connection.on('error', (error: Error) => {
        this.logger.error(`RabbitMQ connection error: ${error.message}`);
      });
      this.connection.on('close', () => {
        this.channel = undefined;
        this.consumerTag = undefined;
        this.scheduleReconnect();
      });

      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(1);
      await declareMessagingTopology(this.channel);

      // The channel the messages are acknowledged on. It is captured here so
      // the handler always uses the channel the message came from.
      const channel = this.channel;

      const { consumerTag } = await channel.consume(
        CORE_SCORING_RESULTS_QUEUE,
        (message) => {
          if (message) {
            void this.handle(message, channel);
          }
        },
        { noAck: false },
      );
      this.consumerTag = consumerTag;
      this.reconnectAttempt = 1;

      this.logger.log(
        `Consuming AI scoring results from ${CORE_SCORING_RESULTS_QUEUE} (RabbitMQ at ${rabbit.host}:${rabbit.port})`,
      );
    } catch (error) {
      this.logger.error(
        `Could not connect to RabbitMQ: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.scheduleReconnect();
    }
  }

  /**
   * A message that can never be handled goes to the dead-letter queue.
   *
   * The queue itself has no dead-letter arguments - it was declared without
   * them before, and RabbitMQ refuses a queue that is declared again with
   * different arguments - so the message is sent to the dead-letter exchange
   * here, and then acknowledged.
   */
  private deadLetter(
    message: amqp.ConsumeMessage,
    channel: amqp.Channel,
    reason: string,
  ): void {
    try {
      channel.publish(
        DEAD_LETTER_EXCHANGE,
        DEAD_LETTER_QUEUE,
        message.content,
        {
          persistent: true,
          contentType: 'application/json',
          headers: { 'x-dead-letter-reason': reason },
        },
      );
      channel.ack(message);
    } catch (error) {
      // The broker is gone: without a requeue the message is dropped, which
      // is better than redelivering it in a hot loop.
      this.logger.error(
        `Could not send a scoring result to the dead-letter queue: ${error instanceof Error ? error.message : String(error)}`,
      );
      channel.nack(message, false, false);
    }
  }

  /** Handles one result. */
  private async handle(
    message: amqp.ConsumeMessage,
    channel: amqp.Channel,
  ): Promise<void> {
    const routingKey = message.fields.routingKey;

    try {
      const payload = this.parseBody(message);
      if (payload === null) {
        this.logger.warn(
          `Rejecting a scoring result with an unreadable payload (routing key ${routingKey})`,
        );
        this.deadLetter(message, channel, 'unreadable payload');
        return;
      }

      if (routingKey === ROUTING_SCORING_COMPLETED) {
        const instance = plainToInstance(ScoringCompletedMessageDto, payload);
        if (!(await this.isValid(instance))) {
          this.reject(message, channel, routingKey);
          return;
        }
        await this.projection.applyCompleted(instance);
      } else if (routingKey === ROUTING_SCORING_FAILED) {
        const instance = plainToInstance(ScoringFailedMessageDto, payload);
        if (!(await this.isValid(instance))) {
          this.reject(message, channel, routingKey);
          return;
        }
        await this.projection.applyFailed(instance);
      } else {
        // A routing key nobody asked for. Nothing to do with it.
        channel.ack(message);
        return;
      }

      channel.ack(message);
    } catch (error) {
      this.defer(message, channel, error);
    }
  }

  /** A payload that does not match the contract can never be handled. */
  private reject(
    message: amqp.ConsumeMessage,
    channel: amqp.Channel,
    routingKey: string,
  ): void {
    this.logger.warn(
      `Rejecting a scoring result that does not match the contract (routing key ${routingKey})`,
    );
    this.deadLetter(message, channel, 'does not match the contract');
  }

  /** Reads the message body. Returns null when it is not JSON. */
  private parseBody(message: amqp.ConsumeMessage): unknown {
    try {
      const payload: unknown = JSON.parse(message.content.toString('utf-8'));
      return payload && typeof payload === 'object' ? payload : null;
    } catch {
      return null;
    }
  }

  private async isValid(instance: object): Promise<boolean> {
    const errors = await validate(instance, {
      whitelist: true,
      forbidUnknownValues: true,
    });
    return errors.length === 0;
  }

  /**
   * Sends a message that could not be handled to the retry queue.
   *
   * After the attempt cap it is dead-lettered instead, so a permanently
   * broken message does not circulate forever.
   */
  private defer(
    message: amqp.ConsumeMessage,
    channel: amqp.Channel,
    error: unknown,
  ): void {
    const detail = error instanceof Error ? error.message : String(error);
    const attempt = this.attemptOf(message);

    if (attempt >= SCORING_RESULTS_MAX_ATTEMPTS || !this.channel) {
      this.logger.error(
        `Scoring result failed permanently after ${attempt} attempt(s): ${detail}`,
      );
      this.deadLetter(message, channel, detail.slice(0, 200));
      return;
    }

    const routingKey =
      message.fields.routingKey === ROUTING_SCORING_FAILED
        ? ROUTING_SCORING_RESULTS_RETRY_FAILED
        : ROUTING_SCORING_RESULTS_RETRY_COMPLETED;

    try {
      this.channel.publish(EVENTS_EXCHANGE, routingKey, message.content, {
        persistent: true,
        contentType: 'application/json',
        headers: { 'x-attempt': attempt + 1 },
      });
      channel.ack(message);
      this.logger.warn(
        `Scoring result could not be stored (attempt ${attempt}): ${detail}`,
      );
    } catch {
      // The broker is gone. Leave the message unacknowledged: the broker
      // hands it back when the connection is back.
      this.logger.error(
        `Could not send a scoring result to the retry queue: ${detail}`,
      );
    }
  }

  private attemptOf(message: amqp.ConsumeMessage): number {
    const header: unknown = message.properties.headers?.['x-attempt'];
    const attempt = typeof header === 'number' ? header : Number(header);
    return Number.isFinite(attempt) && attempt > 0 ? attempt : 1;
  }

  private scheduleReconnect(): void {
    if (this.closing || this.reconnectTimer) {
      return;
    }

    const delay = Math.min(
      2_000 * this.reconnectAttempt,
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private buildUrl(rabbit: AppConfig['rabbitmq']): string {
    const user = encodeURIComponent(rabbit.user);
    const password = encodeURIComponent(rabbit.password);
    const vhost = rabbit.vhost.replace(/^\//, '');
    const path = vhost ? `/${vhost}` : '';
    return `amqp://${user}:${password}@${rabbit.host}:${rabbit.port}${path}`;
  }
}
