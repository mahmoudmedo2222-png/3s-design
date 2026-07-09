import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  cartItems,
  carts,
  entitlements,
  licenses,
  orderItems,
  orders,
  productLicensePrices,
  products,
  productVariants,
  userProfiles,
  users,
} from '@3s-design/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type CartLine = {
  item: typeof cartItems.$inferSelect;
  product: typeof products.$inferSelect;
  variant: typeof productVariants.$inferSelect | null;
  license: typeof licenses.$inferSelect;
};

type CheckoutAttributionSnapshot = {
  source?: string | null;
  campaign?: string | null;
  medium?: string | null;
  intent?: string | null;
  brief?: string | null;
  referrer?: string | null;
  landingPath?: string | null;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
};

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class OrdersService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const lines = await this.getCartLines(cart.id);

    return {
      cart,
      items: lines.map((line) => this.serializeCartLine(line)),
      totals: this.calculateTotals(lines),
    };
  }

  async addCartItem(userId: string, input: AddCartItemDto) {
    this.assertUuid(input.productId, 'productId');
    this.assertUuid(input.licenseId, 'licenseId');
    this.assertOptionalUuid(input.variantId, 'variantId');

    const db = this.database.requireDb();
    const cart = await this.getOrCreateCart(userId);
    await this.assertNotAlreadyOwned(userId, input.productId, input.variantId, input.licenseId);

    const price = await this.resolveProductPrice(input.productId, input.variantId, input.licenseId);

    const [existing] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, input.productId),
          input.variantId ? eq(cartItems.variantId, input.variantId) : isNull(cartItems.variantId),
          eq(cartItems.licenseId, input.licenseId),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(cartItems)
        .set({
          quantity: 1,
          unitPrice: price,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(cartItems)
      .values({
        cartId: cart.id,
        productId: input.productId,
        variantId: input.variantId,
        licenseId: input.licenseId,
        quantity: 1,
        unitPrice: price,
      })
      .returning();

    return created;
  }

  async updateCartItem(userId: string, itemId: string, _input: UpdateCartItemDto) {
    this.assertUuid(itemId, 'itemId');

    const db = this.database.requireDb();
    const item = await this.assertCartItemOwner(userId, itemId);
    const [updated] = await db.update(cartItems).set({ quantity: 1, updatedAt: new Date() }).where(eq(cartItems.id, item.id)).returning();

    return updated;
  }

  async removeCartItem(userId: string, itemId: string) {
    this.assertUuid(itemId, 'itemId');

    const db = this.database.requireDb();
    const item = await this.assertCartItemOwner(userId, itemId);
    await db.delete(cartItems).where(eq(cartItems.id, item.id));

    return { removed: true };
  }

  async createPendingOrder(userId: string, input?: CreateCheckoutDto) {
    const db = this.database.requireDb();
    const checkoutInput = input ?? {};

    if (checkoutInput.idempotencyKey) {
      const [existingOrder] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, checkoutInput.idempotencyKey)))
        .limit(1);

      if (existingOrder) {
        return this.findOrder(userId, existingOrder.id);
      }
    }

    const cart = await this.getOrCreateCart(userId);
    const lines = await this.getCartLines(cart.id);

    if (!lines.length) {
      throw new BadRequestException('Cart is empty');
    }

    await Promise.all(lines.map((line) => this.assertNotAlreadyOwned(userId, line.product.id, line.variant?.id, line.license.id)));

    const totals = this.calculateTotals(lines);
    const orderNumber = this.createOrderNumber();
    const billingSnapshot = await this.createBillingSnapshot(userId, checkoutInput);

    const result = await db.transaction(async (tx) => {
      const [createdOrder] = await tx
        .insert(orders)
        .values({
          userId,
          orderNumber,
          checkoutSessionId: this.createCheckoutSessionId(),
          idempotencyKey: checkoutInput.idempotencyKey,
          status: 'pending',
          subtotal: totals.subtotal,
          discountTotal: '0.00',
          taxTotal: '0.00',
          total: totals.total,
          currency: totals.currency,
          billingSnapshot,
        })
        .returning();

      if (!createdOrder) {
        throw new BadRequestException('Order creation failed');
      }

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId: createdOrder.id,
          productId: line.product.id,
          variantId: line.variant?.id,
          licenseId: line.license.id,
          productSnapshot: this.productSnapshot(line),
          licenseSnapshot: this.licenseSnapshot(line),
          unitPrice: line.item.unitPrice,
          quantity: line.item.quantity,
          total: this.lineTotal(line),
        })),
      );

      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

      return createdOrder;
    });

    return this.findOrder(userId, result.id);
  }

  async listOrders(userId: string) {
    const rows = await this.database.requireDb().select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));

    return { items: rows };
  }

  async findOrder(userId: string, id: string) {
    const db = this.database.requireDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    return {
      ...order,
      items,
    };
  }

  private async getOrCreateCart(userId: string) {
    const db = this.database.requireDb();
    const [existing] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db.insert(carts).values({ userId }).onConflictDoNothing().returning();

    if (created) {
      return created;
    }

    const [cartAfterRace] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);

    if (!cartAfterRace) {
      throw new BadRequestException('Cart creation failed');
    }

    return cartAfterRace;
  }

  private async getCartLines(cartId: string): Promise<CartLine[]> {
    const rows = await this.database
      .requireDb()
      .select({
        item: cartItems,
        product: products,
        variant: productVariants,
        license: licenses,
      })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(licenses, eq(licenses.id, cartItems.licenseId))
      .where(eq(cartItems.cartId, cartId));

    return rows;
  }

  private async resolveProductPrice(productId: string, variantId: string | undefined, licenseId: string) {
    const db = this.database.requireDb();
    const [product] = await db
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product || product.status !== 'published') {
      throw new NotFoundException('Product not found');
    }

    if (variantId) {
      const [variant] = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
        .limit(1);

      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }
    }

    const [price] = await db
      .select({ price: productLicensePrices.price })
      .from(productLicensePrices)
      .where(and(eq(productLicensePrices.productId, productId), eq(productLicensePrices.licenseId, licenseId)))
      .limit(1);

    if (!price) {
      throw new BadRequestException('Product license price is not configured');
    }

    return price.price;
  }

  private async assertCartItemOwner(userId: string, itemId: string) {
    const [row] = await this.database
      .requireDb()
      .select({ item: cartItems, cart: carts })
      .from(cartItems)
      .innerJoin(carts, eq(carts.id, cartItems.cartId))
      .where(and(eq(cartItems.id, itemId), eq(carts.userId, userId)))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('Cart item not found');
    }

    return row.item;
  }

  private async assertNotAlreadyOwned(userId: string, productId: string, variantId: string | undefined | null, licenseId: string) {
    const [existing] = await this.database
      .requireDb()
      .select({ id: entitlements.id })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.userId, userId),
          eq(entitlements.productId, productId),
          eq(entitlements.licenseId, licenseId),
          eq(entitlements.isActive, true),
          variantId ? eq(entitlements.variantId, variantId) : isNull(entitlements.variantId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('You already own this product for the selected license');
    }
  }

  private async createBillingSnapshot(userId: string, input: CreateCheckoutDto) {
    const [row] = await this.database
      .requireDb()
      .select({
        user: {
          email: users.email,
          fullName: users.fullName,
        },
        profile: {
          country: userProfiles.country,
          city: userProfiles.city,
          preferredCurrency: userProfiles.preferredCurrency,
        },
      })
      .from(users)
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    return {
      customerName: row?.user.fullName,
      customerEmail: row?.user.email,
      country: input.billing?.country ?? row?.profile?.country ?? null,
      city: input.billing?.city ?? row?.profile?.city ?? null,
      preferredCurrency: input.billing?.preferredCurrency ?? row?.profile?.preferredCurrency ?? 'USD',
      attribution: this.createAttributionSnapshot(input),
    };
  }

  private createAttributionSnapshot(input: CreateCheckoutDto): CheckoutAttributionSnapshot | undefined {
    if (!input.attribution) {
      return undefined;
    }

    const snapshot: CheckoutAttributionSnapshot = {
      source: this.cleanSnapshotText(input.attribution.source, 180),
      campaign: this.cleanSnapshotText(input.attribution.campaign, 180),
      medium: this.cleanSnapshotText(input.attribution.medium, 180),
      intent: this.cleanSnapshotText(input.attribution.intent, 180),
      brief: this.cleanSnapshotText(input.attribution.brief, 180),
      referrer: this.cleanSnapshotText(input.attribution.referrer, 180),
      landingPath: this.cleanSnapshotText(input.attribution.landingPath, 260),
      firstSeenAt: this.cleanSnapshotText(input.attribution.firstSeenAt, 80),
      lastSeenAt: this.cleanSnapshotText(input.attribution.lastSeenAt, 80),
    };

    return Object.values(snapshot).some(Boolean) ? snapshot : undefined;
  }

  private cleanSnapshotText(value: string | null | undefined, limit: number) {
    const text = value?.replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, limit) : null;
  }

  private calculateTotals(lines: CartLine[]) {
    const subtotalCents = lines.reduce((sum, line) => sum + this.moneyToCents(this.lineTotal(line)), 0);
    const currency = lines[0]?.product.currency ?? 'USD';

    return {
      subtotal: this.centsToMoney(subtotalCents),
      discountTotal: '0.00',
      taxTotal: '0.00',
      total: this.centsToMoney(subtotalCents),
      currency,
    };
  }

  private serializeCartLine(line: CartLine) {
    return {
      id: line.item.id,
      quantity: line.item.quantity,
      unitPrice: line.item.unitPrice,
      total: this.lineTotal(line),
      product: {
        id: line.product.id,
        slug: line.product.slug,
        title: line.product.title,
      },
      variant: line.variant
        ? {
            id: line.variant.id,
            name: line.variant.name,
          }
        : null,
      license: {
        id: line.license.id,
        type: line.license.licenseType,
        name: line.license.name,
      },
    };
  }

  private productSnapshot(line: CartLine) {
    return {
      id: line.product.id,
      slug: line.product.slug,
      title: line.product.title,
      subtitle: line.product.subtitle,
      variant: line.variant
        ? {
            id: line.variant.id,
            name: line.variant.name,
            fileFormats: line.variant.fileFormats,
          }
        : null,
    };
  }

  private licenseSnapshot(line: CartLine) {
    return {
      id: line.license.id,
      type: line.license.licenseType,
      name: line.license.name,
      termsMarkdown: line.license.termsMarkdown,
    };
  }

  private lineTotal(line: CartLine) {
    return this.centsToMoney(this.moneyToCents(line.item.unitPrice) * line.item.quantity);
  }

  private moneyToCents(value: string) {
    return Math.round(Number(value) * 100);
  }

  private centsToMoney(value: number) {
    return (value / 100).toFixed(2);
  }

  private createOrderNumber() {
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    return `ORD-${Date.now()}-${suffix}`;
  }

  private createCheckoutSessionId() {
    return `chk_${randomBytes(12).toString('hex')}`;
  }

  private assertOptionalUuid(value: string | undefined | null, field: string) {
    if (value) {
      this.assertUuid(value, field);
    }
  }

  private assertUuid(value: string, field: string) {
    if (!uuidV4Pattern.test(value)) {
      throw new BadRequestException(`${field} must be a UUID v4`);
    }
  }
}
