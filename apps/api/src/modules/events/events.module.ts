import { Global, Module } from '@nestjs/common';
import { OrdersEventsService } from './orders-events.service';

@Global()
@Module({
  providers: [OrdersEventsService],
  exports: [OrdersEventsService],
})
export class EventsModule {}
