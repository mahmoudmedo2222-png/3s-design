import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { R2StorageService } from '../storage/r2-storage.service';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DownloadsController],
  providers: [DownloadsService, R2StorageService],
  exports: [DownloadsService],
})
export class DownloadsModule {}
