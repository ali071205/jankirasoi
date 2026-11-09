import { Module } from '@nestjs/common';
import { RidersService } from './riders.service';
import { DeliveryOtpService } from './delivery-otp.service';
import { RidersController } from './riders.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [RidersController],
  providers: [RidersService, DeliveryOtpService],
  exports: [RidersService, DeliveryOtpService],
})
export class RidersModule {}
