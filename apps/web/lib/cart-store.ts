'use client';

import { create } from 'zustand';
import type { CartResponse, OrderResponse, PaymentSession, ProductSummary } from './api';
import { addCartItem, createCheckoutOrder, createPaymentSession, fetchCart, removeCartItem } from './api';
import { accessTokenKey } from './auth-session';
import { captureAttributionFromLocation, readAttribution } from './attribution';
import { rememberProductTaste } from './taste-memory';

export type CartItem = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  quantity: number;
  unitPrice: string;
  total: string;
  currency: string;
  licenseId: string;
  licenseName: string;
  licenseType: string;
};

type CartTotals = {
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  currency: string;
};

type CheckoutResult = {
  order: OrderResponse;
  payment: PaymentSession;
};

type CartState = {
  items: CartItem[];
  totals: CartTotals;
  isLoading: boolean;
  isCheckingOut: boolean;
  error: string | null;
  notice: string | null;
  lastCheckout: CheckoutResult | null;
  hydrate: () => Promise<void>;
  add: (product: ProductSummary, options?: { licenseId?: string }) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  clearLocal: () => void;
  checkout: () => Promise<CheckoutResult>;
};

const emptyTotals: CartTotals = {
  subtotal: '0.00',
  discountTotal: '0.00',
  taxTotal: '0.00',
  total: '0.00',
  currency: 'USD',
};

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  totals: emptyTotals,
  isLoading: false,
  isCheckingOut: false,
  error: null,
  notice: null,
  lastCheckout: null,

  hydrate: async () => {
    if (!canUseCart()) {
      get().clearLocal();
      return;
    }

    set({ isLoading: true, error: null });
    try {
      applyCartResponse(await fetchCart(), set);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Cart is not reachable right now',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  add: async (product, options) => {
    if (!canUseCart()) {
      throw new Error('Sign in first to protect purchases and downloads.');
    }

    const licenseId = options?.licenseId ?? product.defaultLicense?.id ?? product.licenseOptions?.[0]?.id;
    if (!licenseId) {
      throw new Error('This design needs a license price before it can be purchased.');
    }

    set({ isLoading: true, error: null, notice: null });
    try {
      await addCartItem({
        productId: product.id,
        licenseId,
        variantId: defaultVariantId(product),
      });
      rememberProductTaste(product, 'cart');
      applyCartResponse(await fetchCart(), set);
      set({ notice: 'Added to your private cart.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add this design';
      set({ error: message });
      throw new Error(message, { cause: error });
    } finally {
      set({ isLoading: false });
    }
  },

  remove: async (itemId) => {
    set({ isLoading: true, error: null, notice: null });
    try {
      await removeCartItem(itemId);
      applyCartResponse(await fetchCart(), set);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Could not remove this design',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  clear: async () => {
    set({ isLoading: true, error: null, notice: null });
    try {
      await Promise.all(get().items.map((item) => removeCartItem(item.id)));
      applyCartResponse(await fetchCart(), set);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Could not clear the cart',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  clearLocal: () => {
    set({ items: [], totals: emptyTotals, error: null, notice: null, lastCheckout: null });
  },

  checkout: async () => {
    if (!get().items.length) {
      throw new Error('Your cart is empty.');
    }

    const idempotencyKey = createIdempotencyKey();
    set({ isCheckingOut: true, error: null, notice: null, lastCheckout: null });
    try {
      const order = await createCheckoutOrder({
        idempotencyKey,
        attribution: captureAttributionFromLocation() ?? readAttribution(),
      });
      const payment = await createPaymentSession({
        orderId: order.id,
        provider: 'manual',
        idempotencyKey: `pay_${idempotencyKey}`,
        successUrl: typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined,
        cancelUrl: typeof window !== 'undefined' ? `${window.location.origin}/?intro=0` : undefined,
      });
      const result = { order, payment };
      applyCartResponse(await fetchCart(), set);
      set({
        lastCheckout: result,
        notice: 'Client ritual started. Your order is waiting for payment review, then the delivery desk opens.',
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout could not be created';
      set({ error: message });
      throw new Error(message, { cause: error });
    } finally {
      set({ isCheckingOut: false });
    }
  },
}));

function canUseCart() {
  return typeof window !== 'undefined' && Boolean(window.localStorage.getItem(accessTokenKey));
}

function applyCartResponse(response: CartResponse, set: (state: Partial<CartState>) => void) {
  set({
    items: response.items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      slug: item.product.slug,
      title: item.product.title,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      currency: response.totals.currency,
      licenseId: item.license.id,
      licenseName: item.license.name,
      licenseType: item.license.type,
    })),
    totals: response.totals,
  });
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `chk_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function defaultVariantId(product: ProductSummary) {
  const variants = (product as ProductSummary & { variants?: Array<{ id: string; isDefault: boolean }> }).variants;
  return variants?.find((variant) => variant.isDefault)?.id;
}
