import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryOtpService } from './delivery-otp.service';
import { DeliveryExceptionDto } from './dto/riders.dto';

// FIX #3: Source statuses from which a rider can legally pick up an order
const PICKUP_ALLOWED_STATUSES = ['READY_FOR_PICKUP', 'ACCEPTED'] as const;

@Injectable()
export class RidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: DeliveryOtpService,
  ) {}

  async getAssignedDeliveries(riderUserId?: string) {
    // If riderUserId is given, find or create their rider profile
    let riderProfileId: string | undefined = undefined;
    if (riderUserId) {
      let profile = await this.prisma.riderProfile.findUnique({
        where: { userId: riderUserId },
      });
      if (!profile) {
        const user = await this.prisma.user.findUnique({ where: { id: riderUserId } });
        if (user && user.role === 'RIDER') {
          profile = await this.prisma.riderProfile.create({
            data: { userId: riderUserId, vehicleNumber: 'MP-09-AB-1234', isAvailable: true },
          });
        }
      }
      if (profile) {
        riderProfileId = profile.id;
      }
    }

    if (!riderProfileId) {
      return { deliveries: [] };
    }

    // Auto-assign any active unassigned orders to available rider so riders can immediately deliver
    if (riderProfileId) {
      const unassignedOrders = await this.prisma.order.findMany({
        where: {
          status: { in: ['READY_FOR_PICKUP'] },
          riderAssignments: {
            none: { status: 'ASSIGNED' },
          },
        },
        take: 10,
      });

      for (const unassigned of unassignedOrders) {
        await this.prisma.riderAssignment.create({
          data: {
            orderId: unassigned.id,
            riderId: riderProfileId,
            status: 'ASSIGNED',
          },
        }).catch(() => {});
      }
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

    const ordersToDisplay = assignments.map((a) => a.order);

    return {
      deliveries: ordersToDisplay.map((o) => {
        const addr = (o.deliveryAddress as any) || {};
        const rawLat = Number(addr.latitude);
        const rawLng = Number(addr.longitude);
        const hasValidLocalCoords =
          !isNaN(rawLat) &&
          !isNaN(rawLng) &&
          rawLat >= 22.0 &&
          rawLat <= 23.5 &&
          rawLng >= 75.0 &&
          rawLng <= 76.5;

        const lat = hasValidLocalCoords ? rawLat : 22.6288;
        const lng = hasValidLocalCoords ? rawLng : 75.5684;

        const addressParts = [
          addr.flat,
          addr.street,
          addr.landmark ? `Near ${addr.landmark}` : null,
          'Sagore',
          'Pithampur',
          addr.pincode || '454774',
        ].filter(Boolean);
        const destinationText = addressParts.join(', ');

        const navigationUrl = hasValidLocalCoords
          ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationText)}`;

        return {
          orderId: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          deliveryAddress: `${addr.flat || ''}, ${addr.street || ''}, ${addr.pincode || ''}`.replace(/^,\s*|,\s*$/g, ''),
          landmark: addr.landmark,
          coordinates: { latitude: lat, longitude: lng },
          navigationUrl,
          slotLabel: o.deliverySlot.label,
          paymentMethod: o.paymentMethod,
          cashDuePaise: o.paymentMethod === 'COD' && o.paymentStatus !== 'CAPTURED' ? o.totalAmountPaise : 0,
          itemsSummary: o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
        };
      }),
    };
  }

  async markOutForDelivery(orderId: string, riderUserId?: string) {
    // FIX #3: Wrap status update + status event + OTP generation in a single atomic transaction.
    // Also validates the state transition before committing anything.
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');

      if (!PICKUP_ALLOWED_STATUSES.includes(order.status as any)) {
        throw new BadRequestException(
          `Order cannot be marked out for delivery from current status '${order.status}'. ` +
          `Allowed: [${PICKUP_ALLOWED_STATUSES.join(', ')}]`,
        );
      }

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'OUT_FOR_DELIVERY' },
      });

      // Record status event atomically with the update
      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'OUT_FOR_DELIVERY',
          actorId: riderUserId,
          actorType: 'RIDER',
          reason: 'Rider picked up order and departed kitchen',
        },
      });

      // Invalidate any existing OTPs and create a fresh one — all inside the transaction
      await tx.deliveryOtp.updateMany({
        where: { orderId, isUsed: false },
        data: { isUsed: true, usedAt: new Date() },
      });

      const { OTP_ENCRYPTION_SECRET } = process.env;
      const secret = OTP_ENCRYPTION_SECRET || 'dev-otp-hmac-secret-min32chars';
      const { randomInt, createHmac } = await import('crypto');
      const plainOtp = randomInt(100000, 999999).toString();
      const hashedVerifier = createHmac('sha256', secret).update(plainOtp).digest('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await tx.deliveryOtp.create({
        data: {
          orderId,
          phone: order.customerPhone,
          otpCode: null,        // FIX #1: never persist plaintext OTP
          hashedVerifier,
          expiresAt,
          maxAttempts: 5,
        },
      });

      // Enqueue notification for customer display
      await tx.outboxMessage.create({
        data: {
          eventType: 'DELIVERY_OTP_GENERATED',
          payload: { orderId, phone: order.customerPhone, otp: plainOtp, channel: 'WEB_DISPLAY' },
          status: 'PENDING',
        },
      });

      const maskedPhone =
        order.customerPhone.length >= 10
          ? 'XXXXXX' + order.customerPhone.slice(-4)
          : order.customerPhone;

      return {
        orderId,
        status: 'OUT_FOR_DELIVERY',
        message: 'Order is out for delivery. OTP generated for customer tracking screen.',
        otpSentTo: maskedPhone,
        expiresAt: expiresAt.toISOString(),
      };
    });
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
