import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DeliveryZonesService } from './delivery-zones.service';

@ApiTags('Delivery Zones')
@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(private readonly zonesService: DeliveryZonesService) {}

  @Get('check')
  @ApiOperation({ summary: 'Check pincode serviceability and delivery fee' })
  @ApiQuery({ name: 'pincode', required: true, example: '110017' })
  async checkPincode(@Query('pincode') pincode: string) {
    if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
      throw new BadRequestException('Please provide a valid 6-digit Indian PIN code.');
    }
    return this.zonesService.checkPincode(pincode);
  }

  @Get()
  @ApiOperation({ summary: 'List all active delivery zones' })
  async listZones() {
    return this.zonesService.getAllActiveZones();
  }
}
