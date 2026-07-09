import { Inject, Injectable } from '@nestjs/common';
import { userProfiles } from '@3s-design/db/schema';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { BuyerProfileDto } from './buyer-profile.dto';

type BuyerProfileSnapshot = NonNullable<typeof userProfiles.$inferSelect.buyerProfile>;

@Injectable()
export class CustomerProfileService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async getProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return { buyerProfile: profile.buyerProfile ?? {} };
  }

  async updateBuyerProfile(userId: string, input: BuyerProfileDto) {
    const db = this.database.requireDb();
    const buyerProfile = this.sanitizeBuyerProfile(input);
    const now = new Date();

    const [updated] = await db
      .insert(userProfiles)
      .values({
        userId,
        buyerProfile,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          buyerProfile,
          updatedAt: now,
        },
      })
      .returning();

    return { buyerProfile: updated?.buyerProfile ?? buyerProfile };
  }

  private async getOrCreateProfile(userId: string) {
    const db = this.database.requireDb();
    const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db.insert(userProfiles).values({ userId }).returning();
    return created ?? { userId, buyerProfile: {} };
  }

  private sanitizeBuyerProfile(input: BuyerProfileDto): BuyerProfileSnapshot {
    return {
      signature: this.cleanText(input.signature, 180) ?? 'quiet luxury direction',
      colors: this.cleanList(input.colors, 10, 80),
      styles: this.cleanList(input.styles, 10, 80),
      moods: this.cleanList(input.moods, 10, 80),
      useCases: this.cleanList(input.useCases, 10, 80),
      confidence: input.confidence ?? 'fresh',
      stage: input.stage ?? 'new',
      nextAction: this.cleanText(input.nextAction, 220) ?? 'Start with a buyer moment or save two designs.',
      reasons: this.cleanList(input.reasons, 8, 120),
      terms: this.cleanList(input.terms, 16, 80),
      prompt: this.cleanText(input.prompt, 280) ?? '',
      eventCount: Math.max(0, Math.min(Number(input.eventCount ?? 0), 1000)),
      syncedAt: new Date().toISOString(),
    };
  }

  private cleanList(values: string[] | undefined, maxItems: number, maxLength: number) {
    const cleaned = (values ?? []).map((value) => this.cleanText(value, maxLength)).filter((value): value is string => Boolean(value));

    return [...new Set(cleaned)].slice(0, maxItems);
  }

  private cleanText(value: string | null | undefined, maxLength: number) {
    const text = value?.replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, maxLength) : null;
  }
}
