import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  downloadEvents,
  downloadLimitOverrides,
  entitlements,
  licenses,
  orderItems,
  orders,
  productAssets,
  products,
} from '@3s-design/db/schema';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { R2StorageService } from '../storage/r2-storage.service';

const maxDownloadsPerHour = 3;
const downloadableAssetTypes = ['delivery_zip', 'source_file'] as const;

type DownloadRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class DownloadsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(R2StorageService) private readonly storage: R2StorageService,
  ) {}

  async listEntitlements(userId: string) {
    const db = this.database.requireDb();
    const rows = await db
      .select({
        entitlement: entitlements,
        product: {
          id: products.id,
          slug: products.slug,
          title: products.title,
          subtitle: products.subtitle,
        },
        license: {
          id: licenses.id,
          type: licenses.licenseType,
          name: licenses.name,
        },
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          paidAt: orders.paidAt,
        },
      })
      .from(entitlements)
      .innerJoin(products, eq(products.id, entitlements.productId))
      .innerJoin(licenses, eq(licenses.id, entitlements.licenseId))
      .innerJoin(orders, eq(orders.id, entitlements.orderId))
      .where(eq(entitlements.userId, userId))
      .orderBy(desc(entitlements.createdAt));

    const items = await Promise.all(
      rows.map(async (row) => {
        const extraDownloads = await this.getOverrideDownloads(row.entitlement.id);
        const maxDownloads = row.entitlement.maxDownloads + extraDownloads;
        const hourlyUsed = await this.countDownloadsInLastHour(row.entitlement.id);
        const assets = await this.listDownloadableAssets(row.entitlement.productId, row.entitlement.variantId);

        return {
          id: row.entitlement.id,
          product: row.product,
          license: row.license,
          order: row.order,
          isActive: row.entitlement.isActive,
          expiresAt: row.entitlement.expiresAt,
          maxDownloads,
          downloadsUsed: row.entitlement.downloadsUsed,
          downloadsRemaining: Math.max(maxDownloads - row.entitlement.downloadsUsed, 0),
          hourlyDownloadsRemaining: Math.max(maxDownloadsPerHour - hourlyUsed, 0),
          assets,
        };
      }),
    );

    return { items };
  }

  async createDownloadUrl(userId: string, entitlementId: string, assetId: string, meta: DownloadRequestMeta) {
    const db = this.database.requireDb();

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`download:${entitlementId}`}))`);

      const [row] = await tx
        .select({
          entitlement: entitlements,
          asset: productAssets,
        })
        .from(entitlements)
        .innerJoin(productAssets, eq(productAssets.id, assetId))
        .where(and(eq(entitlements.id, entitlementId), eq(entitlements.userId, userId)))
        .limit(1);

      if (!row) {
        throw new NotFoundException('Download entitlement or asset not found');
      }

      const entitlement = row.entitlement;
      const asset = row.asset;

      if (!entitlement.isActive) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'inactive', meta);
        throw new ForbiddenException('Download entitlement is inactive');
      }

      if (entitlement.expiresAt && entitlement.expiresAt.getTime() <= Date.now()) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'expired', meta);
        throw new ForbiddenException('Download entitlement has expired');
      }

      if (asset.productId !== entitlement.productId) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'asset_product_mismatch', meta);
        throw new ForbiddenException('Asset does not belong to this entitlement');
      }

      if (asset.variantId && asset.variantId !== entitlement.variantId) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'asset_variant_mismatch', meta);
        throw new ForbiddenException('Asset variant does not belong to this entitlement');
      }

      if (!downloadableAssetTypes.includes(asset.assetType as (typeof downloadableAssetTypes)[number])) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'not_downloadable_asset', meta);
        throw new BadRequestException('Asset is not downloadable');
      }

      if (asset.assetStatus !== 'ready' || !['passed', 'skipped'].includes(asset.scanStatus)) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'asset_not_ready_or_safe', meta);
        throw new ForbiddenException('Asset is not ready for download');
      }

      const extraDownloads = await this.getOverrideDownloads(entitlement.id, tx);
      const maxDownloads = entitlement.maxDownloads + extraDownloads;

      if (entitlement.downloadsUsed >= maxDownloads) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'total_limit_exceeded', meta);
        throw new ForbiddenException('Download limit reached');
      }

      const hourlyUsed = await this.countDownloadsInLastHour(entitlement.id, tx);
      if (hourlyUsed >= maxDownloadsPerHour) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'hourly_limit_exceeded', meta);
        throw new ForbiddenException('Hourly download limit reached');
      }

      const [updatedEntitlement] = await tx
        .update(entitlements)
        .set({
          downloadsUsed: sql`${entitlements.downloadsUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(entitlements.id, entitlement.id), sql`${entitlements.downloadsUsed} < ${maxDownloads}`))
        .returning({ downloadsUsed: entitlements.downloadsUsed });

      if (!updatedEntitlement) {
        await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'denied', 'total_limit_exceeded', meta);
        throw new ForbiddenException('Download limit reached');
      }

      await this.recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'allowed', undefined, meta);

      return {
        asset,
        maxDownloads,
        downloadsUsed: updatedEntitlement.downloadsUsed,
        hourlyUsed: hourlyUsed + 1,
      };
    });

    const signed = await this.storage.createSignedGetUrl(result.asset.storageKey);

    return {
      assetId: result.asset.id,
      fileName: result.asset.fileName,
      mimeType: result.asset.mimeType,
      fileSize: result.asset.fileSize,
      ...signed,
      downloadsRemaining: Math.max(result.maxDownloads - result.downloadsUsed, 0),
      hourlyDownloadsRemaining: Math.max(maxDownloadsPerHour - result.hourlyUsed, 0),
    };
  }

  async grantEntitlementsForPaidOrder(orderId: string, executor = this.database.requireDb()) {
    const [order] = await executor.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order || order.status !== 'paid') {
      throw new BadRequestException('Order must be paid before granting entitlements');
    }

    const items = await executor.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    let granted = 0;

    for (const item of items) {
      const [existing] = await executor
        .select({ id: entitlements.id })
        .from(entitlements)
        .where(eq(entitlements.orderItemId, item.id))
        .limit(1);

      if (existing) {
        continue;
      }

      const [created] = await executor
        .insert(entitlements)
        .values({
          userId: order.userId,
          orderId: order.id,
          orderItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          licenseId: item.licenseId,
          maxDownloads: 5,
        })
        .onConflictDoNothing({
          target: entitlements.orderItemId,
        })
        .returning({ id: entitlements.id });

      if (created) {
        granted += 1;
      }
    }

    return { granted };
  }

  private async getOverrideDownloads(entitlementId: string, executor = this.database.requireDb()) {
    const [row] = await executor
      .select({
        total: sql<number>`coalesce(sum(${downloadLimitOverrides.addedDownloads}), 0)`,
      })
      .from(downloadLimitOverrides)
      .where(eq(downloadLimitOverrides.entitlementId, entitlementId));

    return Number(row?.total ?? 0);
  }

  private async countDownloadsInLastHour(entitlementId: string, executor = this.database.requireDb()) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [row] = await executor
      .select({ total: count() })
      .from(downloadEvents)
      .where(
        and(
          eq(downloadEvents.entitlementId, entitlementId),
          eq(downloadEvents.status, 'allowed'),
          gte(downloadEvents.createdAt, oneHourAgo),
        ),
      );

    return Number(row?.total ?? 0);
  }

  private async listDownloadableAssets(productId: string, variantId: string | null, executor = this.database.requireDb()) {
    const rows = await executor
      .select({
        id: productAssets.id,
        assetType: productAssets.assetType,
        fileName: productAssets.fileName,
        mimeType: productAssets.mimeType,
        fileSize: productAssets.fileSize,
        variantId: productAssets.variantId,
        sortOrder: productAssets.sortOrder,
      })
      .from(productAssets)
      .where(
        and(
          eq(productAssets.productId, productId),
          sql`${productAssets.assetType} in ('delivery_zip', 'source_file')`,
          eq(productAssets.assetStatus, 'ready'),
          sql`${productAssets.scanStatus} in ('passed', 'skipped')`,
          variantId
            ? sql`(${productAssets.variantId} is null or ${productAssets.variantId} = ${variantId})`
            : sql`${productAssets.variantId} is null`,
        ),
      )
      .orderBy(productAssets.sortOrder);

    return rows;
  }

  private async recordDownloadEvent(
    executor: ReturnType<DatabaseService['requireDb']>,
    entitlementId: string,
    userId: string,
    assetId: string,
    status: 'allowed' | 'denied',
    reason: string | undefined,
    meta: DownloadRequestMeta,
  ) {
    await executor.insert(downloadEvents).values({
      entitlementId,
      userId,
      productAssetId: assetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      status,
      reason,
    });
  }
}
