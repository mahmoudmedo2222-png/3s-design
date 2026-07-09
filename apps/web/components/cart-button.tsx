'use client';

import { BadgeCheck, LockKeyhole, ShoppingCart, Trash2, UserPlus } from 'lucide-react';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useAuthSession } from '../lib/auth-session';
import { useCartStore } from '../lib/cart-store';
import { ActionLink, Button, Notice, Panel } from './ui';

export function CartButton() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuthSession();
  const items = useCartStore((state) => state.items);
  const totals = useCartStore((state) => state.totals);
  const hydrate = useCartStore((state) => state.hydrate);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);
  const clearLocal = useCartStore((state) => state.clearLocal);
  const isLoading = useCartStore((state) => state.isLoading);
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

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        intent="secondary"
        className="shadow-sm hover:scale-105 active:scale-95"
        aria-label={isSignedIn ? 'Open cart' : 'Sign in to use cart'}
        title={isSignedIn ? 'Cart' : 'Sign in to use cart'}
      >
        {isSignedIn ? <ShoppingCart size={17} /> : <LockKeyhole size={17} />}
        <span>{count}</span>
      </Button>

      {open ? (
        <Panel className="absolute right-0 top-12 z-20 w-[min(380px,calc(100vw-32px))] p-4 shadow-panel">
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
                <ActionLink href="/login" icon={LockKeyhole} className="h-10">
                  Sign in
                </ActionLink>
                <ActionLink href="/register" icon={UserPlus} intent="secondary" className="h-10">
                  Create account
                </ActionLink>
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
                  <Button type="button" onClick={() => void clear()} intent="danger" size="sm">
                    Clear
                  </Button>
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
                      <Button
                        type="button"
                        onClick={() => void remove(item.id)}
                        icon={Trash2}
                        intent="danger"
                        size="icon"
                        className="h-8 w-8 bg-paper text-muted hover:scale-105 active:scale-95"
                        aria-label={`Remove ${item.title}`}
                        title="Remove"
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>
                      {totals.currency} {totals.total}
                    </span>
                  </div>
                  <CheckoutAssurance />
                  <CartMessage error={error} notice={notice} orderNumber={lastCheckout?.order.orderNumber} />
                  <ActionLink href={'/checkout' as Route} className="h-10 w-full" title="Open private checkout">
                    Open checkout
                  </ActionLink>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted">{isLoading ? 'Loading your private cart...' : 'Your cart is empty.'}</p>
                  <CartMessage error={error} notice={notice} orderNumber={lastCheckout?.order.orderNumber} />
                  <CheckoutAssurance />
                </div>
              )}
            </>
          )}
        </Panel>
      ) : null}
    </div>
  );
}

function CheckoutAssurance() {
  const items = ['Account-locked order', 'Manual payment review', 'Download vault after approval'];

  return (
    <Panel className="p-3 shadow-none">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-muted">What happens next</p>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2 text-xs font-bold text-ink">
            <BadgeCheck className="shrink-0 text-pine" size={14} />
            {item}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CartMessage({ error, notice, orderNumber }: { error: string | null; notice: string | null; orderNumber?: string }) {
  if (error) {
    return (
      <Notice tone="error" className="p-3 text-xs">
        {error}
      </Notice>
    );
  }

  if (!notice) {
    return null;
  }

  return (
    <Notice tone="success" className="p-3 text-xs">
      {notice}
      {orderNumber ? <span className="mt-1 block text-muted">Order {orderNumber} is in manual review.</span> : null}
    </Notice>
  );
}
