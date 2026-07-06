import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { productAssets } from '@3s-design/db/schema';
import dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
const password = 'StrongPass1234';

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

type ProductSummary = {
  id: string;
  slug: string;
  defaultLicense: {
    id: string;
    price: string;
    currency: string;
  } | null;
};

type ProductsResponse = {
  items: ProductSummary[];
};

type OrderResponse = {
  id: string;
  userId: string;
  status: string;
  total: string;
  currency: string;
  items: Array<{
    id: string;
    productId: string;
    licenseId: string;
  }>;
};

type PaymentSessionResponse = {
  id: string;
  orderId: string;
  provider: string;
  status: string;
  providerPaymentId: string;
  amount: string;
  currency: string;
  redirectUrl: string | null;
  mode: string;
};

type WebhookResponse = {
  accepted: boolean;
  duplicate: boolean;
  processed: boolean;
};

type EntitlementsResponse = {
  items: Array<{
    id: string;
    product: {
      id: string;
      slug: string;
      title: string;
    };
    license: {
      id: string;
      name: string;
    };
    order: {
      id: string;
    };
    isActive: boolean;
    downloadsRemaining: number;
    hourlyDownloadsRemaining: number;
  }>;
};

type DownloadUrlResponse = {
  assetId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
  expiresIn: number;
  method: 'GET';
  downloadsRemaining: number;
  hourlyDownloadsRemaining: number;
};

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
}

async function json<T>(response: Response) {
  const body = (await response.text()) || '{}';

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`Expected JSON response, got status ${response.status}: ${body}`);
  }
}

async function postJson<T>(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = {};

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });

  return { response, body: await json<T>(response) };
}

async function registerUser(label: string) {
  const email = `sales-${label}+${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
  const { response, body } = await postJson<AuthResponse>('/auth/register', {
    email,
    fullName: `Sales ${label} User`,
    password,
  });

  assert.ok(response.ok, `Expected ${label} registration to succeed, got ${response.status}`);
  assert.ok(body.accessToken);

  return body;
}

async function getSellableProduct() {
  const response = await request('/products?limit=12');
  assert.ok(response.ok, `Expected product list to succeed, got ${response.status}`);

  const body = await json<ProductsResponse>(response);
  const product = body.items.find((item) => item.defaultLicense);

  assert.ok(product, 'Expected at least one published product with a default license. Run seed:demo if this fails.');
  assert.ok(product.defaultLicense);

  return product;
}

async function ensureDeliveryAsset(product: ProductSummary) {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, 'DATABASE_URL is required for sales-flow regression test setup.');

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const [existing] = await db
      .select()
      .from(productAssets)
      .where(and(eq(productAssets.productId, product.id), eq(productAssets.assetType, 'delivery_zip')))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(productAssets)
      .values({
        productId: product.id,
        assetType: 'delivery_zip',
        storageKey: `test/delivery/${product.slug}.zip`,
        fileName: `${product.slug}.zip`,
        mimeType: 'application/zip',
        fileSize: 2048,
        assetStatus: 'ready',
        scanStatus: 'skipped',
        isPrimary: true,
        isPublicPreview: false,
        sortOrder: 100,
      })
      .returning();

    assert.ok(created, 'Expected delivery asset to be created.');
    return created;
  } finally {
    await pool.end();
  }
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

void test('sales flow regression: auth -> cart -> checkout -> payment -> entitlement -> download URL', async (t) => {
  const product = await getSellableProduct();
  const license = product.defaultLicense!;
  const deliveryAsset = await ensureDeliveryAsset(product);
  const buyer = await registerUser('buyer');
  const otherUser = await registerUser('other');

  let orderId = '';
  let paymentSession!: PaymentSessionResponse;
  let entitlementId = '';

  await t.test('buyer creates order and manual payment session', async () => {
    const cartAdd = await postJson(
      '/cart/items',
      {
        productId: product.id,
        licenseId: license.id,
        quantity: 1,
      },
      buyer.accessToken,
    );
    assert.ok(cartAdd.response.ok, `Expected cart add to succeed, got ${cartAdd.response.status}`);

    const checkout = await postJson<OrderResponse>(
      '/checkout',
      {
        idempotencyKey: `sales-flow-${randomUUID()}`,
        billing: { country: 'EG', city: 'Cairo', preferredCurrency: 'USD' },
      },
      buyer.accessToken,
    );
    assert.ok(checkout.response.ok, `Expected checkout to succeed, got ${checkout.response.status}`);
    assert.equal(checkout.body.status, 'pending');
    assert.equal(checkout.body.total, license.price);
    assert.equal(checkout.body.items.length, 1);
    orderId = checkout.body.id;

    const payment = await postJson<PaymentSessionResponse>(
      '/payments/sessions',
      {
        orderId,
        provider: 'manual',
        idempotencyKey: `payment-${randomUUID()}`,
        successUrl: 'http://localhost:3000/account',
        cancelUrl: 'http://localhost:3000/cart',
      },
      buyer.accessToken,
    );
    assert.ok(payment.response.ok, `Expected payment session to succeed, got ${payment.response.status}`);
    assert.equal(payment.body.orderId, orderId);
    assert.equal(payment.body.provider, 'manual');
    assert.equal(payment.body.status, 'pending');
    assert.equal(payment.body.amount, license.price);
    assert.equal(payment.body.currency, license.currency);
    assert.equal(payment.body.mode, 'manual_review');
    assert.ok(payment.body.providerPaymentId);
    paymentSession = payment.body;
  });

  await t.test('other users cannot access the payment session', async () => {
    const otherPaymentResponse = await request(`/payments/${paymentSession.id}`, {
      headers: authHeaders(otherUser.accessToken),
    });
    assert.equal(otherPaymentResponse.status, 403);
  });

  await t.test('manual paid webhook marks order paid and grants entitlement idempotently', async () => {
    const eventId = `manual-paid-${randomUUID()}`;
    const paid = await postJson<WebhookResponse>(`/webhooks/payments/manual`, {
      eventId,
      eventType: 'payment.paid',
      providerPaymentId: paymentSession.providerPaymentId,
      status: 'paid',
      payload: { source: 'sales-flow-regression' },
    });

    assert.ok(paid.response.ok, `Expected payment webhook to succeed, got ${paid.response.status}`);
    assert.equal(paid.body.accepted, true);
    assert.equal(paid.body.duplicate, false);
    assert.equal(paid.body.processed, true);

    const duplicate = await postJson<WebhookResponse>(`/webhooks/payments/manual`, {
      eventId,
      eventType: 'payment.paid',
      providerPaymentId: paymentSession.providerPaymentId,
      status: 'paid',
    });

    assert.ok(duplicate.response.ok, `Expected duplicate webhook to succeed, got ${duplicate.response.status}`);
    assert.equal(duplicate.body.accepted, true);
    assert.equal(duplicate.body.duplicate, true);
    assert.equal(duplicate.body.processed, true);

    const orderResponse = await request(`/orders/${orderId}`, {
      headers: authHeaders(buyer.accessToken),
    });
    assert.ok(orderResponse.ok, `Expected paid order lookup to succeed, got ${orderResponse.status}`);

    const order = await json<OrderResponse>(orderResponse);
    assert.equal(order.status, 'paid');
  });

  await t.test('buyer receives entitlement and other user does not', async () => {
    const entitlementsResponse = await request('/downloads', {
      headers: authHeaders(buyer.accessToken),
    });
    assert.ok(entitlementsResponse.ok, `Expected entitlement list to succeed, got ${entitlementsResponse.status}`);

    const entitlements = await json<EntitlementsResponse>(entitlementsResponse);
    const entitlement = entitlements.items.find((item) => item.order.id === orderId && item.product.id === product.id);

    assert.ok(entitlement, 'Expected paid order to grant entitlement.');
    assert.equal(entitlement.license.id, license.id);
    assert.equal(entitlement.isActive, true);
    assert.ok(entitlement.downloadsRemaining > 0);
    entitlementId = entitlement.id;

    const otherEntitlementsResponse = await request('/downloads', {
      headers: authHeaders(otherUser.accessToken),
    });
    assert.ok(otherEntitlementsResponse.ok, `Expected other entitlement list to succeed, got ${otherEntitlementsResponse.status}`);

    const otherEntitlements = await json<EntitlementsResponse>(otherEntitlementsResponse);
    assert.equal(
      otherEntitlements.items.some((item) => item.order.id === orderId),
      false,
    );
  });

  await t.test('download URL is gated by entitlement ownership and asset type', async () => {
    const otherDownload = await postJson(`/downloads/${entitlementId}/assets/${deliveryAsset.id}/url`, {}, otherUser.accessToken);
    assert.equal(otherDownload.response.status, 404);

    const download = await postJson<DownloadUrlResponse>(
      `/downloads/${entitlementId}/assets/${deliveryAsset.id}/url`,
      {},
      buyer.accessToken,
    );

    assert.ok(download.response.ok, `Expected download URL creation to succeed, got ${download.response.status}`);
    assert.equal(download.body.assetId, deliveryAsset.id);
    assert.equal(download.body.fileName, deliveryAsset.fileName);
    assert.equal(download.body.mimeType, deliveryAsset.mimeType);
    assert.equal(download.body.method, 'GET');
    assert.ok(download.body.downloadUrl.includes(deliveryAsset.storageKey));
    assert.ok(download.body.downloadsRemaining >= 0);
  });
});
