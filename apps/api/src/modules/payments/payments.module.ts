import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, WebhooksController, AdminPaymentsController } from './payments.controller';

@Module({
  controllers: [PaymentsController, WebhooksController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
