import { Inject, Injectable } from '@nestjs/common';
import { categories, licenses, tags } from '@3s-design/db/schema';
import { asc } from 'drizzle-orm';
import { AuditService } from '../../audit/audit.service';
import { DatabaseService } from '../../database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateLicenseDto } from './dto/create-license.dto';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class AdminCatalogService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async listCategories() {
    const rows = await this.database.requireDb().select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));

    return { items: rows };
  }

  async createCategory(input: CreateCategoryDto, actorUserId?: string) {
    const [created] = await this.database
      .requireDb()
      .insert(categories)
      .values({
        parentId: input.parentId,
        slug: input.slug,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
      })
      .returning();

    if (created) {
      await this.recordAudit(actorUserId, 'admin.catalog.create_category', 'category', created.id, created);
    }

    return created;
  }

  async listTags() {
    const rows = await this.database.requireDb().select().from(tags).orderBy(asc(tags.name));

    return { items: rows };
  }

  async createTag(input: CreateTagDto, actorUserId?: string) {
    const [created] = await this.database
      .requireDb()
      .insert(tags)
      .values({
        slug: input.slug,
        name: input.name,
      })
      .returning();

    if (created) {
      await this.recordAudit(actorUserId, 'admin.catalog.create_tag', 'tag', created.id, created);
    }

    return created;
  }

  async listLicenses() {
    const rows = await this.database.requireDb().select().from(licenses).orderBy(asc(licenses.name));

    return { items: rows };
  }

  async createLicense(input: CreateLicenseDto, actorUserId?: string) {
    const [created] = await this.database
      .requireDb()
      .insert(licenses)
      .values({
        licenseType: input.licenseType,
        name: input.name,
        description: input.description,
        priceMultiplier: input.priceMultiplier,
        allowsCommercialUse: input.allowsCommercialUse,
        allowsResale: input.allowsResale,
        allowsModification: input.allowsModification,
        termsMarkdown: input.termsMarkdown,
      })
      .returning();

    if (created) {
      await this.recordAudit(actorUserId, 'admin.catalog.create_license', 'license', created.id, created);
    }

    return created;
  }

  private async recordAudit(actorUserId: string | undefined, action: string, entityType: string, entityId: string, after: unknown) {
    await this.audit.record({
      actorUserId,
      action,
      entityType,
      entityId,
      after: this.toAuditObject(after),
    });
  }

  private toAuditObject(value: unknown) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }
}
