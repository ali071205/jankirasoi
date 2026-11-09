import { IsString, IsNotEmpty, IsEmail, MinLength, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@jankirasoi.in' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'AdminStrongSecret123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

export class RiderLoginDto {
  @ApiProperty({ example: '9811223344' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'RiderSecretPass123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CustomerLoginDto {
  @ApiProperty({ example: '9876543210', description: '10-digit Indian Mobile Number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Rahul Sharma', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  address?: any;
}

export class CreateRiderDto {
  @ApiProperty({ example: 'Delivery Rider' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '987654321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '200720', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'MP-09-JR-2026', required: false })
  @IsString()
  @IsOptional()
  vehicleNumber?: string;
}

export class ToggleRiderAvailabilityDto {
  @ApiProperty({ example: true })
  @IsNotEmpty()
  isAvailable: boolean;
}

export class BanCustomerDto {
  @ApiProperty({ example: 'Customer unreachable / fake order / refused COD', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 25000, required: false, description: 'Loss or penalty amount in paise' })
  @IsNumber()
  @IsOptional()
  penaltyAmountPaise?: number;
}

export class PayUnbanPenaltyDto {
  @ApiProperty({ example: '8319618102', description: '10-digit customer phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'UPI', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ example: 'TXN_UNBAN_123456', required: false })
  @IsString()
  @IsOptional()
  transactionRef?: string;
}

