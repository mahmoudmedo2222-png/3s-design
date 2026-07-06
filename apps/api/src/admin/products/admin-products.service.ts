import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  categories,
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
import { and, desc, eq, inArray } from 'drizzle-orm';
import { AuditService } from '../../audit/audit.service';
import { DatabaseService } from '../../database/database.service';
import { designDnaFromAttributes, scoreProductQuality } from '../../products/design-dna';
import { isPublicPreviewAssetType } from '../assets/asset-upload-policy';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { CreateProductAssetDto } from './dto/create-product-asset.dto';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { SetProductCategoriesDto } from './dto/set-product-categories.dto';
import { SetProductLicensePricesDto } from './dto/set-product-license-prices.dto';
import { SetProductTagsDto } from './dto/set-product-tags.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';

@Injectable()
export class AdminProductsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list() {
    const db = this.getDb();

    const rows = await db.select().from(products).orderBy(desc(products.updatedAt), desc(products.createdAt));

    return { items: rows };
  }

  async create(input: CreateAdminProductDto, actorUserId?: string) {
    const db = this.getDb();
    const [created] = await db
      .insert(products)
      .values({
        title: input.title,
        slug: input.slug,
        subtitle: input.subtitle,
        description: input.description,
        basePrice: input.basePrice,
        currency: input.currency,
        status: input.status,
        isFeatured: input.isFeatured,
      })
      .returning();

    if (created) {
      await this.recordAudit(actorUserId, 'admin.products.create', 'product', created.id, null, created);
    }

    return created;
  }

  async update(id: string, input: UpdateAdminProductDto, actorUserId?: string) {
    const db = this.getDb();
    const before = await this.getProductOrThrow(id);
    const { status, ...productFields } = input;
    const [updated] = await db
      .update(products)
      .set({
        ...productFields,
        ...(status && status !== 'published' ? { status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    if (status === 'published') {
      return this.publish(id, actorUserId);
    }

    await this.recordAudit(actorUserId, 'admin.products.update', 'product', id, before, updated);

    return updated;
  }

  async getPublishingChecks(productId: string) {
    const db = this.getDb();
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const [licensePrice, watermarkedPreview, deliveryAsset, category, tag, attributes] = await Promise.all([
      db.select({ id: productLicensePrices.id }).from(productLicensePrices).where(eq(productLicensePrices.productId, productId)).limit(1),
      db
        .select({ id: productAssets.id })
        .from(productAssets)
        .where(
          and(
            eq(productAssets.productId, productId),
            eq(productAssets.assetType, 'watermarked_preview'),
            eq(productAssets.isPublicPreview, true),
            eq(productAssets.isPrimary, true),
            eq(productAssets.assetStatus, 'ready'),
            inArray(productAssets.scanStatus, ['passed', 'skipped']),
          ),
        )
        .limit(1),
      db
        .select({ id: productAssets.id })
        .from(productAssets)
        .where(
          and(
            eq(productAssets.productId, productId),
            inArray(productAssets.assetType, ['delivery_zip', 'source_file']),
            eq(productAssets.assetStatus, 'ready'),
            inArray(productAssets.scanStatus, ['passed', 'skipped']),
          ),
        )
        .limit(1),
      db
        .select({ categoryId: productCategories.categoryId })
        .from(productCategories)
        .where(eq(productCategories.productId, productId))
        .limit(1),
      db.select({ tagId: productTags.tagId }).from(productTags).where(eq(productTags.productId, productId)).limit(1),
      db
        .select({ key: productAttributes.key, value: productAttributes.value })
        .from(productAttributes)
        .where(eq(productAttributes.productId, productId)),
    ]);

    const designDna = designDnaFromAttributes(attributes);
    const designDnaReadiness = this.getDesignDnaReadiness(designDna);
    const hasDesignDna = designDnaReadiness.ready;
    const quality = scoreProductQuality({
      title: product.title,
      slug: product.slug,
      description: product.description,
      basePrice: product.basePrice,
      hasLicensePrice: licensePrice.length > 0,
      hasWatermarkedPreview: watermarkedPreview.length > 0,
      hasDeliveryAsset: deliveryAsset.length > 0,
      hasCategory: category.length > 0,
      hasTags: tag.length > 0,
      hasDesignDna,
    });

    const checks = [
      {
        key: 'title',
        passed: product.title.trim().length >= 3,
        message: 'Product title must be at least 3 characters',
      },
      {
        key: 'slug',
        passed: product.slug.trim().length >= 3,
        message: 'Product slug must be at least 3 characters',
      },
      {
        key: 'description',
        passed: product.description.trim().length >= 10,
        message: 'Product description must be at least 10 characters',
      },
      {
        key: 'base_price',
        passed: Number(product.basePrice) > 0,
        message: 'Product base price must be greater than zero',
      },
      {
        key: 'license_price',
        passed: licensePrice.length > 0,
        message: 'At least one license price is required',
      },
      {
        key: 'watermarked_preview',
        passed: watermarkedPreview.length > 0,
        message: 'A ready, safe primary public watermarked preview is required',
      },
      {
        key: 'delivery_asset',
        passed: deliveryAsset.length > 0,
        message: 'At least one ready, safe delivery file is required',
      },
      {
        key: 'category',
        passed: category.length > 0,
        message: 'At least one category is required',
      },
      {
        key: 'tags',
        passed: tag.length > 0,
        message: 'At least one tag is recommended for discovery',
      },
      {
        key: 'design_dna',
        passed: hasDesignDna,
        message: designDnaReadiness.ready
          ? 'Design DNA is ready for smart AI matching'
          : `Design DNA needs ${designDnaReadiness.missing.map((item) => item.label.toLowerCase()).join(', ')}`,
      },
    ];

    const missing = checks.filter((check) => !check.passed);

    return {
      productId,
      canPublish: missing.length === 0,
      checks,
      quality,
      designDna,
      designDnaReadiness,
      missing: missing.map((check) => ({
        key: check.key,
        message: check.message,
      })),
    };
  }

  async publish(productId: string, actorUserId?: string) {
    const before = await this.getProductOrThrow(productId);
    const checks = await this.getPublishingChecks(productId);

    if (!checks.canPublish) {
      throw new BadRequestException({
        message: 'Product is not ready to publish',
        missing: checks.missing,
      });
    }

    const [updated] = await this.getDb()
      .update(products)
      .set({
        status: 'published',
        publishedAt: new Date(),
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (updated) {
      await this.recordAudit(actorUserId, 'admin.products.publish', 'product', productId, before, updated);
    }

    return updated;
  }

  async unpublish(productId: string, actorUserId?: string) {
    const before = await this.getProductOrThrow(productId);

    const [updated] = await this.getDb()
      .update(products)
      .set({
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (updated) {
      await this.recordAudit(actorUserId, 'admin.products.unpublish', 'product', productId, before, updated);
    }

    return updated;
  }

  async createVariant(productId: string, input: CreateProductVariantDto, actorUserId?: string) {
    const db = this.getDb();
    await this.assertProductExists(productId);

    if (input.isDefault) {
      await db.update(productVariants).set({ isDefault: false, updatedAt: new Date() }).where(eq(productVariants.productId, productId));
    }

    const [created] = await db
      .insert(productVariants)
      .values({
        productId,
        name: input.name,
        description: input.description,
        fileFormats: input.fileFormats,
        dimensions: input.dimensions,
        softwareCompatibility: input.softwareCompatibility,
        priceDelta: input.priceDelta,
        isDefault: input.isDefault,
        sortOrder: input.sortOrder,
      })
      .returning();

    if (created) {
      await this.recordAudit(actorUserId, 'admin.products.create_variant', 'product_variant', created.id, null, created);
    }

    return created;
  }

  async createAsset(productId: string, input: CreateProductAssetDto, actorUserId?: string) {
    const db = this.getDb();
    await this.assertProductExists(productId);

    if (input.variantId) {
      await this.assertVariantBelongsToProduct(productId, input.variantId);
    }

    if (input.isPublicPreview && !isPublicPreviewAssetType(input.assetType)) {
      throw new BadRequestException('Only preview assets can be public previews');
    }

    if (input.isPrimary) {
      await db
        .update(productAssets)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(and(eq(productAssets.productId, productId), eq(productAssets.assetType, input.assetType)));
    }

    const [created] = await db
      .insert(productAssets)
      .values({
        productId,
        variantId: input.variantId,
        assetType: input.assetType,
        storageKey: input.storageKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        width: input.width,
        height: input.height,
        checksum: input.checksum,
        assetStatus: input.assetStatus,
        scanStatus: input.scanStatus,
        altText: input.altText,
        sortOrder: input.sortOrder,
        isPrimary: input.isPrimary,
        isPublicPreview: input.isPublicPreview,
      })
      .returning();

    if (created) {
      await this.recordAudit(actorUserId, 'admin.products.create_asset', 'product_asset', created.id, null, created);
    }

    return created;
  }

  async createAttribute(productId: string, input: CreateProductAttributeDto, actorUserId?: string) {
    const db = this.getDb();
    await this.assertProductExists(productId);

    const [created] = await db
      .insert(productAttributes)
      .values({
        productId,
        key: input.key,
        value: input.value,
        label: input.label,
        sortOrder: input.sortOrder,
      })
      .returning();

    if (created) {
      await this.recordAudit(actorUserId, 'admin.products.create_attribute', 'product_attribute', created.id, null, created);
    }

    return created;
  }

  async setCategories(productId: string, input: SetProductCategoriesDto, actorUserId?: string) {
    const db = this.getDb();
    await this.assertProductExists(productId);
    await this.assertCategoriesExist(input.categoryIds);

    await db.transaction(async (tx) => {
      await tx.delete(productCategories).where(eq(productCategories.productId, productId));

      if (input.categoryIds.length) {
        await tx.insert(productCategories).values(
          input.categoryIds.map((categoryId) => ({
            productId,
            categoryId,
          })),
        );
      }
    });

    await this.recordAudit(actorUserId, 'admin.products.set_categories', 'product', productId, null, {
      categoryIds: input.categoryIds,
    });

    return {
      productId,
      categoryIds: input.categoryIds,
    };
  }

  async setTags(productId: string, input: SetProductTagsDto, actorUserId?: string) {
    const db = this.getDb();
    await this.assertProductExists(productId);
    await this.assertTagsExist(input.tagIds);

    await db.transaction(async (tx) => {
      await tx.delete(productTags).where(eq(productTags.productId, productId));

      if (input.tagIds.length) {
        await tx.insert(productTags).values(
          input.tagIds.map((tagId) => ({
            productId,
            tagId,
          })),
        );
      }
    });

    await this.recordAudit(actorUserId, 'admin.products.set_tags', 'product', productId, null, {
      tagIds: input.tagIds,
    });

    return {
      productId,
      tagIds: input.tagIds,
    };
  }

  async setLicensePrices(productId: string, input: SetProductLicensePricesDto, actorUserId?: string) {
    const db = this.getDb();
    await this.assertProductExists(productId);
    await this.assertLicensesExist(input.prices.map((price) => price.licenseId));

    await db.transaction(async (tx) => {
      await tx.delete(productLicensePrices).where(eq(productLicensePrices.productId, productId));

      if (input.prices.length) {
        await tx.insert(productLicensePrices).values(
          input.prices.map((price) => ({
            productId,
            licenseId: price.licenseId,
            price: price.price,
            currency: price.currency,
          })),
        );
      }
    });

    await this.recordAudit(actorUserId, 'admin.products.set_license_prices', 'product', productId, null, { prices: input.prices });

    return {
      productId,
      prices: input.prices,
    };
  }

  private getDb() {
    return this.database.requireDb();
  }

  private getDesignDnaReadiness(designDna: ReturnType<typeof designDnaFromAttributes>) {
    const groups = [
      {
        key: 'industry',
        label: 'Industry',
        values: designDna.industries,
        message: 'Add the business field this design sells best for.',
      },
      {
        key: 'style_or_mood',
        label: 'Style or mood',
        values: [...designDna.styles, ...designDna.moods],
        message: 'Add the emotional direction customers should feel first.',
      },
      {
        key: 'color',
        label: 'Color',
        values: designDna.colors,
        message: 'Add the palette signals used by search and matching.',
      },
      {
        key: 'platform_or_format',
        label: 'Platform or format',
        values: [...designDna.platforms, ...designDna.formats],
        message: 'Add where the design is used: Instagram, web, print, banner, story, or similar.',
      },
    ];
    const missing = groups.filter((group) => group.values.length === 0);
    const completed = groups.length - missing.length;

    return {
      ready: missing.length === 0,
      score: Math.round((completed / groups.length) * 100),
      groups: groups.map((group) => ({
        key: group.key,
        label: group.label,
        passed: group.values.length > 0,
        values: group.values,
        message: group.message,
      })),
      missing: missing.map((group) => ({
        key: group.key,
        label: group.label,
        message: group.message,
      })),
    };
  }

  private async getProductOrThrow(id: string) {
    const [product] = await this.getDb().select().from(products).where(eq(products.id, id)).limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async recordAudit(
    actorUserId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.audit.record({
      actorUserId,
      action,
      entityType,
      entityId,
      before: this.toAuditObject(before),
      after: this.toAuditObject(after),
    });
  }

  private toAuditObject(value: unknown) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }

  private async assertProductExists(id: string) {
    const db = this.getDb();
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async assertVariantBelongsToProduct(productId: string, variantId: string) {
    const [variant] = await this.getDb()
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));

    if (!variant) {
      throw new NotFoundException('Variant not found for this product');
    }
  }

  private async assertCategoriesExist(ids: string[]) {
    if (!ids.length) {
      return;
    }

    const rows = await this.getDb().select({ id: categories.id }).from(categories).where(inArray(categories.id, ids));

    if (rows.length !== ids.length) {
      throw new NotFoundException('One or more categories were not found');
    }
  }

  private async assertTagsExist(ids: string[]) {
    if (!ids.length) {
      return;
    }

    const rows = await this.getDb().select({ id: tags.id }).from(tags).where(inArray(tags.id, ids));

    if (rows.length !== ids.length) {
      throw new NotFoundException('One or more tags were not found');
    }
  }

  private async assertLicensesExist(ids: string[]) {
    if (!ids.length) {
      return;
    }

    const rows = await this.getDb().select({ id: licenses.id }).from(licenses).where(inArray(licenses.id, ids));

    if (rows.length !== ids.length) {
      throw new NotFoundException('One or more licenses were not found');
    }
  }
}
