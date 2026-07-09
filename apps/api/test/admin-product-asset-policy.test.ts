import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminProductsService } from '../src/admin/products/admin-products.service';
import type { CreateProductAssetDto } from '../src/admin/products/dto/create-product-asset.dto';

function createService() {
  const db = {
    select: () => ({
      from: () => ({
        where: async () => [{ id: 'product-1' }],
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => undefined,
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: async () => [
          {
            id: 'asset-1',
            productId: 'product-1',
          },
        ],
      }),
    }),
  };

  return new AdminProductsService(
    { requireDb: () => db } as never,
    {
      record: async () => undefined,
    } as never,
  );
}

function validDeliveryAsset(overrides: Partial<CreateProductAssetDto> = {}): CreateProductAssetDto {
  return {
    assetType: 'delivery_zip',
    storageKey: 'products/product-1/deliveries/source.zip',
    fileName: 'source.zip',
    mimeType: 'application/zip',
    fileSize: 1024,
    assetStatus: 'ready',
    scanStatus: 'skipped',
    sortOrder: 0,
    isPrimary: true,
    isPublicPreview: false,
    ...overrides,
  };
}

void test('admin product assets: metadata must match upload policy before insert', async () => {
  const service = createService();

  await assert.rejects(
    () => service.createAsset('product-1', validDeliveryAsset({ fileName: 'source.png', mimeType: 'image/png' }), 'admin-1'),
    /Asset file extension does not match its asset type/,
  );

  await assert.rejects(
    () => service.createAsset('product-1', validDeliveryAsset({ storageKey: 'products/product-1/previews/source.zip' }), 'admin-1'),
    /Asset storage key does not match its asset type/,
  );
});
