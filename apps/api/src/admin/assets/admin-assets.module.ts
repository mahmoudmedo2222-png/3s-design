import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { R2StorageService } from '../../storage/r2-storage.service';
import { AdminAssetsController } from './admin-assets.controller';
import { AdminAssetsService } from './admin-assets.service';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule],
  controllers: [AdminAssetsController],
  providers: [AdminAssetsService, R2StorageService],
})
export class AdminAssetsModule {}
