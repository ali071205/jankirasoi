import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards, Req, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrdersEventsService, OrderStreamEvent } from '../events/orders-events.service';
import { UpdateOrderStatusDto, AssignRiderDto, OverrideDeliveryDto } from './dto/orders.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrderStatus } from '@prisma/client';
import { Request } from 'express';
import { Observable } from 'rxjs';

@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'STAFF')
export class AdminOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersEventsService: OrdersEventsService,
  ) {}

  @Sse('stream')
  @ApiOperation({ summary: 'Real-time Server-Sent Events stream for instant order updates' })
  streamOrders(): Observable<{ data: OrderStreamEvent }> {
    return this.ordersEventsService.getOrdersStream();
  }

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

  // FIX #9: Capture actorId (admin/staff user id) for all mutating operations so audit logs
  // are properly attributed. Added @Req() to every mutating endpoint.
  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition order through kitchen lifecycle' })
  async updateStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request,
  ) {
    const actorId = (req as any).user?.id;
    return this.ordersService.updateOrderStatus(orderId, dto.status, dto.reason, actorId);
  }

  @Patch(':id/assign-rider')
  @ApiOperation({ summary: 'Assign rider to order (revokes existing active OTPs)' })
  async assignRider(
    @Param('id') orderId: string,
    @Body() dto: AssignRiderDto,
    @Req() req: Request,
  ) {
    const adminId = (req as any).user?.id;
    return this.ordersService.assignRider(orderId, dto.riderId, adminId);
  }

  @Post(':id/override-delivery')
  @ApiOperation({ summary: 'Emergency administrative delivery override with mandatory audit reason' })
  async overrideDelivery(
    @Param('id') orderId: string,
    @Body() dto: OverrideDeliveryDto,
    @Req() req: Request,
  ) {
    const adminId = (req as any).user?.id;
    return this.ordersService.overrideDelivery(orderId, dto.reason, adminId);
  }
}
