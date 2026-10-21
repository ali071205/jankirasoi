import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: 'PREPARING' })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Kitchen started preparation' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class AssignRiderDto {
  @ApiProperty({ example: 'rider_01k8a' })
  @IsString()
  @IsNotEmpty()
  riderId: string;
}

export class OverrideDeliveryDto {
  @ApiProperty({ example: 'Customer verified receipt via call; carrier SMS outage' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
