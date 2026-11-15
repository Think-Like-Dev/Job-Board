import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OutboxEventSchema } from './outbox.schema';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxService } from './outbox.service';
import { RabbitMqPublisher } from './rabbitmq.publisher';

/**
 * Everything that publishes domain events to RabbitMQ.
 *
 * The AI service consumes the events; it never reads the core database.
 */
@Module({
  imports: [MikroOrmModule.forFeature([OutboxEventSchema])],
  providers: [OutboxService, OutboxRelayService, RabbitMqPublisher],
  exports: [OutboxService, RabbitMqPublisher],
})
export class MessagingModule {}
