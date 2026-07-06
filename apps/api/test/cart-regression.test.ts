import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
const password = 'StrongPass1234';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
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
  quantity: number;
  unitPrice: string;
  productId: string;
  variantId?: string | null;
  licenseId: string;
};

type CartResponse = {
  cart: {
    id: string;
    userId: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    total: string;
    product: {
      id: string;
      slug: string;
      title: string;
    };
    license: {
      id: string;
      type: string;
      name: string;
    };
  }>;
  totals: {
    subtotal: string;
    total: string;
    currency: string;
  };
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

async function patchJson<T>(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = {};

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await request(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers,
  });

  return { response, body: await json<T>(response) };
}

async function deleteJson<T>(path: string, token?: string) {
  const headers: Record<string, string> = {};

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await request(path, {
    method: 'DELETE',
    headers,
  });

  return { response, body: await json<T>(response) };
}

async function registerUser(label: string) {
  const email = `cart-${label}+${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
  const { response, body } = await postJson<AuthResponse>('/auth/register', {
    email,
    fullName: `Cart ${label} User`,
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

void test('cart regression: auth guard, item validation, ownership, uniqueness, update, delete', async (t) => {
  const product = await getSellableProduct();
  const license = product.defaultLicense!;
  const userA = await registerUser('owner');
  const userB = await registerUser('other');

  await t.test('cart endpoints require authentication', async () => {
    const getCart = await request('/cart');
    assert.equal(getCart.status, 401);

    const addItem = await postJson('/cart/items', {
      productId: product.id,
      licenseId: license.id,
      quantity: 1,
    });
    assert.equal(addItem.response.status, 401);
  });

  await t.test('cart rejects malformed or unsellable item input', async () => {
    const invalidUuid = await postJson(
      '/cart/items',
      {
        productId: 'not-a-uuid',
        licenseId: license.id,
        quantity: 1,
      },
      userA.accessToken,
    );
    assert.equal(invalidUuid.response.status, 400);

    const unknownProduct = await postJson(
      '/cart/items',
      {
        productId: randomUUID(),
        licenseId: license.id,
        quantity: 1,
      },
      userA.accessToken,
    );
    assert.equal(unknownProduct.response.status, 404);

    const unknownLicense = await postJson(
      '/cart/items',
      {
        productId: product.id,
        licenseId: randomUUID(),
        quantity: 1,
      },
      userA.accessToken,
    );
    assert.equal(unknownLicense.response.status, 400);
  });

  let itemId = '';

  await t.test('authenticated user can add an item and view cart totals', async () => {
    const addItem = await postJson<CartItem>(
      '/cart/items',
      {
        productId: product.id,
        licenseId: license.id,
        quantity: 1,
      },
      userA.accessToken,
    );

    assert.ok(addItem.response.ok, `Expected add cart item to succeed, got ${addItem.response.status}`);
    assert.equal(addItem.body.productId, product.id);
    assert.equal(addItem.body.licenseId, license.id);
    assert.equal(addItem.body.quantity, 1);
    assert.equal(addItem.body.unitPrice, license.price);
    itemId = addItem.body.id;

    const cartResponse = await request('/cart', {
      headers: authHeaders(userA.accessToken),
    });
    assert.ok(cartResponse.ok, `Expected get cart to succeed, got ${cartResponse.status}`);

    const cart = await json<CartResponse>(cartResponse);
    assert.equal(cart.cart.userId, userA.user.id);
    assert.equal(cart.items.length, 1);
    assert.equal(cart.items[0]?.id, itemId);
    assert.equal(cart.items[0]?.product.id, product.id);
    assert.equal(cart.items[0]?.license.id, license.id);
    assert.equal(cart.totals.total, license.price);
  });

  await t.test('duplicate add keeps one cart line for the same product and license', async () => {
    const duplicate = await postJson<CartItem>(
      '/cart/items',
      {
        productId: product.id,
        licenseId: license.id,
        quantity: 1,
      },
      userA.accessToken,
    );

    assert.ok(duplicate.response.ok, `Expected duplicate add to succeed, got ${duplicate.response.status}`);
    assert.equal(duplicate.body.id, itemId);

    const cartResponse = await request('/cart', {
      headers: authHeaders(userA.accessToken),
    });
    const cart = await json<CartResponse>(cartResponse);
    assert.equal(cart.items.length, 1);
  });

  await t.test('other users cannot update or delete a cart item they do not own', async () => {
    const update = await patchJson(`/cart/items/${itemId}`, { quantity: 1 }, userB.accessToken);
    assert.equal(update.response.status, 401);

    const remove = await deleteJson(`/cart/items/${itemId}`, userB.accessToken);
    assert.equal(remove.response.status, 401);

    const otherCartResponse = await request('/cart', {
      headers: authHeaders(userB.accessToken),
    });
    assert.ok(otherCartResponse.ok, `Expected other user cart to load, got ${otherCartResponse.status}`);

    const otherCart = await json<CartResponse>(otherCartResponse);
    assert.equal(otherCart.items.length, 0);
  });

  await t.test('owner can update and remove their cart item', async () => {
    const update = await patchJson<CartItem>(`/cart/items/${itemId}`, { quantity: 1 }, userA.accessToken);
    assert.ok(update.response.ok, `Expected owner update to succeed, got ${update.response.status}`);
    assert.equal(update.body.quantity, 1);

    const remove = await deleteJson<{ removed: true }>(`/cart/items/${itemId}`, userA.accessToken);
    assert.ok(remove.response.ok, `Expected owner delete to succeed, got ${remove.response.status}`);
    assert.equal(remove.body.removed, true);

    const cartResponse = await request('/cart', {
      headers: authHeaders(userA.accessToken),
    });
    const cart = await json<CartResponse>(cartResponse);
    assert.equal(cart.items.length, 0);
    assert.equal(cart.totals.total, '0.00');
  });
});
