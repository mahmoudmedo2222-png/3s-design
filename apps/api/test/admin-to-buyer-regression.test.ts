import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { entitlements, payments } from '@3s-design/db/schema';
import dotenv from 'dotenv';
import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const buyerPassword = 'StrongPass1234';

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
};

type CatalogItem = {
  id: string;
  slug?: string;
  licenseType?: string;
  name: string;
};

type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  status: string;
  basePrice: string;
  currency: string;
};

type PublishingChecks = {
  canPublish: boolean;
  missing: Array<{ key: string; message: string }>;
  current: {
    assets: Array<{ id: string; assetType: string; fileName: string }>;
    categoryIds: string[];
    tagIds: string[];
    licensePrices: Array<{ licenseId: string; price: string }>;
  };
};

type ProductListResponse = {
  items: Array<{
    id: string;
    slug: string;
    title: string;
    defaultLicense: {
      id: string;
      price: string;
      currency: string;
    } | null;
  }>;
};

type OrderResponse = {
  id: string;
  status: string;
  total: string;
  currency: string;
};

type PaymentSessionResponse = {
  id: string;
  orderId: string;
  providerPaymentId: string;
};

type AdminPaymentsResponse = {
  items: Array<{
    payment: {
      id: string;
      orderId: string;
      status: string;
      amount: string;
      currency: string;
    };
    order: {
      id: string;
      orderNumber: string;
      status: string;
    };
    customer: {
      email: string;
    };
  }>;
};

type AdminRefundsResponse = {
  items: Array<{
    refundRequest: {
      id: string;
      orderId: string;
      status: string;
      reason: string;
      adminNote: string | null;
    };
    order: {
      id: string;
      orderNumber: string;
      status: string;
      total: string;
      currency: string;
    };
    customer: {
      email: string;
    };
  }>;
};

type RefundRequestResponse = {
  id: string;
  orderId: string;
  status: string;
  reason: string;
};

type EntitlementsResponse = {
  items: Array<{
    id: string;
    order: { id: string };
    product: { id: string };
    isActive: boolean;
    assets: Array<{ id: string; assetType: string; fileName: string }>;
  }>;
};

type DownloadUrlResponse = {
  assetId: string;
  downloadUrl: string;
  method: 'GET';
};

type ReconcilePaymentsResponse = {
  expired: number;
  items: Array<{
    id: string;
    status: string;
  }>;
};

type WebhookResponse = {
  accepted: boolean;
  duplicate: boolean;
  processed: boolean;
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
  const text = (await response.text()) || '{}';
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Expected JSON response, got ${response.status}: ${text}`);
  }
}

async function sendJson<T>(path: string, body: unknown, token?: string, method: 'POST' | 'PUT' | 'PATCH' = 'POST') {
  const response = await request(path, {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(body),
  });

  return { response, body: await json<T>(response) };
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function loginAdmin() {
  assert.ok(adminEmail, 'ADMIN_EMAIL is required for admin-to-buyer regression.');
  assert.ok(adminPassword, 'ADMIN_PASSWORD is required for admin-to-buyer regression.');

  const { response, body } = await sendJson<AuthResponse>('/auth/login', {
    email: adminEmail,
    password: adminPassword,
  });

  assert.ok(response.ok, `Expected admin login to succeed, got ${response.status}`);
  assert.equal(body.user.role, 'admin');

  return body.accessToken;
}

async function registerBuyer(label: string) {
  const email = `admin-flow-${label}+${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
  const { response, body } = await sendJson<AuthResponse>('/auth/register', {
    email,
    fullName: `Admin Flow ${label}`,
    password: buyerPassword,
  });

  assert.ok(response.ok, `Expected buyer registration to succeed, got ${response.status}`);

  return body.accessToken;
}

async function backdatePayment(paymentId: string, createdAt: Date) {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, 'DATABASE_URL is required for admin-to-buyer regression test setup.');

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    await db.update(payments).set({ createdAt, updatedAt: createdAt }).where(eq(payments.id, paymentId));
  } finally {
    await pool.end();
  }
}

async function countEntitlementsForOrder(orderId: string) {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, 'DATABASE_URL is required for admin-to-buyer regression test setup.');

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const [row] = await db.select({ total: count() }).from(entitlements).where(eq(entitlements.orderId, orderId));
    return Number(row?.total ?? 0);
  } finally {
    await pool.end();
  }
}

void test('admin-to-buyer regression: publish product from admin and complete customer purchase/download', async () => {
  const adminToken = await loginAdmin();
  const suffix = randomUUID().slice(0, 8);
  const slug = `admin-flow-${suffix}`;

  const category = await sendJson<CatalogItem>(
    '/admin/catalog/categories',
    {
      slug: `restaurants-${suffix}`,
      name: `Restaurants ${suffix}`,
      description: 'Admin flow test category',
      sortOrder: 10,
    },
    adminToken,
  );
  assert.ok(category.response.ok, `Expected category creation to succeed, got ${category.response.status}`);

  const tag = await sendJson<CatalogItem>(
    '/admin/catalog/tags',
    {
      slug: `launch-${suffix}`,
      name: `Launch ${suffix}`,
    },
    adminToken,
  );
  assert.ok(tag.response.ok, `Expected tag creation to succeed, got ${tag.response.status}`);

  const license = await sendJson<CatalogItem>(
    '/admin/catalog/licenses',
    {
      licenseType: `commercial_${suffix}`,
      name: `Commercial ${suffix}`,
      description: 'Commercial launch license',
      priceMultiplier: '1',
      allowsCommercialUse: true,
      allowsModification: true,
      allowsResale: false,
      termsMarkdown: 'Commercial use is allowed. Resale of source files is not allowed.',
    },
    adminToken,
  );
  assert.ok(license.response.ok, `Expected license creation to succeed, got ${license.response.status}`);

  const product = await sendJson<AdminProduct>(
    '/admin/products',
    {
      title: `Admin Flow Restaurant Launch ${suffix}`,
      slug,
      subtitle: 'A full launch kit published through admin regression',
      description: 'A premium restaurant launch design kit with preview, delivery file, license pricing, and AI discovery signals.',
      basePrice: '39.00',
      currency: 'USD',
      status: 'draft',
      isFeatured: true,
    },
    adminToken,
  );
  assert.ok(product.response.ok, `Expected product creation to succeed, got ${product.response.status}`);

  await sendJson(
    `/admin/products/${product.body.id}/license-prices`,
    { prices: [{ licenseId: license.body.id, price: '39.00', currency: 'USD' }] },
    adminToken,
    'PUT',
  );
  await sendJson(`/admin/products/${product.body.id}/categories`, { categoryIds: [category.body.id] }, adminToken, 'PUT');
  await sendJson(`/admin/products/${product.body.id}/tags`, { tagIds: [tag.body.id] }, adminToken, 'PUT');

  for (const [key, value] of [
    ['dna.industry', 'restaurant'],
    ['dna.style', 'modern'],
    ['dna.mood', 'premium'],
    ['dna.color', 'black and gold'],
    ['dna.platform', 'instagram'],
    ['dna.format', 'zip'],
  ] as const) {
    const attribute = await sendJson(
      `/admin/products/${product.body.id}/attributes`,
      { key, value, label: key.replace('dna.', ''), sortOrder: 0 },
      adminToken,
    );
    assert.ok(attribute.response.ok, `Expected ${key} attribute creation to succeed, got ${attribute.response.status}`);
  }

  const preview = await sendJson(
    `/admin/products/${product.body.id}/assets`,
    {
      assetType: 'watermarked_preview',
      storageKey: `products/${slug}/watermarked-previews/${slug}.png`,
      fileName: `${slug}-preview.png`,
      mimeType: 'image/png',
      fileSize: 4096,
      assetStatus: 'ready',
      scanStatus: 'skipped',
      altText: `${product.body.title} preview`,
      sortOrder: 0,
      isPrimary: true,
      isPublicPreview: true,
    },
    adminToken,
  );
  assert.ok(preview.response.ok, `Expected preview asset creation to succeed, got ${preview.response.status}`);

  const delivery = await sendJson<{ id: string }>(
    `/admin/products/${product.body.id}/assets`,
    {
      assetType: 'delivery_zip',
      storageKey: `products/${slug}/deliveries/${slug}.zip`,
      fileName: `${slug}.zip`,
      mimeType: 'application/zip',
      fileSize: 8192,
      assetStatus: 'ready',
      scanStatus: 'skipped',
      sortOrder: 1,
      isPrimary: true,
      isPublicPreview: false,
    },
    adminToken,
  );
  assert.ok(delivery.response.ok, `Expected delivery asset creation to succeed, got ${delivery.response.status}`);

  const checksResponse = await request(`/admin/products/${product.body.id}/publishing-checks`, {
    headers: authHeaders(adminToken),
  });
  assert.ok(checksResponse.ok, `Expected publishing checks to succeed, got ${checksResponse.status}`);
  const checks = await json<PublishingChecks>(checksResponse);
  assert.equal(checks.canPublish, true, `Expected product to be publishable, missing: ${JSON.stringify(checks.missing)}`);
  assert.equal(checks.current.categoryIds.includes(category.body.id), true);
  assert.equal(checks.current.tagIds.includes(tag.body.id), true);
  assert.equal(
    checks.current.licensePrices.some((price) => price.licenseId === license.body.id),
    true,
  );
  assert.equal(
    checks.current.assets.some((asset) => asset.assetType === 'delivery_zip'),
    true,
  );

  const published = await sendJson<AdminProduct>(`/admin/products/${product.body.id}/publish`, {}, adminToken);
  assert.ok(published.response.ok, `Expected publish to succeed, got ${published.response.status}`);
  assert.equal(published.body.status, 'published');

  const productsResponse = await request('/products?limit=50');
  assert.ok(productsResponse.ok, `Expected public products to succeed, got ${productsResponse.status}`);
  const products = await json<ProductListResponse>(productsResponse);
  const publicProduct = products.items.find((item) => item.id === product.body.id);
  assert.ok(publicProduct, 'Expected admin-published product to appear in storefront products.');
  assert.ok(publicProduct.defaultLicense, 'Expected published product to expose default license.');

  const buyerToken = await registerBuyer('buyer');
  const cartAdd = await sendJson(
    '/cart/items',
    {
      productId: publicProduct.id,
      licenseId: publicProduct.defaultLicense.id,
      quantity: 1,
    },
    buyerToken,
  );
  assert.ok(cartAdd.response.ok, `Expected cart add to succeed, got ${cartAdd.response.status}`);

  const checkout = await sendJson<OrderResponse>(
    '/checkout',
    {
      idempotencyKey: `admin-flow-${randomUUID()}`,
      billing: { country: 'EG', city: 'Cairo', preferredCurrency: 'USD' },
    },
    buyerToken,
  );
  assert.ok(checkout.response.ok, `Expected checkout to succeed, got ${checkout.response.status}`);

  const payment = await sendJson<PaymentSessionResponse>(
    '/payments/sessions',
    {
      orderId: checkout.body.id,
      provider: 'manual',
      idempotencyKey: `payment-${randomUUID()}`,
      successUrl: 'http://localhost:3000/account',
      cancelUrl: 'http://localhost:3000/checkout',
    },
    buyerToken,
  );
  assert.ok(payment.response.ok, `Expected payment session to succeed, got ${payment.response.status}`);

  const buyerAdminPayments = await request('/admin/payments', {
    headers: authHeaders(buyerToken),
  });
  assert.equal(buyerAdminPayments.status, 403, 'Expected buyer to be blocked from admin payment desk.');

  const adminPaymentsResponse = await request('/admin/payments', {
    headers: authHeaders(adminToken),
  });
  assert.ok(adminPaymentsResponse.ok, `Expected admin payments list to succeed, got ${adminPaymentsResponse.status}`);
  const adminPayments = await json<AdminPaymentsResponse>(adminPaymentsResponse);
  assert.ok(
    adminPayments.items.some((item) => item.payment.id === payment.body.id && item.order.id === checkout.body.id),
    'Expected admin payment desk to list the pending manual payment.',
  );

  const markPaidWithoutStepUp = await sendJson(`/admin/payments/${payment.body.id}/mark-paid`, {}, adminToken);
  assert.equal(markPaidWithoutStepUp.response.status, 400, 'Expected admin mark-paid to require step-up password.');

  const markPaidWithWrongPassword = await sendJson(
    `/admin/payments/${payment.body.id}/mark-paid`,
    { adminPassword: 'WrongPassword123' },
    adminToken,
  );
  assert.equal(markPaidWithWrongPassword.response.status, 401, 'Expected wrong admin step-up password to be rejected.');

  const markFailedWithoutStepUp = await sendJson(`/admin/payments/${payment.body.id}/mark-failed`, {}, adminToken);
  assert.equal(markFailedWithoutStepUp.response.status, 400, 'Expected admin mark-failed to require step-up password.');

  const markFailedWithWrongPassword = await sendJson(
    `/admin/payments/${payment.body.id}/mark-failed`,
    { adminPassword: 'WrongPassword123' },
    adminToken,
  );
  assert.equal(markFailedWithWrongPassword.response.status, 401, 'Expected wrong admin mark-failed step-up password to be rejected.');

  const markPaid = await sendJson(
    `/admin/payments/${payment.body.id}/mark-paid`,
    { adminPassword, providerPaymentId: `admin-approved-${randomUUID()}` },
    adminToken,
  );
  assert.ok(markPaid.response.ok, `Expected admin mark-paid to succeed, got ${markPaid.response.status}`);

  const entitlementsResponse = await request('/downloads', {
    headers: authHeaders(buyerToken),
  });
  assert.ok(entitlementsResponse.ok, `Expected entitlements to succeed, got ${entitlementsResponse.status}`);
  const entitlements = await json<EntitlementsResponse>(entitlementsResponse);
  const entitlement = entitlements.items.find((item) => item.order.id === checkout.body.id && item.product.id === product.body.id);
  assert.ok(entitlement, 'Expected buyer entitlement for admin-published product.');
  const asset = entitlement.assets.find((item) => item.id === delivery.body.id);
  assert.ok(asset, 'Expected delivery asset in buyer delivery vault.');

  const download = await sendJson<DownloadUrlResponse>(`/downloads/${entitlement.id}/assets/${asset.id}/url`, {}, buyerToken);
  assert.ok(download.response.ok, `Expected download URL to succeed, got ${download.response.status}`);
  assert.equal(download.body.assetId, asset.id);
  assert.equal(download.body.method, 'GET');
  assert.ok(download.body.downloadUrl.includes(`products/${slug}/deliveries/${slug}.zip`));

  const refundRequest = await sendJson<RefundRequestResponse>(
    '/refunds',
    {
      orderId: checkout.body.id,
      reason: 'The delivered file does not open correctly in the expected software.',
    },
    buyerToken,
  );
  assert.ok(refundRequest.response.ok, `Expected refund request to succeed, got ${refundRequest.response.status}`);
  assert.equal(refundRequest.body.orderId, checkout.body.id);
  assert.equal(refundRequest.body.status, 'requested');

  const buyerAdminRefunds = await request('/admin/refunds', {
    headers: authHeaders(buyerToken),
  });
  assert.equal(buyerAdminRefunds.status, 403, 'Expected buyer to be blocked from admin refund desk.');

  const adminRefundsResponse = await request('/admin/refunds', {
    headers: authHeaders(adminToken),
  });
  assert.ok(adminRefundsResponse.ok, `Expected admin refunds list to succeed, got ${adminRefundsResponse.status}`);
  const adminRefunds = await json<AdminRefundsResponse>(adminRefundsResponse);
  assert.ok(
    adminRefunds.items.some((item) => item.refundRequest.id === refundRequest.body.id && item.order.id === checkout.body.id),
    'Expected admin refund desk to list the buyer refund request.',
  );

  const approveRefundWithoutStepUp = await sendJson(`/admin/refunds/${refundRequest.body.id}/approve`, {}, adminToken);
  assert.equal(approveRefundWithoutStepUp.response.status, 400, 'Expected admin refund approval to require step-up password.');

  const approveRefundWithWrongPassword = await sendJson(
    `/admin/refunds/${refundRequest.body.id}/approve`,
    { adminPassword: 'WrongPassword123' },
    adminToken,
  );
  assert.equal(approveRefundWithWrongPassword.response.status, 401, 'Expected wrong admin refund step-up password to be rejected.');

  const approveRefund = await sendJson(
    `/admin/refunds/${refundRequest.body.id}/approve`,
    {
      adminPassword,
      adminNote: 'Approved after file access review.',
      providerRefundId: `refund-${randomUUID()}`,
    },
    adminToken,
  );
  assert.ok(approveRefund.response.ok, `Expected admin refund approval to succeed, got ${approveRefund.response.status}`);

  const lockedEntitlementsResponse = await request('/downloads', {
    headers: authHeaders(buyerToken),
  });
  assert.ok(lockedEntitlementsResponse.ok, `Expected entitlements after refund to be readable, got ${lockedEntitlementsResponse.status}`);
  const lockedEntitlements = await json<EntitlementsResponse>(lockedEntitlementsResponse);
  const lockedEntitlement = lockedEntitlements.items.find((item) => item.id === entitlement.id);
  assert.ok(lockedEntitlement, 'Expected refunded entitlement to remain visible for customer history.');
  assert.equal(lockedEntitlement.isActive, false, 'Expected approved refund to deactivate the entitlement.');

  const downloadAfterRefund = await sendJson(`/downloads/${entitlement.id}/assets/${asset.id}/url`, {}, buyerToken);
  assert.equal(downloadAfterRefund.response.status, 403, 'Expected refunded entitlement download URLs to be blocked.');

  const secondCartAdd = await sendJson(
    '/cart/items',
    {
      productId: publicProduct.id,
      licenseId: publicProduct.defaultLicense.id,
      quantity: 1,
    },
    buyerToken,
  );
  assert.ok(secondCartAdd.response.ok, `Expected second cart add to succeed, got ${secondCartAdd.response.status}`);

  const staleCheckout = await sendJson<OrderResponse>(
    '/checkout',
    {
      idempotencyKey: `stale-admin-flow-${randomUUID()}`,
      billing: { country: 'EG', city: 'Cairo', preferredCurrency: 'USD' },
    },
    buyerToken,
  );
  assert.ok(staleCheckout.response.ok, `Expected stale checkout to succeed, got ${staleCheckout.response.status}`);

  const stalePayment = await sendJson<PaymentSessionResponse>(
    '/payments/sessions',
    {
      orderId: staleCheckout.body.id,
      provider: 'manual',
      idempotencyKey: `stale-payment-${randomUUID()}`,
      successUrl: 'http://localhost:3000/account',
      cancelUrl: 'http://localhost:3000/checkout',
    },
    buyerToken,
  );
  assert.ok(stalePayment.response.ok, `Expected stale payment session to succeed, got ${stalePayment.response.status}`);

  await backdatePayment(stalePayment.body.id, new Date(Date.now() - 72 * 60 * 60 * 1000));

  const reconcileWithoutStepUp = await sendJson('/admin/payments/reconcile-stale', {}, adminToken);
  assert.equal(reconcileWithoutStepUp.response.status, 400, 'Expected payment reconciliation to require step-up password.');

  const reconcileWithWrongPassword = await sendJson('/admin/payments/reconcile-stale', { adminPassword: 'WrongPassword123' }, adminToken);
  assert.equal(reconcileWithWrongPassword.response.status, 401, 'Expected wrong payment reconciliation password to be rejected.');

  const reconcile = await sendJson<ReconcilePaymentsResponse>('/admin/payments/reconcile-stale', { adminPassword }, adminToken);
  assert.ok(reconcile.response.ok, `Expected stale payment reconciliation to succeed, got ${reconcile.response.status}`);
  assert.ok(reconcile.body.expired >= 1, 'Expected stale payment reconciliation to expire at least one payment.');
  assert.ok(
    reconcile.body.items.some((item) => item.id === stalePayment.body.id && item.status === 'expired'),
    'Expected stale payment session to be marked expired.',
  );

  const latePaidWebhook = await sendJson<WebhookResponse>('/webhooks/payments/manual', {
    eventId: `manual-paid-after-expiry-${randomUUID()}`,
    eventType: 'payment.paid',
    providerPaymentId: stalePayment.body.providerPaymentId,
    status: 'paid',
    payload: { source: 'admin-flow-late-confirmation' },
  });
  assert.ok(latePaidWebhook.response.ok, `Expected late paid webhook after expiry to succeed, got ${latePaidWebhook.response.status}`);
  assert.equal(latePaidWebhook.body.accepted, true);
  assert.equal(latePaidWebhook.body.processed, true);

  const staleOrderAfterLatePaidResponse = await request(`/orders/${staleCheckout.body.id}`, {
    headers: authHeaders(buyerToken),
  });
  assert.ok(
    staleOrderAfterLatePaidResponse.ok,
    `Expected stale order lookup after late payment to succeed, got ${staleOrderAfterLatePaidResponse.status}`,
  );
  const staleOrderAfterLatePaid = await json<OrderResponse>(staleOrderAfterLatePaidResponse);
  assert.equal(staleOrderAfterLatePaid.status, 'paid', 'Expected late paid webhook to revive expired payment and pay the order.');
  assert.equal(await countEntitlementsForOrder(staleCheckout.body.id), 1, 'Expected late paid webhook to grant delivery entitlement.');
});
