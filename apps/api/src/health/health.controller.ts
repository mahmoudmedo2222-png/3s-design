import { Controller, Get, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get()
  health() {
    return {
      ok: true,
      service: 'api',
      databaseConfigured: this.database.isConfigured,
    };
  }
}
