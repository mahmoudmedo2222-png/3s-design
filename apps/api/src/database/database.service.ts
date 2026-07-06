import { Inject, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@3s-design/db/schema';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool?: pg.Pool;
  readonly db?: NodePgDatabase<typeof schema>;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');

    if (!connectionString) {
      return;
    }

    this.pool = new pg.Pool({ connectionString });
    this.db = drizzle(this.pool, { schema });
  }

  get isConfigured() {
    return Boolean(this.pool && this.db);
  }

  requireDb() {
    if (!this.db) {
      throw new ServiceUnavailableException('Database is not configured');
    }

    return this.db;
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
