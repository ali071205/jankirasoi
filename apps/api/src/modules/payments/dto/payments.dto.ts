import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'ord_918237190' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'order_NXK92kd81ks9' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_NXK98al91ka' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({ example: '9ef8a17684bc871239de981a8b6c5432...' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}

export class RefundOrderDto {
  @ApiProperty({ example: 42090, description: 'Amount in paise' })
  @IsInt()
  @Min(100)
  amountPaise: number;

  @ApiProperty({ example: 'Customer cancelled before food was prepared.' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
