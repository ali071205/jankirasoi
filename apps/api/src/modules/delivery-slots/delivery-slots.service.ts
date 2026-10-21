import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliverySlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSlotsForDate(dateString: string) {
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

    return {
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
  }
}
