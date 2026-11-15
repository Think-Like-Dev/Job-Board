import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { AppConfig } from '@src/config/configuration';
import {
  CORE_SCORING_RESULTS_QUEUE,
  DEAD_LETTER_EXCHANGE,
  EVENTS_EXCHANGE,
  ROUTING_SCORING_COMPLETED,
  ROUTING_SCORING_FAILED,
} from './messaging.constants';

/**
 * Thin wrapper around `amqplib` that publishes durable messages to the topic
 * exchange the AI service listens on.
 *
 * The connection is opened lazily and reused. A publish that fails closes the
 * connection so the next attempt starts from a clean state instead of reusing
 * a broken channel.
 */
@Injectable()
export class RabbitMqPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqPublisher.name);

  private connection?: amqp.ChannelModel;
  private channel?: amqp.ConfirmChannel;
  private connecting?: Promise<void>;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  /** Publishes one message and resolves once the broker acknowledged it. */
  async publish(routingKey: string, payload: unknown): Promise<void> {
    const channel = await this.getChannel();
    const body = Buffer.from(JSON.stringify(payload), 'utf-8');

    await new Promise<void>((resolve, reject) => {
      channel.publish(
        EVENTS_EXCHANGE,
        routingKey,
        body,
        {
          persistent: true,
          contentType: 'application/json',
          contentEncoding: 'utf-8',
        },
        (error) =>
          error
            ? reject(error instanceof Error ? error : new Error(String(error)))
            : resolve(),
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private async getChannel(): Promise<amqp.ConfirmChannel> {
    if (this.channel) {
      return this.channel;
    }
    if (!this.connecting) {
      this.connecting = this.connect().finally(() => {
        this.connecting = undefined;
      });
    }
    await this.connecting;
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }
    return this.channel;
  }

  private async connect(): Promise<void> {
    const rabbit = this.config.get('rabbitmq', { infer: true });
    const url = this.buildUrl(rabbit);

    this.connection = await amqp.connect(url);
    this.connection.on('error', (error: Error) => {
      this.logger.error(`RabbitMQ connection error: ${error.message}`);
    });
    this.connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
    });

    const channel = await this.connection.createConfirmChannel();
    await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', {
      durable: true,
    });

    // The queue the AI service's results arrive in. The consumer declares the
    // queue it reads, so the results are buffered even while nothing consumes
    // them yet.
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

    this.channel = channel;
    this.logger.log(`Connected to RabbitMQ at ${rabbit.host}:${rabbit.port}`);
  }

  private buildUrl(rabbit: AppConfig['rabbitmq']): string {
    const user = encodeURIComponent(rabbit.user);
    const password = encodeURIComponent(rabbit.password);
    const vhost = rabbit.vhost.replace(/^\//, '');
    const path = vhost ? `/${vhost}` : '';
    return `amqp://${user}:${password}@${rabbit.host}:${rabbit.port}${path}`;
  }

  private async close(): Promise<void> {
    const channel = this.channel;
    const connection = this.connection;
    this.channel = undefined;
    this.connection = undefined;

    try {
      await channel?.close();
    } catch {
      // The connection is already gone; nothing to clean up.
    }
    try {
      await connection?.close();
    } catch {
      // Same.
    }
  }
}
