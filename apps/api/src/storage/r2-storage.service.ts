import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SignedPutInput = {
  storageKey: string;
  mimeType: string;
  fileSize: number;
};

@Injectable()
export class R2StorageService {
  private readonly client?: S3Client;
  private readonly bucketName?: string;
  private readonly publicBaseUrl?: string;
  private readonly isProduction: boolean;
  private readonly uploadTtlSeconds: number;
  private readonly downloadTtlSeconds: number;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = config.get<string>('R2_BUCKET_NAME');
    this.publicBaseUrl = config.get<string>('R2_PUBLIC_BASE_URL')?.replace(/\/+$/, '');
    this.isProduction = config.get<string>('NODE_ENV', 'development') === 'production';
    this.uploadTtlSeconds = Math.min(Math.max(Number(config.get<string>('R2_SIGNED_UPLOAD_TTL_SECONDS') ?? 300), 60), 900);
    this.downloadTtlSeconds = Math.min(Math.max(Number(config.get<string>('R2_SIGNED_DOWNLOAD_TTL_SECONDS') ?? 300), 60), 900);

    if (accountId && accessKeyId && secretAccessKey && this.bucketName) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  async createSignedPutUrl(input: SignedPutInput) {
    if (!this.client || !this.bucketName) {
      throw new ServiceUnavailableException('R2 storage is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: input.storageKey,
      ContentLength: input.fileSize,
      ContentType: input.mimeType,
    });

    return {
      uploadUrl: await getSignedUrl(this.client, command, { expiresIn: this.uploadTtlSeconds }),
      expiresIn: this.uploadTtlSeconds,
      method: 'PUT' as const,
      headers: {
        'content-type': input.mimeType,
      },
    };
  }

  async createSignedGetUrl(storageKey: string) {
    if (!this.client || !this.bucketName) {
      if (!this.isProduction) {
        return {
          downloadUrl: this.createDevDownloadUrl(storageKey),
          expiresIn: this.downloadTtlSeconds,
          method: 'GET' as const,
        };
      }

      throw new ServiceUnavailableException('R2 storage is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    return {
      downloadUrl: await getSignedUrl(this.client, command, { expiresIn: this.downloadTtlSeconds }),
      expiresIn: this.downloadTtlSeconds,
      method: 'GET' as const,
    };
  }

  getPublicUrl(storageKey: string) {
    if (!this.publicBaseUrl) {
      return undefined;
    }

    return `${this.publicBaseUrl}/${storageKey}`;
  }

  private createDevDownloadUrl(storageKey: string) {
    const baseUrl = this.publicBaseUrl ?? 'http://localhost:4000/dev-storage';
    const encodedPath = storageKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    return `${baseUrl}/${encodedPath}?devSigned=1`;
  }
}
