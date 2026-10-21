import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    eventType: string,
    payload: Record<string, any>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.outboxMessage.create({
      data: {
        eventType,
        payload,
        status: 'PENDING',
      },
    });
  }

  async processPendingMessages(batchSize = 10) {
    // Transactional worker claim using PostgreSQL SKIP LOCKED
    return this.prisma.$transaction(async (tx) => {
      const messages: any[] = await tx.$queryRaw`
        SELECT * FROM outbox_messages
        WHERE status = 'PENDING' AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      for (const msg of messages) {
        try {
          this.logger.log(`Processing outbox task: ${msg.id} [${msg.event_type}]`);
          // Dispatch according to event type (e.g. SEND_SMS_OTP, SEND_CONFIRMATION)
          await tx.outboxMessage.update({
            where: { id: msg.id },
            data: {
              status: 'COMPLETED',
              processedAt: new Date(),
            },
          });
        } catch (err) {
          const retries = msg.retry_count + 1;
          const status = retries >= msg.max_retries ? 'FAILED' : 'PENDING';
          await tx.outboxMessage.update({
            where: { id: msg.id },
            data: {
              status,
              retryCount: retries,
              lastError: (err as Error).message,
            },
          });
        }
      }
    });
  }
}
