import { Controller, Get, Patch, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RidersService } from './riders.service';
import { VerifyOtpDto, DeliveryExceptionDto } from './dto/riders.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('Rider Operations')
@Controller('rider/deliveries')
@UseGuards(RolesGuard)
@Roles('RIDER', 'ADMIN')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  @ApiOperation({ summary: 'Get deliveries assigned to logged-in rider' })
  async getDeliveries(@Req() req: Request) {
    const riderUserId = (req as any).user?.id;
    return this.ridersService.getAssignedDeliveries(riderUserId);
  }

  @Patch(':id/out-for-delivery')
  @ApiOperation({ summary: 'Mark order out for delivery and dispatch customer SMS OTP' })
  async markOutForDelivery(@Param('id') orderId: string, @Req() req: Request) {
    const riderUserId = (req as any).user?.id;
    return this.ridersService.markOutForDelivery(orderId, riderUserId);
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
