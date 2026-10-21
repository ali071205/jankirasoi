import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async checkPincode(pincode: string) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { pincode },
    });

    if (!zone || !zone.isActive) {
      return {
        serviceable: false,
        pincode,
        message: 'Currently we do not deliver to this pincode.',
      };
    }

    return {
      serviceable: true,
      zoneId: zone.id,
      zoneName: zone.name,
      pincode: zone.pincode,
      minOrderPaise: zone.minOrderPaise,
      deliveryFeePaise: zone.deliveryFeePaise,
      freeDeliveryThresholdPaise: zone.freeDeliveryThresholdPaise,
      estimatedDeliveryMinutes: 45,
    };
  }

  async getAllActiveZones() {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
    });
  }
}
