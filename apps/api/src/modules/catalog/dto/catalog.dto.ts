import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DietaryTypeDto {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
  JAIN = 'JAIN',
  VEGAN = 'VEGAN',
}

export class CreateProductDto {
  @ApiProperty({ example: 'cat_01j9a' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Special Dal Makhani Thali' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DietaryTypeDto, default: DietaryTypeDto.VEG })
  @IsEnum(DietaryTypeDto)
  dietaryType: DietaryTypeDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'Base price in integer paise (e.g. 14900 = ₹149.00)', example: 14900 })
  @IsInt()
  @Min(0)
  basePricePaise: number;

  @ApiPropertyOptional({ default: 5 })
  @IsInt()
  @IsOptional()
  taxRatePercent?: number;
}

export class ToggleSoldOutDto {
  @ApiProperty({ example: '2026-10-22' })
  @IsString()
  @IsNotEmpty()
  serviceDate: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isSoldOut: boolean;
}
