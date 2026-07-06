import { Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser, RequestWithUser } from '../auth/auth.types';
import { DownloadsService } from './downloads.service';

@Controller('downloads')
@UseGuards(JwtAuthGuard)
export class DownloadsController {
  constructor(@Inject(DownloadsService) private readonly downloads: DownloadsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.downloads.listEntitlements(user.id);
  }

  @Post(':entitlementId/assets/:assetId/url')
  createUrl(
    @CurrentUser() user: AuthUser,
    @Param('entitlementId') entitlementId: string,
    @Param('assetId') assetId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.downloads.createDownloadUrl(user.id, entitlementId, assetId, {
      ipAddress: this.getIpAddress(request),
      userAgent: this.getHeader(request, 'user-agent'),
    });
  }

  private getIpAddress(request: RequestWithUser) {
    const forwardedFor = this.getHeader(request, 'x-forwarded-for');
    return forwardedFor?.split(',')[0]?.trim();
  }

  private getHeader(request: RequestWithUser, name: string) {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
