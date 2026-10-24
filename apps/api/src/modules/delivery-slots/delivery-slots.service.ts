import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CachedSlots {
  data: any;
  cachedAt: number;
}

@Injectable()
export class DeliverySlotsService {
  private readonly slotsCache = new Map<string, CachedSlots>();
  private readonly CACHE_TTL_MS = 5_000; // 5 seconds micro-cache

  constructor(private readonly prisma: PrismaService) {}

  clearCache() {
    this.slotsCache.clear();
  }

  async getSlotsForDate(dateString: string) {
    const cached = this.slotsCache.get(dateString);
    const now = Date.now();
    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const serviceDate = new Date(dateString);
    if (isNaN(serviceDate.getTime())) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD.');
    }

    const slots = await this.prisma.deliverySlot.findMany({
      where: { isActive: true },
      include: {
        capacities: {
          where: { serviceDate },
        },
      },
    });

    const result = {
      date: dateString,
      slots: slots.map((slot) => {
        const capacityRecord = slot.capacities[0];
        const maxCapacity = capacityRecord ? capacityRecord.maxCapacity : slot.defaultCapacity;
        const bookedCount = capacityRecord ? capacityRecord.bookedCount : 0;
        const remainingCapacity = Math.max(0, maxCapacity - bookedCount);

        return {
          id: slot.id,
          mealType: slot.mealType,
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          cutoffTime: slot.cutoffTime,
          isAvailable: remainingCapacity > 0,
          remainingCapacity,
        };
      }),
    };

    this.slotsCache.set(dateString, { data: result, cachedAt: now });
    return result;
  }
}
