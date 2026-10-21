import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { ConfigService } from '@nestjs/config';
import { randomInt, createHmac } from 'crypto';

@Injectable()
export class DeliveryOtpService {
  private readonly logger = new Logger(DeliveryOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
  ) {}

  private hashOtp(code: string): string {
    const secret =
      this.configService.get<string>('OTP_ENCRYPTION_SECRET') || 'dev-otp-hmac-secret-min32chars';
    return createHmac('sha256', secret).update(code).digest('hex');
  }

  async generateAndSendOtp(orderId: string, phone: string) {
    // Invalidate existing unused OTPs on this order
    await this.prisma.deliveryOtp.updateMany({
      where: { orderId, isUsed: false },
      data: { isUsed: true, usedAt: new Date() },
    });

    // Generate cryptographic 6-digit number
    const plainOtp = randomInt(100000, 999999).toString();
    const hashedVerifier = this.hashOtp(plainOtp);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours TTL

    const otpRecord = await this.prisma.deliveryOtp.create({
      data: {
        orderId,
        phone,
        otpCode: plainOtp,
        hashedVerifier,
        expiresAt,
        maxAttempts: 5,
      },
    });

    // In-app OTP generated for customer web view; SMS can be sent as optional fallback
    await this.outboxService.enqueue('DELIVERY_OTP_GENERATED', {
      orderId,
      phone,
      otp: plainOtp,
      channel: 'WEB_DISPLAY',
    });

    this.logger.log(`Generated OTP for order ${orderId} (Record ID: ${otpRecord.id})`);
    return { otpRecordId: otpRecord.id, expiresAt };
  }

  async verifyOtp(orderId: string, code: string, riderUserId?: string) {
    const activeOtp = await this.prisma.deliveryOtp.findFirst({
      where: {
        orderId,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_OTP',
        message: 'No active delivery OTP found for this order. Please ask to generate/resend.',
      });
    }

    if (activeOtp.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'This delivery OTP has expired. Please request a new code.',
      });
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      throw new BadRequestException({
        code: 'OTP_LOCKED',
        message: 'Maximum attempts exceeded (5). Code is locked. Please contact kitchen manager.',
      });
    }

    const hashedInput = this.hashOtp(code);
    if (hashedInput !== activeOtp.hashedVerifier) {
      const nextAttempts = activeOtp.attempts + 1;
      await this.prisma.deliveryOtp.update({
        where: { id: activeOtp.id },
        data: { attempts: nextAttempts },
      });

      const remaining = activeOtp.maxAttempts - nextAttempts;
      throw new BadRequestException({
        code: 'INVALID_OTP',
        message: `Invalid OTP code. ${remaining} attempt(s) remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // OTP Validated! Complete delivery atomically
    return this.prisma.$transaction(async (tx) => {
      await tx.deliveryOtp.update({
        where: { id: activeOtp.id },
        data: { isUsed: true, usedAt: new Date() },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: 'OUT_FOR_DELIVERY',
          toStatus: 'DELIVERED',
          actorId: riderUserId,
          actorType: 'RIDER',
          reason: 'Handover confirmed with verified 6-digit OTP',
        },
      });

      await tx.deliveryAttempt.create({
        data: {
          orderId,
          riderId: riderUserId,
          outcome: 'SUCCESS',
          notes: 'Customer OTP verified successfully',
        },
      });

      // Enqueue Delivery Confirmed SMS
      await tx.outboxMessage.create({
        data: {
          eventType: 'DELIVERY_COMPLETED',
          payload: { orderId, phone: updatedOrder.customerPhone },
          status: 'PENDING',
        },
      });

      return {
        success: true,
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        deliveredAt: new Date().toISOString(),
        message: 'Delivery successfully verified and marked completed.',
      };
    });
  }
}
