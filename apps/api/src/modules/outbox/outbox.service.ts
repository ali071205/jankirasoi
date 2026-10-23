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
          // FIX #18: Dispatch based on event type instead of silently marking as completed.
          // Add concrete handlers for each event. SMS/WhatsApp integration can be plugged
          // in here per event type once a provider (MSG91, Twilio, etc.) is configured.
          await this.dispatchEvent(msg.event_type, msg.payload);

          this.logger.log(`Dispatched outbox task: ${msg.id} [${msg.event_type}]`);
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
          this.logger.error(
            `Outbox task ${msg.id} [${msg.event_type}] failed (attempt ${retries}): ${(err as Error).message}`,
          );
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

  /**
   * Dispatch an outbox event to the appropriate notification channel.
   * Each case should call the relevant provider SDK (SMS, push, email, webhook).
   * Currently logs the intent — wire in your provider under each case.
   */
  private async dispatchEvent(eventType: string, payload: any): Promise<void> {
    switch (eventType) {
      case 'ORDER_CREATED':
        // TODO: Send order confirmation SMS to payload.phone
        this.logger.log(
          `[NOTIFY] ORDER_CREATED → SMS to ${payload.phone}: Order ${payload.orderNumber} confirmed.`,
        );
        break;

      case 'PAYMENT_CONFIRMED':
        // TODO: Send payment receipt SMS/email
        this.logger.log(
          `[NOTIFY] PAYMENT_CONFIRMED → SMS to ${payload.phone}: ₹${(payload.amountPaise / 100).toFixed(2)} received for ${payload.orderNumber}.`,
        );
        break;

      case 'DELIVERY_OTP_GENERATED':
        // TODO: Optionally send OTP via SMS as a fallback to the web display
        // For now it is shown on the customer tracking screen; log only.
        this.logger.log(
          `[NOTIFY] DELIVERY_OTP_GENERATED → Web display for order ${payload.orderId}. ` +
          `(SMS fallback: to ${payload.phone})`,
        );
        break;

      case 'DELIVERY_COMPLETED':
        // TODO: Send delivery confirmation SMS
        this.logger.log(
          `[NOTIFY] DELIVERY_COMPLETED → SMS to ${payload.phone}: Your order has been delivered.`,
        );
        break;

      case 'QUOTE_CACHE':
        // Internal event — no external notification needed
        this.logger.debug(`[INTERNAL] QUOTE_CACHE record processed for order ${payload.quoteToken}`);
        break;

      default:
        this.logger.warn(`[OUTBOX] Unknown event type '${eventType}' — no handler registered.`);
        break;
    }
  }
}
