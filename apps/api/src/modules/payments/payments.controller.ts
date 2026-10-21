import { Controller, Post, Body, Req, Headers, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { VerifyPaymentDto, RefundOrderDto } from './dto/payments.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify Razorpay payment signature from client checkout handoff' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay')
  @ApiOperation({ summary: 'Handle raw-body signed webhook events from Razorpay' })
  @ApiHeader({ name: 'X-Razorpay-Signature', required: true })
  async handleRazorpayWebhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any,
  ) {
    const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : JSON.stringify(payload);
    return this.paymentsService.handleRazorpayWebhook(rawBody, signature, payload);
  }
}

@ApiTags('Admin Payments')
@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/refund')
  @ApiOperation({ summary: 'Issue full or partial refund via Razorpay with audit reason' })
  async refundOrder(
    @Param('id') orderId: string,
    @Body() dto: RefundOrderDto,
  ) {
    return this.paymentsService.processRefund(orderId, dto);
  }
}
