import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
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
