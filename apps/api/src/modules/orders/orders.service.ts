import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrderStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: ['PLACED', 'CANCELLED'],
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_EXCEPTION'],
  DELIVERY_EXCEPTION: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async trackOrderByToken(trackingToken: string) {
    const order = await this.prisma.order.findUnique({
      where: { trackingToken },
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
      throw new NotFoundException('Order not found with the provided tracking token.');
    }

    // Mask phone number for privacy: e.g. 98XXXXXX10
    const rawPhone = order.customerPhone;
    const maskedPhone =
      rawPhone.length >= 10
        ? rawPhone.slice(0, 2) + 'XXXXXX' + rawPhone.slice(-2)
        : 'XXXXXXXXXX';

    // In-app OTP: Show delivery code to customer only when driver is OUT_FOR_DELIVERY
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
        deliveryOtp = activeOtp.otpCode;
        otpExpiresAt = activeOtp.expiresAt.toISOString();
      }
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      serviceDate: order.serviceDate.toISOString().split('T')[0],
      deliverySlot: order.deliverySlot.label,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerName,
      maskedPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryNotes: order.deliveryNotes,
      totalAmountPaise: order.totalAmountPaise,
      deliveryOtp, // 6-digit code displayed directly on customer screen to give to rider
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
          items: true,
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
        slotLabel: o.deliverySlot.label,
        totalAmountPaise: o.totalAmountPaise,
        assignedRider: o.riderAssignments[0]?.rider
          ? {
              id: o.riderAssignments[0].rider.id,
              name: o.riderAssignments[0].rider.user.name,
              phone: o.riderAssignments[0].rider.user.phone,
            }
          : null,
        itemsCount: o.items.length,
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
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(toStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${order.status}' to '${toStatus}'. Allowed: [${allowed?.join(', ')}]`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: toStatus },
      });

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
  }

  async assignRider(orderId: string, riderId: string, adminId?: string) {
    return this.prisma.$transaction(async (tx) => {
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

      // 3. Create new assignment
      const assignment = await tx.riderAssignment.create({
        data: {
          orderId,
          riderId,
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
  }

  async overrideDelivery(orderId: string, reason: string, adminId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.$transaction(async (tx) => {
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
  }
}
