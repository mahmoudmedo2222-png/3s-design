import { BadRequestException, Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AnalyticsService } from './analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary(@Query('days') days?: string) {
    return this.analytics.adminSummary(Number(days ?? 7));
  }

  @Get('products/:id/summary')
  productSummary(@Param('id') id: string, @Query('slug') slug?: string, @Query('days') days?: string) {
    if (!slug?.trim()) {
      throw new BadRequestException('Product slug is required for analytics drilldown');
    }

    return this.analytics.adminProductSummary({
      productId: id,
      slug: slug.trim(),
      days: Number(days ?? 7),
    });
  }
}
