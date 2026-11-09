import { Module } from '@nestjs/common';
import { DeliveryZonesService } from './delivery-zones.service';
import { DeliveryZonesController } from './delivery-zones.controller';
import { OlaMapsService } from './ola-maps.service';

@Module({
  controllers: [DeliveryZonesController],
  providers: [DeliveryZonesService, OlaMapsService],
  exports: [DeliveryZonesService, OlaMapsService],
})
export class DeliveryZonesModule {}

