import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto, AssignRiderDto, OverrideDeliveryDto } from './dto/orders.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrderStatus } from '@prisma/client';

@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get kitchen orders list with pagination and status filters' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'service_date', required: false, example: '2026-10-22' })
  async getOrders(
    @Query('status') status?: OrderStatus,
    @Query('service_date') serviceDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getAdminOrders(
      status,
      serviceDate,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 25,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition order through kitchen lifecycle' })
  async updateStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(orderId, dto.status, dto.reason);
  }

  @Patch(':id/assign-rider')
  @ApiOperation({ summary: 'Assign rider to order (revokes existing active OTPs)' })
  async assignRider(
    @Param('id') orderId: string,
    @Body() dto: AssignRiderDto,
  ) {
    return this.ordersService.assignRider(orderId, dto.riderId);
  }

  @Post(':id/override-delivery')
  @ApiOperation({ summary: 'Emergency administrative delivery override with mandatory audit reason' })
  async overrideDelivery(
    @Param('id') orderId: string,
    @Body() dto: OverrideDeliveryDto,
  ) {
    return this.ordersService.overrideDelivery(orderId, dto.reason);
  }
}
