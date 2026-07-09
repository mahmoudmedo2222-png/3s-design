import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { DownloadsModule } from '../downloads/downloads.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule, DownloadsModule, RateLimitModule],
  controllers: [PaymentsController, AdminPaymentsController, PaymentWebhooksController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
