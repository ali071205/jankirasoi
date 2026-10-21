import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryOtpService } from './delivery-otp.service';
import { DeliveryExceptionDto } from './dto/riders.dto';

@Injectable()
export class RidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: DeliveryOtpService,
  ) {}

  async getAssignedDeliveries(riderUserId?: string) {
    // If riderUserId is given, find their rider profile
    let riderProfileId: string | undefined = undefined;
    if (riderUserId) {
      const profile = await this.prisma.riderProfile.findUnique({
        where: { userId: riderUserId },
      });
      if (profile) riderProfileId = profile.id;
    }

    const assignments = await this.prisma.riderAssignment.findMany({
      where: {
        status: 'ASSIGNED',
        ...(riderProfileId ? { riderId: riderProfileId } : {}),
      },
      include: {
        order: {
          include: {
            deliverySlot: true,
            items: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return {
      deliveries: assignments.map((a) => {
        const o = a.order;
        const addr = (o.deliveryAddress as any) || {};
        const lat = addr.latitude || 28.52728;
        const lng = addr.longitude || 77.21832;

        return {
          orderId: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          deliveryAddress: `${addr.flat || ''}, ${addr.street || ''}, ${addr.pincode || ''}`,
          landmark: addr.landmark,
          coordinates: { latitude: lat, longitude: lng },
          navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
          slotLabel: o.deliverySlot.label,
          paymentMethod: o.paymentMethod,
          cashDuePaise: o.paymentMethod === 'COD' && o.paymentStatus !== 'CAPTURED' ? o.totalAmountPaise : 0,
          itemsSummary: o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
        };
      }),
    };
  }

  async markOutForDelivery(orderId: string, riderUserId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== 'READY_FOR_PICKUP' && order.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Order cannot be marked out for delivery from current status '${order.status}'`,
      );
    }

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'OUT_FOR_DELIVERY' },
    });

    await this.prisma.orderStatusEvent.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'OUT_FOR_DELIVERY',
        actorId: riderUserId,
        actorType: 'RIDER',
        reason: 'Rider picked up order and departed kitchen',
      },
    });

    // Generate and send 6-digit cryptographic OTP to customer
    const otpResult = await this.otpService.generateAndSendOtp(orderId, order.customerPhone);

    const maskedPhone =
      order.customerPhone.length >= 10
        ? 'XXXXXX' + order.customerPhone.slice(-4)
        : order.customerPhone;

    return {
      orderId,
      status: 'OUT_FOR_DELIVERY',
      message: 'Order is out for delivery. 6-digit OTP sent to customer phone.',
      otpSentTo: maskedPhone,
      expiresAt: otpResult.expiresAt.toISOString(),
    };
  }

  async verifyDeliveryOtp(orderId: string, code: string, riderUserId?: string) {
    return this.otpService.verifyOtp(orderId, code, riderUserId);
  }

  async reportException(orderId: string, dto: DeliveryExceptionDto, riderUserId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.deliveryAttempt.create({
        data: {
          orderId,
          riderId: riderUserId,
          outcome: 'EXCEPTION',
          notes: `${dto.reason}: ${dto.notes}`,
        },
      });

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERY_EXCEPTION' },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'DELIVERY_EXCEPTION',
          actorId: riderUserId,
          actorType: 'RIDER',
          reason: `Delivery Exception: ${dto.reason} - ${dto.notes}`,
        },
      });

      return {
        orderId: updated.id,
        status: updated.status,
        message: 'Delivery exception successfully recorded. Kitchen manager notified.',
      };
    });
  }
}
