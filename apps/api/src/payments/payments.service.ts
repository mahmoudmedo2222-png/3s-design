import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { orders, payments, paymentWebhookEvents } from '@3s-design/db/schema';
import { and, desc, eq } from 'drizzle-orm';
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

  async markPaymentPaid(paymentId: string, providerPaymentId?: string, actorUserId?: string) {
    const db = this.database.requireDb();
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'paid') {
      return this.finishPaidOrder(payment.orderId);
    }

    if (payment.status !== 'pending') {
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
    return this.failPayment(payment.id);
  }

  async handleProviderWebhook(providerValue: string, input: PaymentWebhookEventDto, secret: string | undefined) {
    if (!isPaymentProvider(providerValue)) {
      throw new BadRequestException('Unsupported payment provider');
    }

    this.assertWebhookSecret(providerValue, secret);

    const db = this.database.requireDb();
    const [existing] = await db
      .select({ id: paymentWebhookEvents.id, processedAt: paymentWebhookEvents.processedAt })
      .from(paymentWebhookEvents)
      .where(and(eq(paymentWebhookEvents.provider, providerValue), eq(paymentWebhookEvents.eventId, input.eventId)))
      .limit(1);

    if (existing) {
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
        eventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload ?? {
          providerPaymentId: input.providerPaymentId,
          status: input.status,
        },
      })
      .returning();

    if (!createdEvent) {
      throw new BadRequestException('Webhook event creation failed');
    }

    if (input.status === 'paid') {
      await this.markProviderPaymentPaid(providerValue, input.providerPaymentId);
    } else {
      await this.failProviderPayment(providerValue, input.providerPaymentId);
    }

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

  private assertWebhookSecret(provider: PaymentProvider, secret: string | undefined) {
    const envName = `PAYMENT_WEBHOOK_SECRET_${provider.toUpperCase()}`;
    const expected = this.config.get<string>(envName);

    if (!expected) {
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
      redirectUrl: this.getRedirectUrl(provider, payment.providerPaymentId),
      mode: provider === 'manual' ? 'manual_review' : 'provider_checkout',
    };
  }

  private getRedirectUrl(provider: PaymentProvider, providerPaymentId: string | null) {
    if (provider === 'manual') {
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
      };
    }

    const required = this.providerRequiredEnv(provider);
    const missing = required.filter((key) => !this.config.get<string>(key));

    return {
      provider,
      configured: missing.length === 0,
      mode: 'provider_checkout',
      missing,
    };
  }

  private providerCheckoutTemplate(provider: PaymentProvider) {
    return this.config.get<string>(`${provider.toUpperCase()}_CHECKOUT_URL_TEMPLATE`);
  }

  private providerRequiredEnv(provider: PaymentProvider) {
    if (provider === 'manual') {
      return [];
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
