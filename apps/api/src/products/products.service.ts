import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  categories,
  analyticsDailyProductStats,
  licenses,
  productAssets,
  productAttributes,
  productCategories,
  productLicensePrices,
  products,
  productTags,
  productVariants,
  tags,
} from '@3s-design/db/schema';
import { and, asc, desc, eq, ilike, or, sql, SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { designDnaFromAttributes } from './design-dna';
import { BestSellersQueryDto } from './dto/best-sellers-query.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';

@Injectable()
export class ProductsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async list(query: ListProductsQueryDto) {
    const db = this.getDb();
    const filters: SQL[] = [];
    const limit = this.numberInRange(query.limit, 24, 1, 100);
    const offset = this.numberInRange(query.offset, 0, 0, 10000);

    filters.push(eq(products.status, 'published'));

    if (query.q) {
      const term = `%${query.q}%`;
      filters.push(or(ilike(products.title, term), ilike(products.subtitle, term), ilike(products.description, term))!);
    }

    if (query.category) {
      filters.push(eq(categories.slug, query.category));
    }

    if (query.tag) {
      filters.push(eq(tags.slug, query.tag));
    }

    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        subtitle: products.subtitle,
        description: products.description,
        status: products.status,
        basePrice: products.basePrice,
        currency: products.currency,
        isFeatured: products.isFeatured,
        publishedAt: products.publishedAt,
        previewStorageKey: productAssets.storageKey,
        previewAltText: productAssets.altText,
      })
      .from(products)
      .leftJoin(
        productAssets,
        and(
          eq(productAssets.productId, products.id),
          eq(productAssets.assetType, 'watermarked_preview'),
          eq(productAssets.isPrimary, true),
          eq(productAssets.isPublicPreview, true),
        ),
      )
      .leftJoin(productCategories, eq(productCategories.productId, products.id))
      .leftJoin(categories, eq(categories.id, productCategories.categoryId))
      .leftJoin(productTags, eq(productTags.productId, products.id))
      .leftJoin(tags, eq(tags.id, productTags.tagId))
      .where(and(...filters))
      .groupBy(
        products.id,
        products.slug,
        products.title,
        products.subtitle,
        products.description,
        products.status,
        products.basePrice,
        products.currency,
        products.isFeatured,
        products.publishedAt,
        productAssets.storageKey,
        productAssets.altText,
      )
      .orderBy(desc(products.isFeatured), desc(products.publishedAt), asc(products.title))
      .limit(limit)
      .offset(offset);

    return {
      items: await this.attachPublicProductData(rows),
      limit,
      offset,
    };
  }

  async findBySlug(slug: string) {
    const db = this.getDb();

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.status, 'published')))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const [variants, assets, attributes, categoryRows, tagRows] = await Promise.all([
      db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(asc(productVariants.sortOrder), asc(productVariants.name)),
      db
        .select()
        .from(productAssets)
        .where(eq(productAssets.productId, product.id))
        .orderBy(asc(productAssets.sortOrder), asc(productAssets.fileName)),
      db
        .select()
        .from(productAttributes)
        .where(eq(productAttributes.productId, product.id))
        .orderBy(asc(productAttributes.sortOrder), asc(productAttributes.key)),
      db
        .select({
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
        })
        .from(productCategories)
        .innerJoin(categories, eq(categories.id, productCategories.categoryId))
        .where(eq(productCategories.productId, product.id))
        .orderBy(asc(categories.sortOrder), asc(categories.name)),
      db
        .select({
          id: tags.id,
          slug: tags.slug,
          name: tags.name,
        })
        .from(productTags)
        .innerJoin(tags, eq(tags.id, productTags.tagId))
        .where(eq(productTags.productId, product.id))
        .orderBy(asc(tags.name)),
    ]);

    const designDna = designDnaFromAttributes(attributes);
    const preview = assets.find((asset) => asset.assetType === 'watermarked_preview' && asset.isPrimary && asset.isPublicPreview);

    return {
      ...product,
      previewStorageKey: preview?.storageKey ?? null,
      previewAltText: preview?.altText ?? null,
      variants,
      assets,
      attributes,
      categories: categoryRows,
      tags: tagRows,
      designDna,
      ...(await this.getLicenseOptions(product.id)),
    };
  }

  async bestSellers(query: BestSellersQueryDto) {
    const db = this.getDb();
    const limit = this.numberInRange(query.limit, 12, 1, 50);

    const totalPurchases = sql<number>`coalesce(sum(${analyticsDailyProductStats.purchases}), 0)`;
    const totalRevenue = sql<string>`coalesce(sum(${analyticsDailyProductStats.revenue}), 0)`;

    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        subtitle: products.subtitle,
        basePrice: products.basePrice,
        currency: products.currency,
        previewStorageKey: productAssets.storageKey,
        previewAltText: productAssets.altText,
        purchases: totalPurchases,
        revenue: totalRevenue,
      })
      .from(products)
      .innerJoin(analyticsDailyProductStats, eq(analyticsDailyProductStats.productId, products.id))
      .leftJoin(
        productAssets,
        and(
          eq(productAssets.productId, products.id),
          eq(productAssets.assetType, 'watermarked_preview'),
          eq(productAssets.isPrimary, true),
          eq(productAssets.isPublicPreview, true),
        ),
      )
      .where(eq(products.status, 'published'))
      .groupBy(
        products.id,
        products.slug,
        products.title,
        products.subtitle,
        products.basePrice,
        products.currency,
        productAssets.storageKey,
        productAssets.altText,
      )
      .orderBy(desc(totalPurchases), desc(totalRevenue), asc(products.title))
      .limit(limit);

    return {
      items: await this.attachPublicProductData(rows),
      limit,
    };
  }

  private getDb() {
    return this.database.requireDb();
  }

  private numberInRange(value: unknown, fallback: number, min: number, max: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(numeric), min), max);
  }

  private async attachPublicProductData<T extends { id: string }>(rows: T[]) {
    if (!rows.length) {
      return [];
    }

    const [attributes, licenseRows] = await Promise.all([
      this.getDb()
        .select({
          productId: productAttributes.productId,
          key: productAttributes.key,
          value: productAttributes.value,
        })
        .from(productAttributes)
        .where(or(...rows.map((row) => eq(productAttributes.productId, row.id)))!),
      this.getLicenseRows(rows.map((row) => row.id)),
    ]);

    return rows.map((row) => ({
      ...row,
      designDna: designDnaFromAttributes(attributes.filter((attribute) => attribute.productId === row.id)),
      ...this.serializeLicenseOptions(licenseRows.filter((item) => item.productId === row.id)),
    }));
  }

  private async getLicenseOptions(productId: string) {
    return this.serializeLicenseOptions(await this.getLicenseRows([productId]));
  }

  private async getLicenseRows(productIds: string[]) {
    if (!productIds.length) {
      return [];
    }

    return this.getDb()
      .select({
        productId: productLicensePrices.productId,
        price: productLicensePrices.price,
        currency: productLicensePrices.currency,
        license: licenses,
      })
      .from(productLicensePrices)
      .innerJoin(licenses, eq(licenses.id, productLicensePrices.licenseId))
      .where(or(...productIds.map((productId) => eq(productLicensePrices.productId, productId)))!)
      .orderBy(asc(productLicensePrices.price), asc(licenses.name));
  }

  private serializeLicenseOptions(
    rows: Array<{
      price: string;
      currency: string;
      license: typeof licenses.$inferSelect;
    }>,
  ) {
    const licenseOptions = rows.map((row) => ({
      id: row.license.id,
      type: row.license.licenseType,
      name: row.license.name,
      description: row.license.description,
      price: row.price,
      currency: row.currency,
      allowsCommercialUse: row.license.allowsCommercialUse,
      allowsModification: row.license.allowsModification,
      allowsResale: row.license.allowsResale,
    }));
    const defaultLicense =
      licenseOptions.find((license) => license.type === 'full_commercial') ??
      licenseOptions.find((license) => license.allowsCommercialUse) ??
      licenseOptions[0] ??
      null;

    return { licenseOptions, defaultLicense };
  }
}
