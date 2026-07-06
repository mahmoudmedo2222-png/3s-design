'use client';

import { Crown, LockKeyhole, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import type { ProductDetail } from '../lib/api';
import { useAuthSession } from '../lib/auth-session';
import { useCartStore } from '../lib/cart-store';
import { CompareButton } from './compare-button';
import { MoodboardButton } from './moodboard-button';

export function ProductDetailActions({ product }: { product: ProductDetail }) {
  const add = useCartStore((state) => state.add);
  const { isSignedIn } = useAuthSession();
  const [authNotice, setAuthNotice] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const detailHref = `/products/${product.slug}` as Route;
  const primaryLicense = product.defaultLicense ?? product.licenseOptions?.[0] ?? null;
  const displayPrice = primaryLicense?.price ?? product.basePrice;
  const displayCurrency = primaryLicense?.currency ?? product.currency;

  async function addToCart() {
    if (!isSignedIn) {
      setAuthNotice(true);
      setCartNotice(false);
      setCartError(null);
      return;
    }

    setAuthNotice(false);
    setCartNotice(false);
    setCartError(null);
    setIsAdding(true);

    try {
      await add(product);
      setCartNotice(true);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Could not add this design.');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm dark:bg-[#121816]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Starting from</p>
          <p className="mt-1 text-2xl font-black text-pine">
            {displayCurrency} {displayPrice}
          </p>
          {primaryLicense ? <p className="mt-1 text-xs font-bold text-muted">{primaryLicense.name}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <CompareButton product={product} />
          <MoodboardButton product={product} />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => void addToCart()}
          disabled={isAdding}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1b4a3f] active:translate-y-0 dark:bg-[#1f6b59] dark:hover:bg-[#247c68]"
        >
          {isSignedIn ? <ShoppingBag size={18} /> : <LockKeyhole size={18} />}
          {isAdding ? 'Adding...' : isSignedIn ? `Add ${primaryLicense?.name ?? 'license'}` : 'Sign in to add license'}
        </button>
        {authNotice ? (
          <div className="rounded border border-saffron/35 bg-saffron/10 p-3 text-xs font-bold leading-5 text-saffron">
            Sign in first so the license, payment, invoice, and download limits belong to your account.{' '}
            <Link href={`/login?next=${encodeURIComponent(detailHref)}` as Route} className="underline">
              Sign in
            </Link>
          </div>
        ) : null}
        {cartNotice ? (
          <div className="rounded border border-pine/25 bg-pine/10 p-3 text-xs font-bold leading-5 text-pine dark:text-[#7bd8bd]">
            Added to cart. Open the cart in the header to review the license.
          </div>
        ) : null}
        {cartError ? (
          <div className="rounded border border-berry/30 bg-berry/10 p-3 text-xs font-bold leading-5 text-berry">{cartError}</div>
        ) : null}
        <Link
          href="/register"
          className="inline-flex h-10 items-center justify-center gap-2 rounded border border-saffron/40 bg-saffron/10 px-4 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:border-saffron hover:bg-saffron/20 active:translate-y-0"
        >
          <Crown size={18} className="text-saffron" />
          Request private tailoring
        </Link>
      </div>

      <div className="mt-4 rounded border border-line bg-paper p-3 text-xs leading-5 text-muted dark:bg-[#0f1513]">
        Standard license is commercial, editable, and non-exclusive. The same base design can be sold again; private tailoring creates a
        custom version for your brand.
      </div>
    </div>
  );
}
