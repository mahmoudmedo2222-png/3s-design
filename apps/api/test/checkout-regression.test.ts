import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

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

type CartItem = {
  id: string;
  productId: string;
  licenseId: string;
  unitPrice: string;
};

type CartResponse = {
  items: unknown[];
  totals: {
    total: string;
  };
};

type OrderResponse = {
  id: string;
  userId: string;
  orderNumber: string;
  checkoutSessionId: string;
  idempotencyKey: string | null;
  status: string;
  subtotal: string;
  total: string;
  currency: string;
  billingSnapshot: {
    customerName?: string;
    customerEmail?: string;
    country?: string | null;
    city?: string | null;
    preferredCurrency?: string;
  };
  items: Array<{
    id: string;
    productId: string;
    licenseId: string;
    unitPrice: string;
    quantity: number;
    total: string;
    productSnapshot: Record<string, unknown>;
    licenseSnapshot: Record<string, unknown>;
  }>;
};

type OrdersListResponse = {
  items: Array<{
    id: string;
    orderNumber: string;
    total: string;
  }>;
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
  const email = `checkout-${label}+${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
  const { response, body } = await postJson<AuthResponse>('/auth/register', {
    email,
    fullName: `Checkout ${label} User`,
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

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

void test('checkout regression: auth guard, empty cart, order creation, idempotency, ownership', async (t) => {
  const product = await getSellableProduct();
  const license = product.defaultLicense!;
  const buyer = await registerUser('buyer');
  const otherUser = await registerUser('other');

  await t.test('checkout requires authentication', async () => {
    const checkout = await postJson('/checkout', {
      idempotencyKey: `unauth-${randomUUID()}`,
    });

    assert.equal(checkout.response.status, 401);
  });

  await t.test('empty cart checkout is rejected', async () => {
    const checkout = await postJson('/checkout', { idempotencyKey: `empty-${randomUUID()}` }, buyer.accessToken);

    assert.equal(checkout.response.status, 400);
  });

  let orderId = '';
  const idempotencyKey = `checkout-${randomUUID()}`;

  await t.test('checkout creates a pending order from the cart and clears cart items', async () => {
    const added = await postJson<CartItem>(
      '/cart/items',
      {
        productId: product.id,
        licenseId: license.id,
        quantity: 1,
      },
      buyer.accessToken,
    );
    assert.ok(added.response.ok, `Expected add to cart to succeed, got ${added.response.status}`);
    assert.equal(added.body.productId, product.id);
    assert.equal(added.body.licenseId, license.id);

    const checkout = await postJson<OrderResponse>(
      '/checkout',
      {
        idempotencyKey,
        billing: {
          country: 'EG',
          city: 'Cairo',
          preferredCurrency: 'USD',
        },
      },
      buyer.accessToken,
    );

    assert.ok(checkout.response.ok, `Expected checkout to succeed, got ${checkout.response.status}`);
    assert.equal(checkout.body.userId, buyer.user.id);
    assert.equal(checkout.body.status, 'pending');
    assert.equal(checkout.body.idempotencyKey, idempotencyKey);
    assert.equal(checkout.body.subtotal, license.price);
    assert.equal(checkout.body.total, license.price);
    assert.equal(checkout.body.currency, license.currency);
    assert.equal(checkout.body.billingSnapshot.customerEmail, buyer.user.email);
    assert.equal(checkout.body.billingSnapshot.country, 'EG');
    assert.equal(checkout.body.billingSnapshot.city, 'Cairo');
    assert.equal(checkout.body.items.length, 1);
    assert.equal(checkout.body.items[0]?.productId, product.id);
    assert.equal(checkout.body.items[0]?.licenseId, license.id);
    assert.equal(checkout.body.items[0]?.unitPrice, license.price);
    assert.equal(checkout.body.items[0]?.quantity, 1);
    assert.ok(checkout.body.items[0]?.productSnapshot);
    assert.ok(checkout.body.items[0]?.licenseSnapshot);
    orderId = checkout.body.id;

    const cartResponse = await request('/cart', {
      headers: authHeaders(buyer.accessToken),
    });
    assert.ok(cartResponse.ok, `Expected cart load to succeed, got ${cartResponse.status}`);

    const cart = await json<CartResponse>(cartResponse);
    assert.equal(cart.items.length, 0);
    assert.equal(cart.totals.total, '0.00');
  });

  await t.test('checkout idempotency returns the existing order without needing cart contents', async () => {
    const checkout = await postJson<OrderResponse>('/checkout', { idempotencyKey }, buyer.accessToken);

    assert.ok(checkout.response.ok, `Expected idempotent checkout to succeed, got ${checkout.response.status}`);
    assert.equal(checkout.body.id, orderId);
    assert.equal(checkout.body.items.length, 1);
  });

  await t.test('orders are listed for owner and hidden from other users', async () => {
    const listResponse = await request('/orders', {
      headers: authHeaders(buyer.accessToken),
    });
    assert.ok(listResponse.ok, `Expected orders list to succeed, got ${listResponse.status}`);

    const orders = await json<OrdersListResponse>(listResponse);
    assert.ok(orders.items.some((order) => order.id === orderId));

    const ownerOrderResponse = await request(`/orders/${orderId}`, {
      headers: authHeaders(buyer.accessToken),
    });
    assert.ok(ownerOrderResponse.ok, `Expected owner order lookup to succeed, got ${ownerOrderResponse.status}`);

    const otherOrderResponse = await request(`/orders/${orderId}`, {
      headers: authHeaders(otherUser.accessToken),
    });
    assert.equal(otherOrderResponse.status, 404);
  });
});
