import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { AdminRefundsController } from './admin-refunds.controller';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule],
  controllers: [RefundsController, AdminRefundsController],
  providers: [RefundsService],
})
export class RefundsModule {}
