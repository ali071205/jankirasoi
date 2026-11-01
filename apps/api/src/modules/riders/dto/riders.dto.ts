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

export class UpdateDutyStatusDto {
  @ApiProperty({ example: true })
  @IsNotEmpty()
  isAvailable: boolean;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 22.6288, description: 'GPS Latitude' })
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 75.5684, description: 'GPS Longitude' })
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({ example: 45, required: false, description: 'Heading in degrees' })
  heading?: number;

  @ApiProperty({ example: 25, required: false, description: 'Speed in km/h' })
  speed?: number;
}
