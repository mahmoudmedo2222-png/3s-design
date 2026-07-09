import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicPreviewAssetType, isUploadAssetType, uploadPolicy } from '../src/admin/assets/asset-upload-policy';

void test('admin asset policy: recognizes supported upload asset types', () => {
  assert.equal(isUploadAssetType('preview'), true);
  assert.equal(isUploadAssetType('watermarked_preview'), true);
  assert.equal(isUploadAssetType('delivery_zip'), true);
  assert.equal(isUploadAssetType('source_file'), true);
  assert.equal(isUploadAssetType('executable'), false);
});

void test('admin asset policy: public previews and delivery files have separate rules', () => {
  assert.equal(isPublicPreviewAssetType('preview'), true);
  assert.equal(isPublicPreviewAssetType('watermarked_preview'), true);
  assert.equal(isPublicPreviewAssetType('delivery_zip'), false);
  assert.equal(uploadPolicy.delivery_zip.mimeTypes.includes('application/zip'), true);
  assert.equal(uploadPolicy.delivery_zip.mimeTypes.includes('image/png'), false);
  assert.equal(uploadPolicy.preview.mimeTypes.includes('image/png'), true);
});
