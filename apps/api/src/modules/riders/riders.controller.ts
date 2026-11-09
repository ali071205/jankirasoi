import { Controller, Get, Patch, Post, Param, Body, UseGuards, Req, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RidersService } from './riders.service';
import { VerifyOtpDto, DeliveryExceptionDto, UpdateDutyStatusDto, UpdateLocationDto } from './dto/riders.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Request } from 'express';
import { OrdersEventsService, OrderStreamEvent } from '../events/orders-events.service';
import { Observable } from 'rxjs';

@ApiTags('Rider Operations')
@Controller('rider/deliveries')
@UseGuards(RolesGuard)
@Roles('RIDER', 'ADMIN')
export class RidersController {
  constructor(
    private readonly ridersService: RidersService,
    private readonly ordersEventsService: OrdersEventsService,
  ) {}

  @Sse('stream')
  @ApiOperation({ summary: 'Real-time Server-Sent Events stream for riders' })
  streamDeliveries(): Observable<{ data: OrderStreamEvent }> {
    return this.ordersEventsService.getOrdersStream();
  }

  @Post('location')
  @ApiOperation({ summary: 'Update rider live GPS location and heading' })
  async updateLocation(@Body() dto: UpdateLocationDto, @Req() req: Request) {
    const riderUserId = (req as any).user?.id;
    return this.ridersService.updateLocation(riderUserId, dto);
  }

  @Patch('duty-status')
  @ApiOperation({ summary: 'Update rider online/offline duty availability status' })
  async updateDutyStatus(@Body() dto: UpdateDutyStatusDto, @Req() req: Request) {
    const riderUserId = (req as any).user?.id;
    return this.ridersService.updateDutyStatus(riderUserId, dto.isAvailable);
  }

  @Get()
  @ApiOperation({ summary: 'Get deliveries assigned to logged-in rider' })
  async getDeliveries(@Req() req: Request) {
    const riderUserId = (req as any).user?.id;
    const riderPhone = (req.headers['x-rider-phone'] as string) || (req.query?.rider_phone as string);
    const riderId = (req.headers['x-rider-id'] as string) || (req.query?.rider_id as string);
    return this.ridersService.getAssignedDeliveries(riderUserId, riderPhone, riderId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Rider accepts assigned delivery batch' })
  async acceptDelivery(@Param('id') orderId: string, @Req() req: Request) {
    const riderUserId = (req as any).user?.id;
    const riderPhone = (req.headers['x-rider-phone'] as string) || (req.query?.rider_phone as string);
    const riderId = (req.headers['x-rider-id'] as string) || (req.query?.rider_id as string);
    return this.ridersService.acceptDelivery(orderId, riderUserId, riderPhone, riderId);
  }

  @Patch(':id/out-for-delivery')
  @ApiOperation({ summary: 'Mark order out for delivery and dispatch customer SMS OTP' })
  async markOutForDelivery(@Param('id') orderId: string, @Req() req: Request) {
    const riderUserId = (req as any).user?.id;
    const riderPhone = (req.headers['x-rider-phone'] as string) || (req.query?.rider_phone as string);
    const riderId = (req.headers['x-rider-id'] as string) || (req.query?.rider_id as string);
    return this.ridersService.markOutForDelivery(orderId, riderUserId, riderPhone, riderId);
  }

  @Post(':id/verify-otp')
  @ApiOperation({ summary: 'Submit verbal customer 6-digit OTP to complete delivery' })
  async verifyOtp(
    @Param('id') orderId: string,
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ) {
    const riderUserId = (req as any).user?.id;
    return this.ridersService.verifyDeliveryOtp(orderId, dto.code, riderUserId);
  }

  @Post(':id/exception')
  @ApiOperation({ summary: 'Report delivery exception (unreachable customer, refused order)' })
  async reportException(
    @Param('id') orderId: string,
    @Body() dto: DeliveryExceptionDto,
    @Req() req: Request,
  ) {
    const riderUserId = (req as any).user?.id;
    return this.ridersService.reportException(orderId, dto, riderUserId);
  }
}
