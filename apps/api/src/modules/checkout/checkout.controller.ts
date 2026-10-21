import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CalculateQuoteDto, PlaceOrderDto } from './dto/checkout.dto';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('quote')
  @ApiOperation({ summary: 'Calculate authoritative price quotation in integer paise' })
  async calculateQuote(@Body() dto: CalculateQuoteDto) {
    return this.checkoutService.calculateQuote(dto);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Atomically place order, reserve slot, and create Razorpay order' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Client-generated UUIDv4 to prevent duplicate orders on double submission',
  })
  async placeOrder(
    @Body() dto: PlaceOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.checkoutService.placeOrder(dto, idempotencyKey);
  }
}
