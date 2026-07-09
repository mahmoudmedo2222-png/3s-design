import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { analyticsEvents, downloadEvents, entitlements, orderItems, orders } from '@3s-design/db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';
import { TrackEventDto } from './dto/track-event.dto';

type AnalyticsRequestContext = {
  authorization?: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async track(input: TrackEventDto, context: AnalyticsRequestContext = {}) {
    const db = this.database.requireDb();
    const user = await this.tryResolveUser(context.authorization);
    const [created] = await db
      .insert(analyticsEvents)
      .values({
        userId: user?.id ?? null,
        sessionId: input.sessionId,
        eventName: input.name,
        path: sanitizeText(input.path, 260) ?? '/',
        payload: sanitizePayload(input.payload ?? {}),
        ipAddress: context.ipAddress,
        userAgent: sanitizeText(context.userAgent, 360),
      })
      .returning({ id: analyticsEvents.id, createdAt: analyticsEvents.createdAt });

    return {
      accepted: Boolean(created),
      id: created?.id,
      createdAt: created?.createdAt,
    };
  }

  async adminSummary(daysInput = 7) {
    const db = this.database.requireDb();
    const days = clampDays(daysInput);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where = gte(analyticsEvents.createdAt, since);
    const counts = await db
      .select({
        eventName: analyticsEvents.eventName,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(where)
      .groupBy(analyticsEvents.eventName);
    const topSearches = await db
      .select({
        query: sql<string>`payload->>'query'`,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(and(where, sql`${analyticsEvents.eventName} in ('search_started', 'search_completed')`, sql`payload ? 'query'`))
      .groupBy(sql`payload->>'query'`)
      .orderBy(sql`count(*) desc`)
      .limit(8);
    const topProducts = await db
      .select({
        slug: sql<string>`payload->>'slug'`,
        title: sql<string>`payload->>'title'`,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(and(where, sql`${analyticsEvents.eventName} in ('product_viewed', 'product_add_to_cart_succeeded')`, sql`payload ? 'slug'`))
      .groupBy(sql`payload->>'slug'`, sql`payload->>'title'`)
      .orderBy(sql`count(*) desc`)
      .limit(8);
    const recentEvents = await db
      .select({
        id: analyticsEvents.id,
        eventName: analyticsEvents.eventName,
        path: analyticsEvents.path,
        payload: analyticsEvents.payload,
        createdAt: analyticsEvents.createdAt,
      })
      .from(analyticsEvents)
      .where(where)
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(12);
    const [topSources, topCampaigns, topIntents, topBriefs] = await Promise.all([
      this.topPayloadValue('attributionSource', where, 8),
      this.topPayloadValue('attributionCampaign', where, 8),
      this.topPayloadValue('attributionIntent', where, 8),
      this.topPayloadValue('attributionBrief', where, 8),
    ]);
    const byName = Object.fromEntries(counts.map((item) => [item.eventName, Number(item.count)]));
    const productViews = byName.product_viewed ?? 0;
    const cartAdds = byName.product_add_to_cart_succeeded ?? 0;
    const checkoutAttempts = byName.checkout_order_attempted ?? 0;
    const ordersCreated = byName.checkout_order_created ?? 0;
    const paymentStatusViews = byName.payment_status_viewed ?? 0;
    const paymentStatusRefreshes = byName.payment_status_refreshed ?? 0;
    const paymentProviderOpens = byName.payment_status_provider_opened ?? 0;
    const paymentRecoveryActions = byName.payment_recovery_action_clicked ?? 0;
    const downloadsRequested = byName.download_asset_requested ?? 0;

    return {
      window: {
        days,
        since: since.toISOString(),
      },
      totals: {
        events: counts.reduce((sum, item) => sum + Number(item.count), 0),
        productViews,
        searches: (byName.search_started ?? 0) + (byName.search_completed ?? 0),
        cartAdds,
        checkoutAttempts,
        ordersCreated,
        paymentStatusViews,
        paymentStatusRefreshes,
        paymentProviderOpens,
        paymentRecoveryActions,
        downloadsRequested,
      },
      conversion: {
        viewToCart: conversionRate(cartAdds, productViews),
        cartToCheckout: conversionRate(checkoutAttempts, cartAdds),
        checkoutToOrder: conversionRate(ordersCreated, checkoutAttempts),
        orderToDownload: conversionRate(downloadsRequested, ordersCreated),
      },
      counts: counts
        .map((item) => ({ eventName: item.eventName, count: Number(item.count) }))
        .sort((left, right) => right.count - left.count),
      topSearches: topSearches.filter((item) => item.query).map((item) => ({ query: item.query, count: Number(item.count) })),
      topProducts: topProducts
        .filter((item) => item.slug)
        .map((item) => ({ slug: item.slug, title: item.title, count: Number(item.count) })),
      attribution: {
        sources: topSources,
        campaigns: topCampaigns,
        intents: topIntents,
        briefs: topBriefs,
      },
      recentEvents,
    };
  }

  async adminProductSummary(input: { productId: string; slug: string; days?: number }) {
    const db = this.database.requireDb();
    const days = clampDays(input.days ?? 7);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const productFilter = productPayloadFilter(input.productId, input.slug);
    const where = and(gte(analyticsEvents.createdAt, since), productFilter);
    const counts = await db
      .select({
        eventName: analyticsEvents.eventName,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(where)
      .groupBy(analyticsEvents.eventName);
    const searchTerms = await db
      .select({
        query: sql<string>`payload->>'query'`,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(and(where, sql`${analyticsEvents.eventName} = 'search_result_clicked'`, sql`payload ? 'query'`))
      .groupBy(sql`payload->>'query'`)
      .orderBy(sql`count(*) desc`)
      .limit(8);
    const licensePicks = await db
      .select({
        licenseId: sql<string>`payload->>'licenseId'`,
        licenseName: sql<string>`payload->>'licenseName'`,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(and(where, sql`${analyticsEvents.eventName} = 'product_license_selected'`, sql`payload ? 'licenseId'`))
      .groupBy(sql`payload->>'licenseId'`, sql`payload->>'licenseName'`)
      .orderBy(sql`count(*) desc`)
      .limit(8);
    const recentEvents = await db
      .select({
        id: analyticsEvents.id,
        eventName: analyticsEvents.eventName,
        path: analyticsEvents.path,
        payload: analyticsEvents.payload,
        createdAt: analyticsEvents.createdAt,
      })
      .from(analyticsEvents)
      .where(where)
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(12);
    const [topSources, topCampaigns, topIntents, topBriefs] = await Promise.all([
      this.topPayloadValue('attributionSource', where, 6),
      this.topPayloadValue('attributionCampaign', where, 6),
      this.topPayloadValue('attributionIntent', where, 6),
      this.topPayloadValue('attributionBrief', where, 6),
    ]);
    const [orderStats] = await db
      .select({
        ordersCreated: sql<number>`count(distinct ${orderItems.orderId})::int`,
        paidOrders: sql<number>`count(distinct case when ${orders.paidAt} is not null then ${orders.id} end)::int`,
        quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        revenue: sql<string>`coalesce(sum(${orderItems.total}), 0)::text`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orderItems.productId, input.productId), gte(orders.createdAt, since)));
    const [deliveryStats] = await db
      .select({
        entitlements: sql<number>`count(distinct ${entitlements.id})::int`,
        downloads: sql<number>`count(${downloadEvents.id})::int`,
      })
      .from(entitlements)
      .leftJoin(downloadEvents, eq(downloadEvents.entitlementId, entitlements.id))
      .where(and(eq(entitlements.productId, input.productId), gte(entitlements.createdAt, since)));
    const byName = Object.fromEntries(counts.map((item) => [item.eventName, Number(item.count)]));
    const productViews = byName.product_viewed ?? 0;
    const resultClicks = byName.search_result_clicked ?? 0;
    const licenseSelections = byName.product_license_selected ?? 0;
    const cartAttempts = byName.product_add_to_cart_attempted ?? 0;
    const cartAdds = byName.product_add_to_cart_succeeded ?? 0;

    return {
      product: {
        id: input.productId,
        slug: input.slug,
      },
      window: {
        days,
        since: since.toISOString(),
      },
      totals: {
        events: counts.reduce((sum, item) => sum + Number(item.count), 0),
        resultClicks,
        productViews,
        licenseSelections,
        cartAttempts,
        cartAdds,
        ordersCreated: Number(orderStats?.ordersCreated ?? 0),
        paidOrders: Number(orderStats?.paidOrders ?? 0),
        quantitySold: Number(orderStats?.quantitySold ?? 0),
        revenue: orderStats?.revenue ?? '0',
        entitlements: Number(deliveryStats?.entitlements ?? 0),
        downloads: Number(deliveryStats?.downloads ?? 0),
      },
      conversion: {
        clickToView: conversionRate(productViews, resultClicks),
        viewToLicenseSelection: conversionRate(licenseSelections, productViews),
        viewToCart: conversionRate(cartAdds, productViews),
        cartAttemptSuccess: conversionRate(cartAdds, cartAttempts),
        cartToOrder: conversionRate(Number(orderStats?.ordersCreated ?? 0), cartAdds),
        orderToPaid: conversionRate(Number(orderStats?.paidOrders ?? 0), Number(orderStats?.ordersCreated ?? 0)),
        paidToDownload: conversionRate(Number(deliveryStats?.entitlements ?? 0), Number(orderStats?.paidOrders ?? 0)),
      },
      counts: counts
        .map((item) => ({ eventName: item.eventName, count: Number(item.count) }))
        .sort((left, right) => right.count - left.count),
      searchTerms: searchTerms.filter((item) => item.query).map((item) => ({ query: item.query, count: Number(item.count) })),
      licensePicks: licensePicks
        .filter((item) => item.licenseId)
        .map((item) => ({ licenseId: item.licenseId, licenseName: item.licenseName, count: Number(item.count) })),
      attribution: {
        sources: topSources,
        campaigns: topCampaigns,
        intents: topIntents,
        briefs: topBriefs,
      },
      recentEvents,
      recommendation: productRecommendation({
        productViews,
        resultClicks,
        licenseSelections,
        cartAttempts,
        cartAdds,
        ordersCreated: Number(orderStats?.ordersCreated ?? 0),
        paidOrders: Number(orderStats?.paidOrders ?? 0),
        downloads: Number(deliveryStats?.downloads ?? 0),
      }),
    };
  }

  private async tryResolveUser(authorization?: string) {
    const token = extractBearerToken(authorization);
    if (!token) {
      return null;
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(token);
      return { id: payload.id };
    } catch {
      return null;
    }
  }

  private async topPayloadValue(key: string, where: ReturnType<typeof gte> | ReturnType<typeof and>, limit: number) {
    const db = this.database.requireDb();
    const safeKey = assertAttributionPayloadKey(key);
    const valueExpression = sql.raw(`payload->>'${safeKey}'`);
    const rows = await db
      .select({
        value: valueExpression,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(and(where, sql`payload ? ${safeKey}`, sql`coalesce(${valueExpression}, '') <> ''`))
      .groupBy(valueExpression)
      .orderBy(sql`count(*) desc`)
      .limit(limit);

    return rows.map((item) => ({ value: item.value, count: Number(item.count) }));
  }
}

function assertAttributionPayloadKey(key: string) {
  const allowed = ['attributionSource', 'attributionCampaign', 'attributionIntent', 'attributionBrief'];

  if (!allowed.includes(key)) {
    throw new BadRequestException('Unsupported attribution dimension');
  }

  return key;
}

export function conversionRate(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

function clampDays(days: number) {
  if (!Number.isFinite(days)) {
    return 7;
  }

  return Math.min(90, Math.max(1, Math.floor(days)));
}

function productPayloadFilter(productId: string, slug: string) {
  return sql`(${analyticsEvents.payload}->>'productId' = ${productId} or ${analyticsEvents.payload}->>'slug' = ${slug})`;
}

function productRecommendation(input: {
  productViews: number;
  resultClicks: number;
  licenseSelections: number;
  cartAttempts: number;
  cartAdds: number;
  ordersCreated: number;
  paidOrders: number;
  downloads: number;
}) {
  if (!input.productViews && !input.resultClicks) {
    return 'No product-level signal yet. Drive discovery traffic before judging this product.';
  }

  if (input.resultClicks > input.productViews) {
    return 'Search result interest is not turning into product views. Improve card preview, title, and result promise.';
  }

  if (input.productViews > 0 && input.licenseSelections === 0) {
    return 'Product page is being viewed, but license choice is not happening. Clarify license value and default price.';
  }

  if (input.cartAttempts > input.cartAdds) {
    return 'Customers attempt cart actions that fail or stop. Check sign-in friction and license setup.';
  }

  if (input.productViews > 0 && input.cartAdds === 0) {
    return 'Product is getting attention but not cart adds. Improve preview evidence, delivery details, and CTA confidence.';
  }

  if (input.cartAdds > 0 && input.ordersCreated === 0) {
    return 'Cart interest is not becoming orders. Inspect checkout confidence, payment explanation, and cart summary.';
  }

  if (input.ordersCreated > 0 && input.paidOrders === 0) {
    return 'Orders exist but payment approval is not happening. Inspect manual payment instructions and admin approval workflow.';
  }

  if (input.paidOrders > 0 && input.downloads === 0) {
    return 'Paid orders exist without downloads. Inspect entitlement creation, delivery vault clarity, and file availability.';
  }

  return 'This product has movement through the funnel. Next step is comparing it against similar products.';
}

function extractBearerToken(authorization?: string) {
  if (!authorization) {
    return null;
  }

  const [type, token] = authorization.split(' ');
  return type?.toLowerCase() === 'bearer' && token ? token : null;
}

function sanitizePayload(input: Record<string, unknown>) {
  const entries = Object.entries(input)
    .slice(0, 24)
    .map(([key, value]) => [sanitizeText(key, 80), sanitizePayloadValue(value)] as const);
  const size = JSON.stringify(entries).length;

  if (size > 5000) {
    throw new BadRequestException('Analytics payload is too large');
  }

  return Object.fromEntries(entries);
}

function sanitizePayloadValue(value: unknown): string | number | boolean | null {
  if (typeof value === 'string') {
    return sanitizeText(value, 180) ?? '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean' || value === null) {
    return value;
  }

  return null;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
