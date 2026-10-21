import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculateQuoteDto, PlaceOrderDto } from './dto/checkout.dto';
import { randomBytes, createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { ConfigService } from '@nestjs/config';

interface CachedQuote {
  quoteToken: string;
  expiresAt: Date;
  serviceDate: Date;
  deliverySlotId: string;
  deliveryZoneId: string | null;
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    unitPricePaise: number;
    quantity: number;
    totalPricePaise: number;
    addons: Array<{
      addonOptionId: string;
      name: string;
      pricePaise: number;
    }>;
  }>;
  subtotalPaise: number;
  deliveryFeePaise: number;
  packagingFeePaise: number;
  taxPaise: number;
  discountPaise: number;
  totalAmountPaise: number;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private quoteCache = new Map<string, CachedQuote>();
  private razorpayClient: Razorpay | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const key_id = this.configService.get<string>('RAZORPAY_KEY_ID');
    const key_secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (key_id && key_secret) {
      this.razorpayClient = new Razorpay({ key_id, key_secret });
    }
  }

  async calculateQuote(dto: CalculateQuoteDto) {
    const serviceDate = new Date(dto.serviceDate);
    if (isNaN(serviceDate.getTime())) {
      throw new BadRequestException('Invalid service date. Format: YYYY-MM-DD');
    }

    // 1. Verify Delivery Zone
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { pincode: dto.pincode },
    });
    if (!zone || !zone.isActive) {
      throw new BadRequestException({
        code: 'INVALID_PINCODE',
        message: `Delivery is not currently serviceable for pincode ${dto.pincode}`,
      });
    }

    // 2. Verify Delivery Slot & Capacity
    const slot = await this.prisma.deliverySlot.findUnique({
      where: { id: dto.deliverySlotId },
      include: {
        capacities: {
          where: { serviceDate },
        },
      },
    });
    if (!slot || !slot.isActive) {
      throw new BadRequestException('Selected delivery slot is inactive or not found.');
    }
    const maxCapacity = slot.capacities[0] ? slot.capacities[0].maxCapacity : slot.defaultCapacity;
    const booked = slot.capacities[0] ? slot.capacities[0].bookedCount : 0;
    if (booked >= maxCapacity) {
      throw new BadRequestException({
        code: 'SLOT_CAPACITY_EXCEEDED',
        message: 'The selected delivery slot has reached full capacity for this date.',
      });
    }

    // 3. Authoritatively fetch and compute item prices
    let subtotalPaise = 0;
    const computedItems: CachedQuote['items'] = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          variants: true,
          availabilities: { where: { serviceDate } },
          addonGroups: {
            include: {
              addonGroup: {
                include: { options: true },
              },
            },
          },
        },
      });

      if (!product || !product.isActive) {
        throw new NotFoundException(`Product not found or unavailable: ${item.productId}`);
      }

      const isSoldOut = product.availabilities[0]?.isSoldOut;
      if (isSoldOut) {
        throw new BadRequestException({
          code: 'ITEM_SOLD_OUT',
          message: `Item "${product.name}" is sold out for the selected date.`,
        });
      }

      // Base price in integer paise
      let itemUnitPricePaise = product.basePricePaise;
      let variantName: string | undefined = undefined;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.isActive) {
          throw new BadRequestException(`Invalid variant for item "${product.name}"`);
        }
        itemUnitPricePaise += variant.priceModifierPaise;
        variantName = variant.name;
      }

      // Addons in integer paise
      const selectedAddons: Array<{ addonOptionId: string; name: string; pricePaise: number }> = [];
      if (item.selectedAddonOptionIds && item.selectedAddonOptionIds.length > 0) {
        for (const optionId of item.selectedAddonOptionIds) {
          let foundOption: any = null;
          for (const pag of product.addonGroups) {
            const opt = pag.addonGroup.options.find((o) => o.id === optionId && o.isActive);
            if (opt) {
              foundOption = opt;
              break;
            }
          }
          if (!foundOption) {
            throw new BadRequestException(`Invalid addon option: ${optionId}`);
          }
          selectedAddons.push({
            addonOptionId: foundOption.id,
            name: foundOption.name,
            pricePaise: foundOption.pricePaise,
          });
          itemUnitPricePaise += foundOption.pricePaise;
        }
      }

      const totalItemPaise = itemUnitPricePaise * item.quantity;
      subtotalPaise += totalItemPaise;

      computedItems.push({
        productId: product.id,
        productName: product.name,
        variantId: item.variantId,
        variantName,
        unitPricePaise: itemUnitPricePaise,
        quantity: item.quantity,
        totalPricePaise: totalItemPaise,
        addons: selectedAddons,
      });
    }

    if (zone.minOrderPaise && subtotalPaise < zone.minOrderPaise) {
      throw new BadRequestException(
        `Minimum order amount for ${zone.name} is ₹${(zone.minOrderPaise / 100).toFixed(2)}. Current subtotal: ₹${(subtotalPaise / 100).toFixed(2)}.`,
      );
    }

    // 4. Calculate Delivery Fee, Packaging Fee & 5% GST
    let deliveryFeePaise = zone.deliveryFeePaise;
    if (zone.freeDeliveryThresholdPaise && subtotalPaise >= zone.freeDeliveryThresholdPaise) {
      deliveryFeePaise = 0;
    }

    const packagingFeePaise = 1500; // Flat ₹15 packaging fee per order
    const taxPaise = Math.round(subtotalPaise * 0.05); // 5% GST on food
    const discountPaise = 0;
    const totalAmountPaise = subtotalPaise + deliveryFeePaise + packagingFeePaise + taxPaise - discountPaise;

    const quoteToken = 'qtok_' + randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL

    const cachedQuote: CachedQuote = {
      quoteToken,
      expiresAt,
      serviceDate,
      deliverySlotId: slot.id,
      deliveryZoneId: zone.id,
      items: computedItems,
      subtotalPaise,
      deliveryFeePaise,
      packagingFeePaise,
      taxPaise,
      discountPaise,
      totalAmountPaise,
    };

    this.quoteCache.set(quoteToken, cachedQuote);

    return {
      quoteToken,
      expiresAt: expiresAt.toISOString(),
      currency: 'INR',
      subtotalPaise,
      deliveryFeePaise,
      packagingFeePaise,
      taxPaise,
      discountPaise,
      totalAmountPaise,
      formattedTotal: `₹${(totalAmountPaise / 100).toFixed(2)}`,
    };
  }

  async placeOrder(dto: PlaceOrderDto, idempotencyKey?: string) {
    const cached = this.quoteCache.get(dto.quoteToken);
    if (!cached || cached.expiresAt < new Date()) {
      throw new BadRequestException('Quotation has expired or is invalid. Please review your cart.');
    }

    // Check for idempotency if key provided
    if (idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey },
        include: { paymentAttempts: true },
      });
      if (existing) {
        return {
          orderId: existing.id,
          orderNumber: existing.orderNumber,
          status: existing.status,
          trackingToken: existing.trackingToken,
          trackingUrl: `https://jankirasoi.in/orders/track/${existing.trackingToken}`,
          payment: {
            method: existing.paymentMethod,
            amountPaise: existing.totalAmountPaise,
            currency: 'INR',
            razorpayOrderId: existing.paymentAttempts[0]?.providerOrderId,
            razorpayKeyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
          },
        };
      }
    }

    // Atomic DB Transaction: Capacity Reservation + Order Creation + Payment Attempt
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock and increment slot capacity
      const capacity = await tx.deliverySlotCapacity.upsert({
        where: {
          deliverySlotId_serviceDate: {
            deliverySlotId: cached.deliverySlotId,
            serviceDate: cached.serviceDate,
          },
        },
        update: { bookedCount: { increment: 1 } },
        create: {
          deliverySlotId: cached.deliverySlotId,
          serviceDate: cached.serviceDate,
          maxCapacity: 30,
          bookedCount: 1,
        },
      });

      if (capacity.bookedCount > capacity.maxCapacity) {
        throw new BadRequestException({
          code: 'SLOT_CAPACITY_EXCEEDED',
          message: 'Delivery slot capacity was filled by another order just now.',
        });
      }

      // Generate human-friendly order number: JR-YYYYMMDD-XXXX
      const dateStr = cached.serviceDate.toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = await tx.order.count({ where: { serviceDate: cached.serviceDate } });
      const orderNumber = `JR-${dateStr}-${(countToday + 1).toString().padStart(4, '0')}`;
      const trackingToken = 'trk_' + randomBytes(16).toString('hex');

      // Create Order Record
      const order = await tx.order.create({
        data: {
          orderNumber,
          trackingToken,
          status: dto.paymentMethod === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT',
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentMethod === 'COD' ? 'AUTHORIZED' : 'PENDING',
          serviceDate: cached.serviceDate,
          deliverySlotId: cached.deliverySlotId,
          deliveryZoneId: cached.deliveryZoneId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerEmail: dto.customerEmail,
          deliveryAddress: dto.deliveryAddress as any,
          deliveryNotes: dto.deliveryNotes,
          subtotalPaise: cached.subtotalPaise,
          deliveryFeePaise: cached.deliveryFeePaise,
          packagingFeePaise: cached.packagingFeePaise,
          taxPaise: cached.taxPaise,
          discountPaise: cached.discountPaise,
          totalAmountPaise: cached.totalAmountPaise,
          idempotencyKey,
          items: {
            create: cached.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              variantName: item.variantName,
              unitPricePaise: item.unitPricePaise,
              quantity: item.quantity,
              totalPricePaise: item.totalPricePaise,
              addons: {
                create: item.addons.map((a) => ({
                  addonOptionId: a.addonOptionId,
                  name: a.name,
                  pricePaise: a.pricePaise,
                })),
              },
            })),
          },
          statusHistory: {
            create: {
              toStatus: dto.paymentMethod === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT',
              actorType: 'CUSTOMER',
              reason: 'Order submitted by customer',
            },
          },
        },
      });

      let razorpayOrderId: string | undefined = undefined;

      // If Razorpay, create order server-side
      if (dto.paymentMethod === 'RAZORPAY') {
        if (this.razorpayClient) {
          try {
            const rzpOrder = await this.razorpayClient.orders.create({
              amount: cached.totalAmountPaise, // in paise
              currency: 'INR',
              receipt: order.id,
              notes: {
                orderNumber: order.orderNumber,
                customerPhone: order.customerPhone,
              },
            });
            razorpayOrderId = rzpOrder.id;
          } catch (err) {
            this.logger.error(`Razorpay order creation failed: ${(err as Error).message}`);
            // Fallback for offline dev
            razorpayOrderId = 'order_mock_' + randomBytes(8).toString('hex');
          }
        } else {
          razorpayOrderId = 'order_mock_' + randomBytes(8).toString('hex');
        }

        await tx.paymentAttempt.create({
          data: {
            orderId: order.id,
            provider: 'RAZORPAY',
            providerOrderId: razorpayOrderId,
            amountPaise: cached.totalAmountPaise,
            currency: 'INR',
            status: 'PENDING',
          },
        });
      }

      // Enqueue notification outbox
      await tx.outboxMessage.create({
        data: {
          eventType: 'ORDER_CREATED',
          payload: { orderId: order.id, orderNumber: order.orderNumber, phone: order.customerPhone },
          status: 'PENDING',
        },
      });

      // Clear cached quote
      this.quoteCache.delete(dto.quoteToken);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        trackingToken: order.trackingToken,
        trackingUrl: `https://jankirasoi.in/orders/track/${order.trackingToken}`,
        payment: {
          method: order.paymentMethod,
          amountPaise: order.totalAmountPaise,
          currency: 'INR',
          razorpayOrderId,
          razorpayKeyId: this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_mock',
        },
      };
    });
  }
}
