import { Inject, Injectable } from '@nestjs/common';
import { auditLogs } from '@3s-design/db/schema';
import { DatabaseService } from '../database/database.service';

type AuditPayload = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

@Injectable()
export class AuditService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async record(input: AuditPayload) {
    await this.database
      .requireDb()
      .insert(auditLogs)
      .values({
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
      });
  }
}
