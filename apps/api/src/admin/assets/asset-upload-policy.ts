export const allowedAssetTypes = ['preview', 'watermarked_preview', 'delivery_zip', 'source_file'] as const;

export type UploadAssetType = (typeof allowedAssetTypes)[number];

export const publicPreviewAssetTypes = ['preview', 'watermarked_preview'] as const;

const imageMimes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const zipMimes = ['application/zip', 'application/x-zip-compressed'] as const;

export const uploadPolicy: Record<
  UploadAssetType,
  { maxBytes: number; mimeTypes: readonly string[]; extensions: readonly string[]; folder: string }
> = {
  preview: {
    maxBytes: 25 * 1024 * 1024,
    mimeTypes: imageMimes,
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    folder: 'previews',
  },
  watermarked_preview: {
    maxBytes: 25 * 1024 * 1024,
    mimeTypes: imageMimes,
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    folder: 'watermarked-previews',
  },
  delivery_zip: {
    maxBytes: 2 * 1024 * 1024 * 1024,
    mimeTypes: zipMimes,
    extensions: ['.zip'],
    folder: 'deliveries',
  },
  source_file: {
    maxBytes: 2 * 1024 * 1024 * 1024,
    mimeTypes: [...zipMimes, 'application/pdf', 'image/svg+xml', 'application/postscript', 'application/octet-stream'],
    extensions: ['.zip', '.pdf', '.svg', '.ai', '.psd', '.eps'],
    folder: 'sources',
  },
};

export function isUploadAssetType(value: string): value is UploadAssetType {
  return allowedAssetTypes.includes(value as UploadAssetType);
}

export function isPublicPreviewAssetType(value: string) {
  return publicPreviewAssetTypes.includes(value as (typeof publicPreviewAssetTypes)[number]);
}
