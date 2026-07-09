import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';

type AnalyticsRequest = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}

  @Post('events')
  track(@Body() body: TrackEventDto, @Req() request: AnalyticsRequest) {
    const authorization = headerValue(request.headers.authorization);
    const userAgent = headerValue(request.headers['user-agent']);

    return this.analytics.track(body, {
      authorization,
      userAgent,
      ipAddress: request.ip,
    });
  }
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
