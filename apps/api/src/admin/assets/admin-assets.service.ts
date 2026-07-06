import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { productVariants, products } from '@3s-design/db/schema';
import { and, eq } from 'drizzle-orm';
import { AuditService } from '../../audit/audit.service';
import { DatabaseService } from '../../database/database.service';
import { R2StorageService } from '../../storage/r2-storage.service';
import { isPublicPreviewAssetType, isUploadAssetType, uploadPolicy } from './asset-upload-policy';
import { CreateAssetUploadUrlDto } from './dto/create-asset-upload-url.dto';

@Injectable()
export class AdminAssetsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(R2StorageService) private readonly storage: R2StorageService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async createUploadUrl(input: CreateAssetUploadUrlDto, actorUserId?: string) {
    await this.assertProductExists(input.productId);

    if (input.variantId) {
      await this.assertVariantBelongsToProduct(input.productId, input.variantId);
    }

    const policy = this.getPolicy(input.assetType);
    const extension = this.getSafeExtension(input.fileName, policy.extensions);

    if (!policy.mimeTypes.includes(input.mimeType)) {
      throw new BadRequestException('Unsupported mime type for this asset type');
    }

    if (input.fileSize > policy.maxBytes) {
      throw new BadRequestException('File is larger than the allowed limit');
    }

    if (this.config.get<string>('R2_REQUIRE_UPLOAD_CHECKSUM') === 'true' && !input.checksum) {
      throw new BadRequestException('Checksum is required for upload URLs');
    }

    if (input.checksum && !/^[a-z0-9:_-]{16,128}$/i.test(input.checksum)) {
      throw new BadRequestException('Checksum format is invalid');
    }

    const storageKey = ['products', input.productId, policy.folder, `${randomUUID()}${extension}`].join('/');

    const signed = await this.storage.createSignedPutUrl({
      storageKey,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
    });

    const result = {
      storageKey,
      suggestedAssetStatus: 'uploaded',
      suggestedScanStatus: 'pending',
      ...signed,
      checksum: input.checksum,
      publicUrl: isPublicPreviewAssetType(input.assetType) ? this.storage.getPublicUrl(storageKey) : undefined,
    };

    await this.audit.record({
      actorUserId,
      action: 'admin.assets.create_upload_url',
      entityType: 'product',
      entityId: input.productId,
      after: {
        productId: input.productId,
        variantId: input.variantId ?? null,
        assetType: input.assetType,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        checksum: input.checksum ?? null,
        storageKey,
      },
    });

    return result;
  }

  private getPolicy(assetType: string) {
    if (!isUploadAssetType(assetType)) {
      throw new BadRequestException('Unsupported asset type');
    }

    return uploadPolicy[assetType];
  }

  private getSafeExtension(fileName: string, allowedExtensions: readonly string[]) {
    const extension = extname(fileName.trim().toLowerCase());

    if (!extension || !allowedExtensions.includes(extension)) {
      throw new BadRequestException('Unsupported file extension for this asset type');
    }

    return extension;
  }

  private async assertProductExists(productId: string) {
    const db = this.database.requireDb();
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async assertVariantBelongsToProduct(productId: string, variantId: string) {
    const db = this.database.requireDb();
    const [variant] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));

    if (!variant) {
      throw new NotFoundException('Variant not found for this product');
    }
  }
}
