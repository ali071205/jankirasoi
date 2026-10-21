import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DeliverySlotsService } from './delivery-slots.service';

@ApiTags('Delivery Slots')
@Controller('delivery-slots')
export class DeliverySlotsController {
  constructor(private readonly slotsService: DeliverySlotsService) {}

  @Get()
  @ApiOperation({ summary: 'Get available delivery slots and remaining capacity for date' })
  @ApiQuery({ name: 'date', required: true, example: '2026-10-22' })
  async getSlots(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('Query parameter "date" (YYYY-MM-DD) is required.');
    }
    return this.slotsService.getSlotsForDate(date);
  }
}
