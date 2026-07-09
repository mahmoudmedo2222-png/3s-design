import { Module } from '@nestjs/common';
import { PaymentReadinessService } from '../payments/payment-readiness.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [PaymentReadinessService],
})
export class HealthModule {}
