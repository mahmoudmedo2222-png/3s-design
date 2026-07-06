import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AiDiscoveryController } from './ai-discovery.controller';
import { AiDiscoveryService } from './ai-discovery.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AiDiscoveryController],
  providers: [AiDiscoveryService],
})
export class AiDiscoveryModule {}
