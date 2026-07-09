import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { rateLimitEvents } from '@3s-design/db/schema';
import { and, eq, gt, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';

type RateLimitInput = {
  key: string;
  action: string;
  limit: number;
  windowMs: number;
  userId?: string;
};

@Injectable()
export class RateLimitService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async assertAllowed(input: RateLimitInput) {
    if (input.limit <= 0 || input.windowMs <= 0) {
      return;
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - input.windowMs);
    const windowEnd = new Date(now.getTime() + input.windowMs);
    const db = this.database.requireDb();

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${input.action}:${input.key}`}))`);

      const [usage] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(rateLimitEvents)
        .where(
          and(eq(rateLimitEvents.key, input.key), eq(rateLimitEvents.action, input.action), gt(rateLimitEvents.windowEnd, windowStart)),
        );

      if ((usage?.count ?? 0) >= input.limit) {
        throw new HttpException('Too many requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }

      await tx.insert(rateLimitEvents).values({
        userId: input.userId,
        key: input.key,
        action: input.action,
        count: 1,
        windowStart,
        windowEnd,
      });
    });
  }
}
