import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';

type AnalyticsRequest = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Controller('analytics')
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post('events')
  async track(@Body() body: TrackEventDto, @Req() request: AnalyticsRequest) {
    const authorization = headerValue(request.headers.authorization);
    const userAgent = headerValue(request.headers['user-agent']);
    const ipAddress = getIpAddress(request);

    await this.rateLimit.assertAllowed({
      key: `ip:${ipAddress ?? 'unknown'}:session:${body.sessionId}`,
      action: 'analytics.track',
      limit: numberConfig(this.config, 'ANALYTICS_TRACK_RATE_LIMIT_MAX', 120),
      windowMs: numberConfig(this.config, 'ANALYTICS_TRACK_RATE_LIMIT_WINDOW_SECONDS', 60) * 1000,
    });

    return this.analytics.track(body, {
      authorization,
      userAgent,
      ipAddress,
    });
  }
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getIpAddress(request: AnalyticsRequest) {
  const forwardedFor = headerValue(request.headers['x-forwarded-for']);
  return forwardedFor?.split(',')[0]?.trim() || request.ip;
}

function numberConfig(config: ConfigService, name: string, fallback: number) {
  const value = Number(config.get<string>(name) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}
