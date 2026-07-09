import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { downloadEvents, entitlements, orders, payments, paymentWebhookEvents, users } from '@3s-design/db/schema';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { DownloadsService } from '../downloads/downloads.service';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import type { PaymentWebhookEventDto } from './dto/payment-webhook-event.dto';
import { isPaymentProvider } from './payment-providers';
import type { PaymentProvider } from './payment-providers';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(DownloadsService) private readonly downloads: DownloadsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async createPaymentSession(userId: string, input: CreatePaymentSessionDto) {
    const db = this.database.requireDb();
    const providerReadiness = this.getProviderReadiness(input.provider);
    if (!providerReadiness.configured) {
      throw new BadRequestException(`${input.provider} payment is not configured for real checkout yet`);
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'paid') {
      throw new BadRequestException('Order is already paid');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Order is not payable');
    }

    if (input.idempotencyKey) {
      const [existingIdempotentPayment] = await db
        .select()
        .from(payments)
        .where(
          and(eq(payments.orderId, order.id), eq(payments.provider, input.provider), eq(payments.idempotencyKey, input.idempotencyKey)),
        )
        .limit(1);

      if (existingIdempotentPayment) {
        return this.serializePaymentSession(existingIdempotentPayment);
      }
    } else {
      const [existingPendingPayment] = await db
        .select()
        .from(payments)
        .where(and(eq(payments.orderId, order.id), eq(payments.provider, input.provider), eq(payments.status, 'pending')))
        .orderBy(desc(payments.createdAt))
        .limit(1);

      if (existingPendingPayment) {
        return this.serializePaymentSession(existingPendingPayment);
      }
    }

    const providerPaymentId = this.createProviderPaymentId(input.provider);
    const fraudRisk = this.assessFraudRisk({
      provider: input.provider,
      amount: Number(order.total),
      currency: order.currency,
      billingSnapshot: order.billingSnapshot,
      hasIdempotencyKey: Boolean(input.idempotencyKey),
    });
    const providerSession = await this.createProviderCheckoutSession({
      provider: input.provider,
      providerPaymentId,
      order,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    const [createdPayment] = await db
      .insert(payments)
      .values({
        orderId: order.id,
        provider: input.provider,
        status: 'pending',
        providerPaymentId,
        idempotencyKey: input.idempotencyKey,
        amount: order.total,
        currency: order.currency,
        rawResponse: {
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
          mode: input.provider === 'manual' ? 'manual_review' : 'provider_checkout',
          providerReadiness,
          providerSession,
          fraudRisk,
        },
      })
      .returning();

    if (!createdPayment) {
      throw new BadRequestException('Payment creation failed');
    }

    return this.serializePaymentSession(createdPayment);
  }

  getProvidersReadiness() {
    return {
      items: (['manual', 'paypal', 'paymob', 'fawry'] as const).map((provider) => this.getProviderReadiness(provider)),
    };
  }

  async listUserPayments(userId: string) {
    const db = this.database.requireDb();
    const rows = await db
      .select({
        payment: payments,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
        },
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(eq(orders.userId, userId))
      .orderBy(desc(payments.createdAt));

    return { items: rows };
  }

  async listAdminPayments() {
    const rows = await this.database
      .requireDb()
      .select({
        payment: payments,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          currency: orders.currency,
          billingSnapshot: orders.billingSnapshot,
          createdAt: orders.createdAt,
          paidAt: orders.paidAt,
        },
        customer: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        },
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(users, eq(users.id, orders.userId))
      .orderBy(desc(payments.createdAt))
      .limit(50);

    const items = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        payment: this.serializePaymentSession(row.payment),
        latestWebhook: await this.findLatestWebhookForPayment(row.payment),
        delivery: await this.getOrderDeliverySummary(row.order.id),
      })),
    );

    return { items };
  }

  async reconcileStalePendingPayments(actorUserId: string, now = new Date()) {
    const db = this.database.requireDb();
    const rules = this.getPendingExpiryRules(now);
    const stalePredicates = rules
      .filter((rule) => rule.enabled)
      .map((rule) => and(eq(payments.provider, rule.provider), lt(payments.createdAt, rule.cutoff)));

    if (!stalePredicates.length) {
      return {
        expired: 0,
        items: [],
      };
    }

    const rows = await db
      .select()
      .from(payments)
      .where(and(eq(payments.status, 'pending'), or(...stalePredicates)))
      .orderBy(desc(payments.createdAt))
      .limit(100);

    const expired = [];
    for (const payment of rows) {
      const [updated] = await db
        .update(payments)
        .set({
          status: 'expired',
          updatedAt: now,
        })
        .where(and(eq(payments.id, payment.id), eq(payments.status, 'pending')))
        .returning();

      if (!updated) {
        continue;
      }

      expired.push(this.serializePaymentSession(updated));
      await this.audit.record({
        actorUserId,
        action: 'admin.payments.reconcile_expired',
        entityType: 'payment',
        entityId: payment.id,
        before: this.toAuditObject(payment),
        after: this.toAuditObject(updated),
      });
    }

    return {
      expired: expired.length,
      items: expired,
    };
  }

  async markPaymentPaid(paymentId: string, providerPaymentId?: string, actorUserId?: string) {
    const db = this.database.requireDb();
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'paid') {
      return this.finishPaidOrder(payment.orderId);
    }

    if (payment.status !== 'pending' && payment.status !== 'failed' && payment.status !== 'expired') {
      throw new BadRequestException('Payment is not pending');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: 'paid',
          providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      await tx
        .update(orders)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, payment.orderId));
    });

    await this.audit.record({
      actorUserId,
      action: actorUserId ? 'admin.payments.mark_paid' : 'payments.mark_paid',
      entityType: 'payment',
      entityId: payment.id,
      before: this.toAuditObject(payment),
      after: {
        ...this.toAuditObject(payment),
        status: 'paid',
        providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
      },
    });

    return this.finishPaidOrder(payment.orderId);
  }

  async failPayment(paymentId: string, actorUserId?: string) {
    const db = this.database.requireDb();
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException('Payment is not pending');
    }

    const [updated] = await db
      .update(payments)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(payments.id, payment.id))
      .returning();

    if (updated) {
      await this.audit.record({
        actorUserId,
        action: actorUserId ? 'admin.payments.mark_failed' : 'payments.mark_failed',
        entityType: 'payment',
        entityId: payment.id,
        before: this.toAuditObject(payment),
        after: this.toAuditObject(updated),
      });
    }

    return updated;
  }

  async markProviderPaymentPaid(provider: PaymentProvider, providerPaymentId: string) {
    const payment = await this.findPaymentByProvider(provider, providerPaymentId);
    return this.markPaymentPaid(payment.id, providerPaymentId);
  }

  async failProviderPayment(provider: PaymentProvider, providerPaymentId: string) {
    const payment = await this.findPaymentByProvider(provider, providerPaymentId);
    if (payment.status !== 'pending') {
      return payment;
    }

    return this.failPayment(payment.id);
  }

  async handleProviderWebhook(
    providerValue: string,
    input: PaymentWebhookEventDto | Record<string, unknown>,
    secret: string | undefined,
    hmac?: string,
  ) {
    if (!isPaymentProvider(providerValue)) {
      throw new BadRequestException('Unsupported payment provider');
    }

    const provider = providerValue;
    this.assertWebhookAuthenticity(provider, input, secret, hmac);
    const event = this.normalizeProviderWebhook(provider, input);

    const db = this.database.requireDb();
    const [existing] = await db
      .select({ id: paymentWebhookEvents.id, processedAt: paymentWebhookEvents.processedAt })
      .from(paymentWebhookEvents)
      .where(and(eq(paymentWebhookEvents.provider, providerValue), eq(paymentWebhookEvents.eventId, event.eventId)))
      .limit(1);

    if (existing) {
      if (!existing.processedAt) {
        await this.processProviderWebhook(providerValue, event);
        const [updatedDuplicate] = await db
          .update(paymentWebhookEvents)
          .set({ processedAt: new Date() })
          .where(eq(paymentWebhookEvents.id, existing.id))
          .returning();

        return {
          accepted: true,
          duplicate: true,
          processed: Boolean(updatedDuplicate?.processedAt),
        };
      }

      return {
        accepted: true,
        duplicate: true,
        processed: Boolean(existing.processedAt),
      };
    }

    const [createdEvent] = await db
      .insert(paymentWebhookEvents)
      .values({
        provider: providerValue,
        eventId: event.eventId,
        eventType: event.eventType,
        payload: this.sanitizeWebhookPayload(
          provider,
          event.payload ?? {
            providerPaymentId: event.providerPaymentId,
            status: event.status,
          },
        ),
      })
      .onConflictDoNothing({
        target: [paymentWebhookEvents.provider, paymentWebhookEvents.eventId],
      })
      .returning();

    if (!createdEvent) {
      const [duplicate] = await db
        .select({ id: paymentWebhookEvents.id, processedAt: paymentWebhookEvents.processedAt })
        .from(paymentWebhookEvents)
        .where(and(eq(paymentWebhookEvents.provider, providerValue), eq(paymentWebhookEvents.eventId, event.eventId)))
        .limit(1);

      if (duplicate && !duplicate.processedAt) {
        await this.processProviderWebhook(providerValue, event);
        const [updatedDuplicate] = await db
          .update(paymentWebhookEvents)
          .set({ processedAt: new Date() })
          .where(eq(paymentWebhookEvents.id, duplicate.id))
          .returning();

        return {
          accepted: true,
          duplicate: true,
          processed: Boolean(updatedDuplicate?.processedAt),
        };
      }

      return {
        accepted: true,
        duplicate: true,
        processed: Boolean(duplicate?.processedAt),
      };
    }

    await this.processProviderWebhook(providerValue, event);

    const [updatedEvent] = await db
      .update(paymentWebhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(paymentWebhookEvents.id, createdEvent.id))
      .returning();

    return {
      accepted: true,
      duplicate: false,
      processed: Boolean(updatedEvent?.processedAt),
    };
  }

  private async processProviderWebhook(provider: PaymentProvider, input: PaymentWebhookEventDto) {
    const payment = await this.findPaymentByProvider(provider, input.providerPaymentId);
    this.assertProviderWebhookMatchesPayment(provider, input, payment);

    if (input.status === 'paid') {
      await this.markPaymentPaid(payment.id, input.providerPaymentId);
      return;
    }

    if (payment.status === 'pending') {
      await this.failPayment(payment.id);
    }
  }

  async assertUserOwnsPayment(userId: string, paymentId: string) {
    const [row] = await this.database
      .requireDb()
      .select({ payment: payments })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(and(eq(payments.id, paymentId), eq(orders.userId, userId)))
      .limit(1);

    if (!row) {
      throw new ForbiddenException('Payment not found');
    }

    return row.payment;
  }

  private async finishPaidOrder(orderId: string) {
    const entitlements = await this.downloads.grantEntitlementsForPaidOrder(orderId);
    const [order] = await this.database.requireDb().select().from(orders).where(eq(orders.id, orderId)).limit(1);

    return {
      order,
      entitlements,
    };
  }

  private async findPaymentByProvider(provider: PaymentProvider, providerPaymentId: string) {
    const [payment] = await this.database
      .requireDb()
      .select()
      .from(payments)
      .where(and(eq(payments.provider, provider), eq(payments.providerPaymentId, providerPaymentId)))
      .limit(1);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  private async findLatestWebhookForPayment(payment: typeof payments.$inferSelect) {
    if (!payment.providerPaymentId) {
      return null;
    }

    const event = await this.database
      .requireDb()
      .select({
        eventId: paymentWebhookEvents.eventId,
        eventType: paymentWebhookEvents.eventType,
        payload: paymentWebhookEvents.payload,
        processedAt: paymentWebhookEvents.processedAt,
        createdAt: paymentWebhookEvents.createdAt,
      })
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.provider, payment.provider))
      .orderBy(desc(paymentWebhookEvents.createdAt))
      .limit(100)
      .then((events) =>
        events.find((event) => {
          const payload = this.getRawObject(event.payload);
          const providerPaymentId =
            this.safeOptionalString(payload.providerPaymentId) ??
            this.extractPaymobProviderPaymentId(this.getPaymobTransactionObject(payload));

          return providerPaymentId === payment.providerPaymentId;
        }),
      );

    if (!event) {
      return null;
    }

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      processedAt: event.processedAt,
      createdAt: event.createdAt,
    };
  }

  private async getOrderDeliverySummary(orderId: string) {
    const db = this.database.requireDb();
    const [summary] = await db
      .select({
        entitlements: sql<number>`count(distinct ${entitlements.id})::int`,
        activeEntitlements: sql<number>`count(distinct ${entitlements.id}) filter (where ${entitlements.isActive} = true)::int`,
        downloads: sql<number>`count(${downloadEvents.id}) filter (where ${downloadEvents.status} = 'allowed')::int`,
      })
      .from(entitlements)
      .leftJoin(downloadEvents, eq(downloadEvents.entitlementId, entitlements.id))
      .where(eq(entitlements.orderId, orderId));

    return {
      entitlements: Number(summary?.entitlements ?? 0),
      activeEntitlements: Number(summary?.activeEntitlements ?? 0),
      downloads: Number(summary?.downloads ?? 0),
    };
  }

  private assertWebhookAuthenticity(
    provider: PaymentProvider,
    input: PaymentWebhookEventDto | Record<string, unknown>,
    secret: string | undefined,
    hmac?: string,
  ) {
    if (provider === 'paymob') {
      this.assertPaymobHmac(input, hmac);
      return;
    }

    this.assertWebhookSecret(provider, secret);
  }

  private assertWebhookSecret(provider: PaymentProvider, secret: string | undefined) {
    const envName = `PAYMENT_WEBHOOK_SECRET_${provider.toUpperCase()}`;
    const expected = this.config.get<string>(envName);

    if (!expected) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException(`${provider} payment webhook secret is not configured`);
      }

      return;
    }

    if (!secret || secret !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  private serializePaymentSession(payment: typeof payments.$inferSelect) {
    const provider = isPaymentProvider(payment.provider) ? payment.provider : 'manual';

    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      status: payment.status,
      providerPaymentId: payment.providerPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      redirectUrl: this.getPaymentRedirectUrl(provider, payment),
      mode: provider === 'manual' ? 'manual_review' : 'provider_checkout',
    };
  }

  private getPaymentRedirectUrl(provider: PaymentProvider, payment: typeof payments.$inferSelect) {
    if (provider === 'paymob') {
      const providerSession = this.getRawObject(payment.rawResponse.providerSession);
      return typeof providerSession.iframeUrl === 'string' ? providerSession.iframeUrl : null;
    }

    return this.getRedirectUrl(provider, payment.providerPaymentId);
  }

  private getRedirectUrl(provider: PaymentProvider, providerPaymentId: string | null) {
    if (provider === 'manual') {
      return null;
    }

    if (provider === 'paymob') {
      return null;
    }

    const template = this.providerCheckoutTemplate(provider);
    if (!template || !providerPaymentId) {
      return null;
    }

    return template.replace('{paymentId}', encodeURIComponent(providerPaymentId));
  }

  private createProviderPaymentId(provider: PaymentProvider) {
    return `${provider}_${randomUUID()}`;
  }

  private normalizeProviderWebhook(
    provider: PaymentProvider,
    input: PaymentWebhookEventDto | Record<string, unknown>,
  ): PaymentWebhookEventDto {
    if (provider !== 'paymob') {
      const event = input as Partial<PaymentWebhookEventDto>;
      if (
        typeof event.eventId !== 'string' ||
        typeof event.eventType !== 'string' ||
        typeof event.providerPaymentId !== 'string' ||
        (event.status !== 'paid' && event.status !== 'failed')
      ) {
        throw new BadRequestException('Invalid payment webhook payload');
      }

      return {
        eventId: event.eventId,
        eventType: event.eventType,
        providerPaymentId: event.providerPaymentId,
        status: event.status,
        payload: this.getRawObject(event.payload),
      };
    }

    const object = this.getPaymobTransactionObject(input);
    const providerPaymentId = this.extractPaymobProviderPaymentId(object);
    const success = object.success === true || object.success === 'true';
    const pending = object.pending === true || object.pending === 'true';
    const status: PaymentWebhookEventDto['status'] = success && !pending ? 'paid' : 'failed';

    if (!providerPaymentId) {
      throw new BadRequestException('Paymob webhook is missing merchant order id');
    }

    const transactionId = this.safeString(object.id, providerPaymentId);

    return {
      eventId: `paymob-${transactionId}-${status}`,
      eventType: success ? 'payment.paid' : 'payment.failed',
      providerPaymentId,
      status,
      payload: this.getRawObject(input),
    };
  }

  private assertPaymobHmac(input: PaymentWebhookEventDto | Record<string, unknown>, hmac?: string) {
    const secret = this.config.get<string>('PAYMOB_HMAC_SECRET');

    if (!secret) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('Paymob HMAC secret is not configured');
      }

      return;
    }

    if (!hmac) {
      throw new UnauthorizedException('Missing Paymob HMAC');
    }

    const object = this.getPaymobTransactionObject(input);
    const calculated = createHmac('sha512', secret).update(this.buildPaymobHmacSource(object)).digest('hex');

    if (!this.timingSafeStringEqual(calculated, hmac)) {
      throw new UnauthorizedException('Invalid Paymob HMAC');
    }
  }

  private buildPaymobHmacSource(object: Record<string, unknown>) {
    const order = this.getRawObject(object.order);
    const sourceData = this.getRawObject(object.source_data);
    const fields = [
      object.amount_cents,
      object.created_at,
      object.currency,
      object.error_occured,
      object.has_parent_transaction,
      object.id,
      object.integration_id,
      object.is_3d_secure,
      object.is_auth,
      object.is_capture,
      object.is_refunded,
      object.is_standalone_payment,
      object.is_voided,
      order.id,
      object.owner,
      object.pending,
      sourceData.pan,
      sourceData.sub_type,
      sourceData.type,
      object.success,
    ];

    return fields.map((value) => (value === undefined || value === null ? '' : String(value))).join('');
  }

  private extractPaymobProviderPaymentId(object: Record<string, unknown>) {
    const order = this.getRawObject(object.order);
    return this.safeOptionalString(object.merchant_order_id) ?? this.safeOptionalString(order.merchant_order_id);
  }

  private assertProviderWebhookMatchesPayment(
    provider: PaymentProvider,
    input: PaymentWebhookEventDto,
    payment: typeof payments.$inferSelect,
  ) {
    if (provider !== 'paymob') {
      return;
    }

    const object = this.getPaymobTransactionObject(input.payload ?? {});
    const amountCents = Number(object.amount_cents);
    const currency = this.safeOptionalString(object.currency);

    if (!Number.isFinite(amountCents) || amountCents !== this.toAmountCents(payment.amount)) {
      throw new BadRequestException('Paymob amount mismatch');
    }

    if (!currency || currency !== payment.currency) {
      throw new BadRequestException('Paymob currency mismatch');
    }
  }

  private getPaymobTransactionObject(input: PaymentWebhookEventDto | Record<string, unknown>) {
    const root = this.getRawObject(input);
    const object = this.getRawObject(root.obj) ?? root;
    return Object.keys(object).length ? object : root;
  }

  private getRawObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private sanitizeWebhookPayload(provider: PaymentProvider, payload: Record<string, unknown>) {
    const sensitiveKeys = new Set([
      'auth_token',
      'card_number',
      'cvv',
      'cvc',
      'pan',
      'password',
      'payment_key',
      'payment_token',
      'secret',
      'token',
    ]);

    const visit = (value: unknown, depth: number): unknown => {
      if (value === null || value === undefined) {
        return value ?? null;
      }

      if (typeof value === 'string') {
        return value.length > 300 ? `${value.slice(0, 300)}...` : value;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }

      if (Array.isArray(value)) {
        return depth >= 4 ? '[array]' : value.slice(0, 20).map((item) => visit(item, depth + 1));
      }

      if (typeof value !== 'object') {
        return String(value);
      }

      if (depth >= 4) {
        return '[object]';
      }

      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .slice(0, 80)
          .map(([key, child]) => [key, sensitiveKeys.has(key.toLowerCase()) ? '[redacted]' : visit(child, depth + 1)]),
      );
    };

    const sanitized = visit(payload, 0);
    return {
      ...this.getRawObject(sanitized),
      provider,
    };
  }

  private timingSafeStringEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private async createProviderCheckoutSession(input: {
    provider: PaymentProvider;
    providerPaymentId: string;
    order: typeof orders.$inferSelect;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    if (input.provider !== 'paymob') {
      return null;
    }

    return this.createPaymobCheckoutSession(input);
  }

  private async createPaymobCheckoutSession(input: {
    providerPaymentId: string;
    order: typeof orders.$inferSelect;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    const apiKey = this.config.get<string>('PAYMOB_API_KEY');
    const integrationId = this.config.get<string>('PAYMOB_INTEGRATION_ID_CARD') ?? this.config.get<string>('PAYMOB_INTEGRATION_ID');
    const iframeId = this.config.get<string>('PAYMOB_IFRAME_ID');
    const apiBaseUrl = this.config.get<string>('PAYMOB_API_BASE_URL') ?? 'https://accept.paymob.com/api';

    if (!apiKey || !integrationId || !iframeId) {
      throw new ServiceUnavailableException('Paymob checkout is not configured');
    }

    const auth = await this.postPaymob<{ token: string }>(`${apiBaseUrl}/auth/tokens`, {
      api_key: apiKey,
    });

    const amountCents = this.toAmountCents(input.order.total);
    const paymobOrder = await this.postPaymob<{ id: number | string }>(`${apiBaseUrl}/ecommerce/orders`, {
      auth_token: auth.token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: input.order.currency,
      merchant_order_id: input.providerPaymentId,
      items: [],
    });

    const billing = this.buildPaymobBillingData(input.order.billingSnapshot);
    const paymentKey = await this.postPaymob<{ token: string }>(`${apiBaseUrl}/acceptance/payment_keys`, {
      auth_token: auth.token,
      amount_cents: amountCents,
      expiration: Number(this.config.get<string>('PAYMOB_PAYMENT_KEY_TTL_SECONDS') ?? 3600),
      order_id: paymobOrder.id,
      billing_data: billing,
      currency: input.order.currency,
      integration_id: Number(integrationId),
      lock_order_when_paid: true,
    });

    return {
      provider: 'paymob',
      paymobOrderId: String(paymobOrder.id),
      merchantOrderId: input.providerPaymentId,
      amountCents,
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${encodeURIComponent(iframeId)}?payment_token=${encodeURIComponent(
        paymentKey.token,
      )}`,
      successUrl: input.successUrl ?? null,
      cancelUrl: input.cancelUrl ?? null,
    };
  }

  private async postPaymob<T>(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new ServiceUnavailableException(`Paymob request failed: ${message || response.status}`);
    }

    return (await response.json()) as T;
  }

  private buildPaymobBillingData(billingSnapshot: Record<string, unknown>) {
    const email = this.safeString(billingSnapshot.email, 'customer@example.com');
    const city = this.safeString(billingSnapshot.city, 'NA');
    const country = this.safeString(billingSnapshot.country, 'EG');

    return {
      apartment: 'NA',
      email,
      floor: 'NA',
      first_name: this.safeString(billingSnapshot.firstName, '3S'),
      street: this.safeString(billingSnapshot.street, 'NA'),
      building: 'NA',
      phone_number: this.safeString(billingSnapshot.phone, '+201000000000'),
      shipping_method: 'NA',
      postal_code: this.safeString(billingSnapshot.postalCode, 'NA'),
      city,
      country,
      last_name: this.safeString(billingSnapshot.lastName, 'Design'),
      state: this.safeString(billingSnapshot.state, city),
    };
  }

  private toAmountCents(amount: string) {
    return Math.round(Number(amount) * 100);
  }

  private safeString(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private safeOptionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private getPendingExpiryRules(now: Date) {
    return (['manual', 'paypal', 'paymob', 'fawry'] as const).map((provider) => {
      const minutes = this.getPendingExpiryMinutes(provider);
      return {
        provider,
        enabled: minutes > 0,
        cutoff: new Date(now.getTime() - minutes * 60 * 1000),
      };
    });
  }

  private getPendingExpiryMinutes(provider: PaymentProvider) {
    const providerValue = this.config.get<string>(`PAYMENT_PENDING_EXPIRY_MINUTES_${provider.toUpperCase()}`);
    const sharedValue = this.config.get<string>('PAYMENT_PENDING_EXPIRY_MINUTES');
    const fallback = provider === 'manual' ? 48 * 60 : 120;
    const parsed = Number(providerValue ?? sharedValue ?? fallback);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }

    return parsed;
  }

  private assessFraudRisk(input: {
    provider: string;
    amount: number;
    currency: string;
    billingSnapshot: Record<string, unknown>;
    hasIdempotencyKey: boolean;
  }) {
    const reasons: string[] = [];
    let score = 10;

    if (!input.hasIdempotencyKey) {
      score += 12;
      reasons.push('missing_idempotency_key');
    }

    if (input.amount >= 250) {
      score += 15;
      reasons.push('high_order_value');
    }

    if (!input.billingSnapshot.country) {
      score += 10;
      reasons.push('missing_country');
    }

    if (input.provider === 'manual') {
      score += 8;
      reasons.push('manual_payment_review');
    }

    return {
      score: Math.min(score, 100),
      level: score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low',
      reasons,
      assessedAt: new Date().toISOString(),
    };
  }

  private getProviderReadiness(provider: PaymentProvider) {
    if (provider === 'manual') {
      return {
        provider,
        configured: true,
        mode: 'manual_review',
        missing: [] as string[],
        blocking: [] as string[],
        riskLevel: 'controlled',
        nextAction: 'Manual review is available as a fallback. Use provider checkout when a live provider is configured.',
      };
    }

    const required = this.providerRequiredEnv(provider);
    const missing = required.filter((key) => !this.config.get<string>(key));
    const blocking = this.providerBlockingReadiness(provider, missing);

    return {
      provider,
      configured: missing.length === 0,
      mode: 'provider_checkout',
      missing,
      blocking,
      riskLevel: blocking.length ? 'blocked' : 'ready',
      nextAction: blocking.length
        ? this.providerNextAction(provider, blocking)
        : `${provider} checkout is ready for sandbox/live verification.`,
    };
  }

  private providerBlockingReadiness(provider: PaymentProvider, missing: string[]) {
    if (provider === 'paymob') {
      return missing.filter((key) =>
        ['PAYMOB_API_KEY', 'PAYMOB_INTEGRATION_ID_CARD', 'PAYMOB_IFRAME_ID', 'PAYMOB_HMAC_SECRET'].includes(key),
      );
    }

    return missing;
  }

  private providerNextAction(provider: PaymentProvider, blocking: string[]) {
    if (provider === 'paymob') {
      return `Add ${blocking.join(', ')} to enable Paymob sandbox checkout and verified webhooks.`;
    }

    return `Add ${blocking.join(', ')} to enable ${provider} checkout.`;
  }

  private providerCheckoutTemplate(provider: PaymentProvider) {
    return this.config.get<string>(`${provider.toUpperCase()}_CHECKOUT_URL_TEMPLATE`);
  }

  private providerRequiredEnv(provider: PaymentProvider) {
    if (provider === 'manual') {
      return [];
    }

    if (provider === 'paymob') {
      return ['PAYMOB_API_KEY', 'PAYMOB_INTEGRATION_ID_CARD', 'PAYMOB_IFRAME_ID', 'PAYMOB_HMAC_SECRET'];
    }

    return [`${provider.toUpperCase()}_CHECKOUT_URL_TEMPLATE`, `PAYMENT_WEBHOOK_SECRET_${provider.toUpperCase()}`];
  }

  private toAuditObject(value: unknown) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }
}
