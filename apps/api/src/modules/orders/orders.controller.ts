import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('Orders Tracking')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('track/:token')
  @ApiOperation({ summary: 'Track customer order status using high-entropy secret token' })
  @ApiParam({ name: 'token', description: 'Secret tracking token assigned at checkout' })
  async trackOrder(@Param('token') token: string) {
    return this.ordersService.trackOrderByToken(token);
  }

  @Get('customer/:phone')
  @ApiOperation({ summary: 'Get live orders history for customer by verified phone number' })
  @ApiParam({ name: 'phone', description: '10-digit customer phone number' })
  async getCustomerOrders(@Param('phone') phone: string) {
    return this.ordersService.getCustomerOrders(phone);
  }
}
