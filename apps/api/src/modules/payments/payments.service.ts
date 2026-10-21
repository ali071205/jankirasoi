import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { VerifyPaymentDto, RefundOrderDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpayClient: Razorpay | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
  ) {
    const key_id = this.configService.get<string>('RAZORPAY_KEY_ID');
    const key_secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (key_id && key_secret) {
      this.razorpayClient = new Razorpay({ key_id, key_secret });
    }
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret) {
      this.logger.warn('RAZORPAY_KEY_SECRET not set; running in mock signature mode.');
    }

    if (secret) {
      const generatedSignature = createHmac('sha256', secret)
        .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== dto.razorpaySignature) {
        throw new BadRequestException({
          code: 'PAYMENT_SIGNATURE_MISMATCH',
          message: 'Razorpay cryptographic payment signature verification failed.',
        });
      }
    }

    // Atomically update Order and PaymentAttempt
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
      });
      if (!order) throw new NotFoundException('Order not found');

      // Update payment attempt
      await tx.paymentAttempt.updateMany({
        where: { orderId: dto.orderId, providerOrderId: dto.razorpayOrderId },
        data: {
          providerPaymentId: dto.razorpayPaymentId,
          status: 'CAPTURED',
          signatureVerified: true,
        },
      });

      // Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: dto.orderId },
        data: {
          status: 'PLACED',
          paymentStatus: 'CAPTURED',
        },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId: dto.orderId,
          fromStatus: order.status,
          toStatus: 'PLACED',
          actorType: 'SYSTEM',
          reason: `Payment verified via Razorpay [${dto.razorpayPaymentId}]`,
        },
      });

      // Enqueue notification outbox
      await this.outboxService.enqueue(
        'PAYMENT_CONFIRMED',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          phone: order.customerPhone,
          amountPaise: order.totalAmountPaise,
        },
        tx,
      );

      return {
        verified: true,
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        message: 'Payment verified and order successfully confirmed.',
      };
    });
  }

  async handleRazorpayWebhook(rawBody: string, signature: string, payload: any) {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (secret) {
      const expectedSignature = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new BadRequestException('Webhook signature verification failed');
      }
    }

    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event;

    // Deduplicate event via PaymentEvent table
    const existing = await this.prisma.paymentEvent.findUnique({
      where: { providerEventId: eventId },
    });
    if (existing) {
      this.logger.log(`Ignoring duplicate webhook event: ${eventId}`);
      return { status: 'ignored_duplicate' };
    }

    await this.prisma.paymentEvent.create({
      data: {
        providerEventId: eventId,
        eventType,
        payload,
      },
    });

    if (eventType === 'payment.captured') {
      const payment = payload.payload?.payment?.entity;
      const rzpOrderId = payment?.order_id;
      if (rzpOrderId) {
        const attempt = await this.prisma.paymentAttempt.findFirst({
          where: { providerOrderId: rzpOrderId },
        });
        if (attempt) {
          await this.prisma.order.update({
            where: { id: attempt.orderId },
            data: { status: 'PLACED', paymentStatus: 'CAPTURED' },
          });
        }
      }
    }

    return { status: 'processed' };
  }

  async processRefund(orderId: string, dto: RefundOrderDto, adminId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentAttempts: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const paymentAttempt = order.paymentAttempts.find((p) => p.status === 'CAPTURED');
    if (!paymentAttempt && order.paymentMethod === 'RAZORPAY') {
      throw new BadRequestException('Cannot refund order without captured online payment');
    }

    let rzpRefundId = 'rfnd_mock_' + Date.now();
    if (this.razorpayClient && paymentAttempt?.providerPaymentId) {
      try {
        const rzpRefund = await this.razorpayClient.payments.refund(paymentAttempt.providerPaymentId, {
          amount: dto.amountPaise,
          notes: { reason: dto.reason },
        });
        rzpRefundId = rzpRefund.id;
      } catch (err) {
        this.logger.error(`Razorpay refund failed: ${(err as Error).message}`);
        throw new BadRequestException(`Provider refund failed: ${(err as Error).message}`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          orderId,
          providerRefundId: rzpRefundId,
          amountPaise: dto.amountPaise,
          reason: dto.reason,
          status: 'COMPLETED',
          initiatedBy: adminId || 'ADMIN',
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'REFUNDED',
          status: 'CANCELLED',
        },
      });

      await this.auditService.log({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'ORDER_REFUNDED',
        entity: 'Order',
        entityId: orderId,
        newValue: { amountPaise: dto.amountPaise, rzpRefundId },
        reason: dto.reason,
      });

      return refund;
    });
  }
}
