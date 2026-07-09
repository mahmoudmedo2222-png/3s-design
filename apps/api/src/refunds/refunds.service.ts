import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { entitlements, orders, payments, refundRequests, refunds, users } from '@3s-design/db/schema';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ResolveRefundRequestDto } from './dto/resolve-refund-request.dto';

const refundWindowMs = 24 * 60 * 60 * 1000;
const openRefundStatuses = ['requested', 'under_review'] as const;

@Injectable()
export class RefundsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async listUserRefunds(userId: string) {
    const rows = await this.database
      .requireDb()
      .select({
        refundRequest: refundRequests,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          currency: orders.currency,
          paidAt: orders.paidAt,
        },
      })
      .from(refundRequests)
      .innerJoin(orders, eq(orders.id, refundRequests.orderId))
      .where(eq(refundRequests.userId, userId))
      .orderBy(desc(refundRequests.requestedAt));

    return { items: rows };
  }

  async createUserRefundRequest(userId: string, input: CreateRefundRequestDto) {
    const db = this.database.requireDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'paid' || !order.paidAt) {
      throw new BadRequestException('Only paid orders can request a refund');
    }

    if (Date.now() - order.paidAt.getTime() > refundWindowMs) {
      throw new BadRequestException('Refund requests are only available within 24 hours of payment');
    }

    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`refund-request:${order.id}`}))`);

      const [existing] = await tx
        .select({ id: refundRequests.id, status: refundRequests.status })
        .from(refundRequests)
        .where(
          and(
            eq(refundRequests.orderId, order.id),
            or(eq(refundRequests.status, 'requested'), eq(refundRequests.status, 'under_review'), eq(refundRequests.status, 'approved')),
          ),
        )
        .limit(1);

      if (existing) {
        throw new BadRequestException(`Refund request already exists with status ${existing.status}`);
      }

      const [inserted] = await tx
        .insert(refundRequests)
        .values({
          orderId: order.id,
          userId,
          status: 'requested',
          reason: input.reason.trim(),
        })
        .returning();

      return inserted;
    });

    if (!created) {
      throw new BadRequestException('Refund request could not be created');
    }

    await this.audit.record({
      actorUserId: userId,
      action: 'refunds.requested',
      entityType: 'refund_request',
      entityId: created.id,
      after: this.toAuditObject(created),
    });

    return created;
  }

  async listAdminRefunds() {
    const rows = await this.database
      .requireDb()
      .select({
        refundRequest: refundRequests,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          currency: orders.currency,
          paidAt: orders.paidAt,
        },
        customer: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        },
      })
      .from(refundRequests)
      .innerJoin(orders, eq(orders.id, refundRequests.orderId))
      .innerJoin(users, eq(users.id, refundRequests.userId))
      .orderBy(desc(refundRequests.requestedAt))
      .limit(100);

    return { items: rows };
  }

  async approveRefundRequest(refundRequestId: string, actorUserId: string, input: ResolveRefundRequestDto) {
    const db = this.database.requireDb();
    const [request] = await db.select().from(refundRequests).where(eq(refundRequests.id, refundRequestId)).limit(1);

    if (!request) {
      throw new NotFoundException('Refund request not found');
    }

    if (!openRefundStatuses.includes(request.status as (typeof openRefundStatuses)[number])) {
      throw new BadRequestException('Refund request is not open');
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, request.orderId), eq(payments.status, 'paid')))
      .orderBy(desc(payments.paidAt))
      .limit(1);

    if (!payment) {
      throw new BadRequestException('Paid payment was not found for this order');
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      const [updatedRequest] = await tx
        .update(refundRequests)
        .set({
          status: 'approved',
          adminNote: input.adminNote,
          resolvedAt: now,
        })
        .where(
          and(eq(refundRequests.id, request.id), or(eq(refundRequests.status, 'requested'), eq(refundRequests.status, 'under_review'))),
        )
        .returning();

      if (!updatedRequest) {
        throw new BadRequestException('Refund request is not open');
      }

      const [updatedPayment] = await tx
        .update(payments)
        .set({
          status: 'refunded',
          updatedAt: now,
        })
        .where(and(eq(payments.id, payment.id), eq(payments.status, 'paid')))
        .returning();

      if (!updatedPayment) {
        throw new BadRequestException('Paid payment was not found for this order');
      }

      await tx
        .update(orders)
        .set({
          status: 'refunded',
          updatedAt: now,
        })
        .where(eq(orders.id, request.orderId));

      await tx
        .update(entitlements)
        .set({
          isActive: false,
          updatedAt: now,
        })
        .where(and(eq(entitlements.orderId, request.orderId), eq(entitlements.isActive, true)));

      await tx.insert(refunds).values({
        paymentId: updatedPayment.id,
        orderId: request.orderId,
        providerRefundId: input.providerRefundId,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        status: 'approved',
      });
    });

    await this.audit.record({
      actorUserId,
      action: 'admin.refunds.approved',
      entityType: 'refund_request',
      entityId: request.id,
      before: this.toAuditObject(request),
      after: {
        status: 'approved',
        orderId: request.orderId,
        paymentId: payment.id,
        entitlementLock: 'all_order_entitlements_deactivated',
      },
    });

    return this.findAdminRefund(refundRequestId);
  }

  async rejectRefundRequest(refundRequestId: string, actorUserId: string, input: ResolveRefundRequestDto) {
    const db = this.database.requireDb();
    const [request] = await db.select().from(refundRequests).where(eq(refundRequests.id, refundRequestId)).limit(1);

    if (!request) {
      throw new NotFoundException('Refund request not found');
    }

    if (!openRefundStatuses.includes(request.status as (typeof openRefundStatuses)[number])) {
      throw new BadRequestException('Refund request is not open');
    }

    const [updated] = await db
      .update(refundRequests)
      .set({
        status: 'rejected',
        adminNote: input.adminNote,
        resolvedAt: new Date(),
      })
      .where(and(eq(refundRequests.id, request.id), or(eq(refundRequests.status, 'requested'), eq(refundRequests.status, 'under_review'))))
      .returning();

    if (!updated) {
      throw new BadRequestException('Refund request is not open');
    }

    await this.audit.record({
      actorUserId,
      action: 'admin.refunds.rejected',
      entityType: 'refund_request',
      entityId: request.id,
      before: this.toAuditObject(request),
      after: this.toAuditObject(updated),
    });

    return this.findAdminRefund(refundRequestId);
  }

  private async findAdminRefund(refundRequestId: string) {
    const [row] = await this.database
      .requireDb()
      .select({
        refundRequest: refundRequests,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          currency: orders.currency,
          paidAt: orders.paidAt,
        },
        customer: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        },
      })
      .from(refundRequests)
      .innerJoin(orders, eq(orders.id, refundRequests.orderId))
      .innerJoin(users, eq(users.id, refundRequests.userId))
      .where(eq(refundRequests.id, refundRequestId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Refund request not found');
    }

    return row;
  }

  private toAuditObject(value: unknown) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }
}
