import { Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser, RequestWithUser } from '../auth/auth.types';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { DownloadsService } from './downloads.service';

@Controller('downloads')
@UseGuards(JwtAuthGuard)
export class DownloadsController {
  constructor(
    @Inject(DownloadsService) private readonly downloads: DownloadsService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.downloads.listEntitlements(user.id);
  }

  @Post(':entitlementId/assets/:assetId/url')
  async createUrl(
    @CurrentUser() user: AuthUser,
    @Param('entitlementId') entitlementId: string,
    @Param('assetId') assetId: string,
    @Req() request: RequestWithUser,
  ) {
    await this.rateLimit.assertAllowed({
      key: `user:${user.id}:ip:${this.getIpAddress(request) ?? 'unknown'}`,
      action: 'downloads.signed_url',
      limit: this.numberConfig('DOWNLOAD_URL_RATE_LIMIT_MAX', 20),
      windowMs: this.numberConfig('DOWNLOAD_URL_RATE_LIMIT_WINDOW_SECONDS', 60) * 1000,
      userId: user.id,
    });

    return this.downloads.createDownloadUrl(user.id, entitlementId, assetId, {
      ipAddress: this.getIpAddress(request),
      userAgent: this.getHeader(request, 'user-agent'),
    });
  }

  private getIpAddress(request: RequestWithUser) {
    const forwardedFor = this.getHeader(request, 'x-forwarded-for');
    const forwardedIp = forwardedFor?.split(',')[0]?.trim();
    return forwardedIp || this.getHeader(request, 'x-real-ip')?.trim() || request.ip;
  }

  private getHeader(request: RequestWithUser, name: string) {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }

  private numberConfig(name: string, fallback: number) {
    const value = Number(this.config.get<string>(name) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  }
}
