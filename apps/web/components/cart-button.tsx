'use client';

import { LockKeyhole, ShoppingCart, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthSession } from '../lib/auth-session';
import { useCartStore } from '../lib/cart-store';

export function CartButton() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuthSession();
  const items = useCartStore((state) => state.items);
  const totals = useCartStore((state) => state.totals);
  const hydrate = useCartStore((state) => state.hydrate);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);
  const clearLocal = useCartStore((state) => state.clearLocal);
  const checkout = useCartStore((state) => state.checkout);
  const isLoading = useCartStore((state) => state.isLoading);
  const isCheckingOut = useCartStore((state) => state.isCheckingOut);
  const error = useCartStore((state) => state.error);
  const notice = useCartStore((state) => state.notice);
  const lastCheckout = useCartStore((state) => state.lastCheckout);
  const visibleItems = isSignedIn ? items : [];
  const count = visibleItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (isSignedIn) {
      void hydrate();
    } else {
      clearLocal();
    }
  }, [clearLocal, hydrate, isSignedIn]);

  async function startCheckout() {
    try {
      await checkout();
    } catch {
      // The cart store already exposes the customer-friendly error.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:scale-105 hover:border-pine hover:text-pine active:translate-y-0 active:scale-95"
        aria-label={isSignedIn ? 'Open cart' : 'Sign in to use cart'}
        title={isSignedIn ? 'Cart' : 'Sign in to use cart'}
      >
        {isSignedIn ? <ShoppingCart size={17} /> : <LockKeyhole size={17} />}
        <span>{count}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-20 w-[min(380px,calc(100vw-32px))] rounded-lg border border-line bg-white p-4 shadow-panel">
          {!isSignedIn ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-saffron/20 text-saffron">
                  <LockKeyhole size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-black text-ink">Protected cart</h2>
                  <p className="text-xs text-muted">Sign in before adding designs.</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted">
                We keep carts behind accounts so purchases, invoices, download limits, and fraud checks stay tied to the real customer.
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-bold text-white transition hover:bg-[#1b4a3f]"
                >
                  <LockKeyhole size={16} />
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded border border-line bg-paper px-4 text-sm font-bold text-ink transition hover:border-pine hover:text-pine"
                >
                  <UserPlus size={16} />
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Private cart</h2>
                  <p className="text-xs text-muted">Server-saved for this account</p>
                </div>
                {visibleItems.length ? (
                  <button type="button" onClick={() => void clear()} className="text-xs font-semibold text-berry">
                    Clear
                  </button>
                ) : null}
              </div>

              {visibleItems.length ? (
                <div className="space-y-3">
                  {visibleItems.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 border-b border-line pb-3">
                      <div>
                        <p className="line-clamp-1 text-sm font-semibold text-ink">{item.title}</p>
                        <p className="text-xs text-muted">
                          {item.licenseName} / {item.quantity} x {item.currency} {item.unitPrice}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void remove(item.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-line bg-paper text-muted transition hover:scale-105 hover:border-berry hover:text-berry active:scale-95"
                        aria-label={`Remove ${item.title}`}
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>
                      {totals.currency} {totals.total}
                    </span>
                  </div>
                  <CartMessage error={error} notice={notice} orderNumber={lastCheckout?.order.orderNumber} />
                  <button
                    type="button"
                    disabled={isLoading || isCheckingOut}
                    onClick={() => void startCheckout()}
                    className="h-10 w-full rounded bg-pine text-sm font-semibold text-white transition hover:bg-[#1b4a3f] disabled:cursor-not-allowed disabled:opacity-60"
                    title="Create a private checkout request"
                  >
                    {isCheckingOut ? 'Creating checkout...' : 'Private checkout'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted">{isLoading ? 'Loading your private cart...' : 'Your cart is empty.'}</p>
                  <CartMessage error={error} notice={notice} orderNumber={lastCheckout?.order.orderNumber} />
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CartMessage({ error, notice, orderNumber }: { error: string | null; notice: string | null; orderNumber?: string }) {
  if (error) {
    return <div className="rounded border border-berry/25 bg-berry/10 p-3 text-xs font-bold leading-5 text-berry">{error}</div>;
  }

  if (!notice) {
    return null;
  }

  return (
    <div className="rounded border border-pine/25 bg-pine/10 p-3 text-xs font-bold leading-5 text-pine">
      {notice}
      {orderNumber ? <span className="mt-1 block text-muted">Order {orderNumber} is in manual review.</span> : null}
    </div>
  );
}
