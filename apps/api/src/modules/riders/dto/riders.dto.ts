import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '583921', description: '6-digit verbal OTP from customer' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  code: string;
}

export class DeliveryExceptionDto {
  @ApiProperty({ example: 'CUSTOMER_UNREACHABLE' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 'Called 3 times, door locked' })
  @IsString()
  @IsNotEmpty()
  notes: string;
}
