import { IsString, IsNotEmpty, IsEmail, MinLength, IsOptional } from 'class-validator';
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
