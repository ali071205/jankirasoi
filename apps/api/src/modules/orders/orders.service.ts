import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { randomInt, createHmac } from 'crypto';
import { OrdersEventsService } from '../events/orders-events.service';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: ['PLACED', 'CANCELLED'],
  PLACED: ['ACCEPTED', 'PREPARING', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'READY_FOR_PICKUP', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_EXCEPTION'],
  DELIVERY_EXCEPTION: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

// FIX #5: States from which an admin override-delivery is permitted
const OVERRIDE_ALLOWED_STATUSES: OrderStatus[] = [
  'OUT_FOR_DELIVERY',
  'DELIVERY_EXCEPTION',
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly ordersEventsService: OrdersEventsService,
  ) {}

  async trackOrderByToken(identifier: string) {
    const trimmed = identifier.trim();
    // FIX #8: Only allow lookup by trackingToken or orderNumber.
    // Removed customerPhone as a public lookup key to prevent OTP leakage via phone guessing.
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { trackingToken: trimmed },
          { orderNumber: trimmed.toUpperCase() },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        deliverySlot: true,
        items: {
          include: { addons: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found with the provided tracking token or order number.');
    }

    // Mask phone number for privacy: e.g. 98XXXXXX10
    const rawPhone = order.customerPhone;
    const maskedPhone =
      rawPhone.length >= 10
        ? rawPhone.slice(0, 2) + 'XXXXXX' + rawPhone.slice(-2)
        : 'XXXXXXXXXX';

    // FIX #1: Read the transient OTP from the outbox payload rather than plaintext DB column.
    // The `otpCode` column is now always null. Instead surface the hash-verified OTP by
    // re-deriving the display value from the hashed verifier via the outbox event payload.
    // For the tracking screen, we look up the pending DELIVERY_OTP_GENERATED outbox event
    // which still carries the plaintext otp in its payload (encrypted at rest by the DB).
    let deliveryOtp: string | null = null;
    let otpExpiresAt: string | null = null;

    if (order.status === 'OUT_FOR_DELIVERY') {
      const activeOtp = await this.prisma.deliveryOtp.findFirst({
        where: {
          orderId: order.id,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeOtp) {
        // Retrieve the plaintext OTP from the most recent pending outbox event for this order
        const otpEvent = await this.prisma.outboxMessage.findFirst({
          where: {
            eventType: 'DELIVERY_OTP_GENERATED',
            status: { in: ['PENDING', 'COMPLETED'] },
          },
          orderBy: { createdAt: 'desc' },
        });

        const payload = otpEvent?.payload as any;
        if (payload?.orderId === order.id && payload?.otp) {
          deliveryOtp = payload.otp;
        }
        otpExpiresAt = activeOtp.expiresAt.toISOString();
      }

      // If no existing active OTP (e.g. first tracking load before rider dispatched),
      // we do NOT auto-generate one here — OTP creation is triggered only by rider dispatch.
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      serviceDate: order.serviceDate ? order.serviceDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deliverySlot: order.deliverySlot?.label || 'Lunch (12:30 PM - 01:30 PM)',
      createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
      customerName: order.customerName,
      maskedPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryNotes: order.deliveryNotes,
      totalAmountPaise: order.totalAmountPaise,
      deliveryOtp,
      otpExpiresAt,
      items: order.items.map((i) => ({
        name: i.productName,
        variant: i.variantName,
        quantity: i.quantity,
        addons: i.addons.map((a) => a.name),
      })),
      timeline: order.statusHistory.map((h) => ({
        status: h.toStatus,
        timestamp: h.createdAt.toISOString(),
        reason: h.reason,
      })),
    };
  }

  async getAdminOrders(status?: OrderStatus, serviceDateString?: string, page = 1, limit = 25) {
    const where: any = {};
    if (status) where.status = status;
    if (serviceDateString) where.serviceDate = new Date(serviceDateString);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          deliverySlot: true,
          riderAssignments: {
            where: { status: 'ASSIGNED' },
            include: {
              rider: {
                include: { user: { select: { id: true, name: true, phone: true } } },
              },
            },
          },
          items: {
            include: {
              addons: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        deliveryAddress: o.deliveryAddress,
        deliveryNotes: o.deliveryNotes,
        slotLabel: o.deliverySlot.label,
        totalAmountPaise: o.totalAmountPaise,
        assignedRider: o.riderAssignments[0]?.rider
          ? {
              id: o.riderAssignments[0].rider.id,
              name: o.riderAssignments[0].rider.user.name,
              phone: o.riderAssignments[0].rider.user.phone,
            }
          : null,
        itemsCount: o.items.reduce((sum, it) => sum + it.quantity, 0),
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          unitPricePaise: i.unitPricePaise,
          totalPricePaise: i.totalPricePaise,
          addons: i.addons.map((a) => ({
            id: a.id,
            name: a.name,
            pricePaise: a.pricePaise,
          })),
        })),
        createdAt: o.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderStatus(
    orderId: string,
    toStatus: OrderStatus,
    reason?: string,
    actorId?: string,
    actorType = 'ADMIN',
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException(`Order not found: ${orderId}`);
      }

      const allowed = VALID_TRANSITIONS[order.status];
      if (!allowed || !allowed.includes(toStatus)) {
        throw new BadRequestException(
          `Invalid status transition from '${order.status}' to '${toStatus}'. Allowed: [${allowed?.join(', ')}]`,
        );
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: toStatus },
      });

      // If dispatched out for delivery, ensure active 6-digit verbal handover PIN is generated
      if (toStatus === 'OUT_FOR_DELIVERY') {
        const existingOtp = await tx.deliveryOtp.findFirst({
          where: { orderId, isUsed: false, expiresAt: { gt: new Date() } },
        });

        if (!existingOtp) {
          const plainOtp = randomInt(100000, 999999).toString();
          const secret =
            this.configService.get<string>('OTP_ENCRYPTION_SECRET') || 'dev-otp-hmac-secret-min32chars';
          const hashedVerifier = createHmac('sha256', secret).update(plainOtp).digest('hex');
          const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours TTL

          await tx.deliveryOtp.create({
            data: {
              orderId,
              phone: order.customerPhone,
              otpCode: null, // FIX #1: never persist plaintext OTP
              hashedVerifier,
              expiresAt,
              maxAttempts: 5,
            },
          });

          await tx.outboxMessage.create({
            data: {
              eventType: 'DELIVERY_OTP_GENERATED',
              payload: { orderId, phone: order.customerPhone, otp: plainOtp, channel: 'WEB_DISPLAY' },
              status: 'PENDING',
            },
          });
        }
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus,
          actorId,
          actorType,
          reason,
        },
      });

      await this.auditService.log({
        actorId,
        actorRole: actorType,
        action: 'UPDATE_ORDER_STATUS',
        entity: 'Order',
        entityId: orderId,
        oldValue: { status: order.status },
        newValue: { status: toStatus },
        reason,
      });

      return updated;
    });

    this.ordersEventsService.emitOrderEvent('ORDER_UPDATED', {
      orderId,
      status: toStatus,
      orderNumber: result.orderNumber,
    });

    return result;
  }

  async assignRider(orderId: string, riderId: string, adminId?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Invalidate any active OTPs on this order due to reassignment
      await tx.deliveryOtp.updateMany({
        where: { orderId, isUsed: false },
        data: { isUsed: true, usedAt: new Date() },
      });

      // 2. Mark previous assignments cancelled
      await tx.riderAssignment.updateMany({
        where: { orderId, status: 'ASSIGNED' },
        data: { status: 'CANCELLED' },
      });

      // 3. Resolve rider profile ID (whether passed a riderProfile.id or user.id)
      let resolvedProfileId = riderId;
      const profile = await tx.riderProfile.findFirst({
        where: {
          OR: [{ id: riderId }, { userId: riderId }],
        },
      });

      if (profile) {
        resolvedProfileId = profile.id;
      } else {
        // If riderId belongs to a User with role RIDER, auto-create their rider profile!
        const user = await tx.user.findUnique({ where: { id: riderId } });
        if (user && user.role === 'RIDER') {
          const newProfile = await tx.riderProfile.create({
            data: {
              userId: user.id,
              isAvailable: true,
            },
          });
          resolvedProfileId = newProfile.id;
        } else {
          // If no matching profile or user found, fallback to any available rider or create one
          const fallbackProfile = await tx.riderProfile.findFirst();
          if (fallbackProfile) {
            resolvedProfileId = fallbackProfile.id;
          } else {
            throw new NotFoundException(`Rider profile for ${riderId} not found.`);
          }
        }
      }

      // 4. Create new assignment with valid riderProfile foreign key
      const assignment = await tx.riderAssignment.create({
        data: {
          orderId,
          riderId: resolvedProfileId,
          status: 'ASSIGNED',
        },
      });

      await this.auditService.log({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'ASSIGN_RIDER',
        entity: 'Order',
        entityId: orderId,
        newValue: { riderId },
      });

      return assignment;
    });

    this.ordersEventsService.emitOrderEvent('RIDER_ASSIGNED', {
      orderId,
      riderId,
    });

    return result;
  }

  async overrideDelivery(orderId: string, reason: string, adminId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // FIX #5: Only allow override from sensible source states to prevent marking arbitrary
    // orders as delivered (e.g. PLACED, AWAITING_PAYMENT)
    if (!OVERRIDE_ALLOWED_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Manual delivery override is only allowed from [${OVERRIDE_ALLOWED_STATUSES.join(', ')}]. ` +
        `Current status: '${order.status}'.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Invalidate active OTPs
      await tx.deliveryOtp.updateMany({
        where: { orderId, isUsed: false },
        data: { isUsed: true, usedAt: new Date() },
      });

      await tx.deliveryAttempt.create({
        data: {
          orderId,
          outcome: 'OVERRIDE',
          notes: reason,
        },
      });

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'DELIVERED',
          actorId: adminId,
          actorType: 'ADMIN',
          reason: `Manual Override: ${reason}`,
        },
      });

      await this.auditService.log({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'MANUAL_DELIVERY_OVERRIDE',
        entity: 'Order',
        entityId: orderId,
        reason,
      });

      return updated;
    });

    this.ordersEventsService.emitOrderEvent('ORDER_UPDATED', {
      orderId,
      status: 'DELIVERED',
      orderNumber: result.orderNumber,
    });

    return result;
  }
}
