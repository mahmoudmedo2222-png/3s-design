import { Inject, Injectable } from '@nestjs/common';
import { categories, licenses, tags } from '@3s-design/db/schema';
import { asc } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateLicenseDto } from './dto/create-license.dto';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class AdminCatalogService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listCategories() {
    const rows = await this.database.requireDb().select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));

    return { items: rows };
  }

  async createCategory(input: CreateCategoryDto) {
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

    return created;
  }

  async listTags() {
    const rows = await this.database.requireDb().select().from(tags).orderBy(asc(tags.name));

    return { items: rows };
  }

  async createTag(input: CreateTagDto) {
    const [created] = await this.database
      .requireDb()
      .insert(tags)
      .values({
        slug: input.slug,
        name: input.name,
      })
      .returning();

    return created;
  }

  async listLicenses() {
    const rows = await this.database.requireDb().select().from(licenses).orderBy(asc(licenses.name));

    return { items: rows };
  }

  async createLicense(input: CreateLicenseDto) {
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

    return created;
  }
}
