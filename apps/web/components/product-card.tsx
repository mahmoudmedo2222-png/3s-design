'use client';

import { ArrowUpRight, BadgeCheck, LockKeyhole, ShoppingBag, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { useAuthSession } from '../lib/auth-session';
import { useCartStore } from '../lib/cart-store';
import { CompareButton } from './compare-button';
import { DesignPreview } from './design-preview';
import { MoodboardButton } from './moodboard-button';

function designFeeling(product: ProductSummary) {
  const moods = product.designDna?.moods ?? [];
  const styles = product.designDna?.styles ?? [];
  const first = moods[0] ?? styles[0];

  if (!first) {
    return 'Ready to make the brand feel sharper';
  }

  return `${first} mood`;
}

export function ProductCard({ product, compact = false }: { product: ProductSummary; compact?: boolean }) {
  const add = useCartStore((state) => state.add);
  const { isSignedIn } = useAuthSession();
  const [authNotice, setAuthNotice] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const detailHref = `/products/${product.slug}` as Route;
  const feeling = designFeeling(product);
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
    <article className="group overflow-hidden rounded-lg border border-white/[0.12] bg-white/[0.06] text-white shadow-[0_18px_58px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#f7d17e]/[0.35] hover:bg-white/[0.09]">
      <Link href={detailHref} className="relative block aspect-[4/3] overflow-hidden" aria-label={`View ${product.title}`}>
        <DesignPreview product={product} variant={compact ? 'mini' : 'card'} />
        {product.isFeatured ? (
          <span className="absolute left-2 top-2 rounded bg-[#f7d17e] px-2 py-1 text-[0.68rem] font-black text-[#101513]">Featured</span>
        ) : null}
        <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded border border-white/[0.15] bg-black/[0.35] px-2 py-1 text-[0.68rem] font-bold text-[#f7d17e] shadow-sm backdrop-blur-md">
          <Sparkles size={13} />
          <span className="truncate">{feeling}</span>
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="space-y-1">
          <Link href={detailHref} className="group/title inline-flex items-start gap-1">
            <h3 className="line-clamp-2 text-sm font-black text-white transition group-hover/title:text-[#f7d17e]">{product.title}</h3>
            <ArrowUpRight className="mt-0.5 shrink-0 text-white/[0.45] transition group-hover/title:text-[#f7d17e]" size={14} />
          </Link>
          {!compact && product.subtitle ? <p className="line-clamp-1 text-xs leading-5 text-white/[0.62]">{product.subtitle}</p> : null}
        </div>

        {!compact ? (
          <div className="grid gap-1.5 text-xs font-semibold text-white/[0.62]">
            <span className="inline-flex items-center gap-1">
              <BadgeCheck size={14} className="text-[#7bd8bd]" />
              Commercial, reusable license
            </span>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-base font-black text-[#f7d17e]">
            {displayCurrency} {displayPrice}
          </span>
          <div className="flex items-center gap-2">
            <CompareButton product={product} />
            {!compact ? <MoodboardButton product={product} /> : null}
            <button
              type="button"
              onClick={() => void addToCart()}
              disabled={isAdding}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-[#fff8e8] text-[#101513] transition hover:-translate-y-0.5 hover:scale-105 hover:border-[#f7d17e] hover:bg-[#f7d17e] active:translate-y-0 active:scale-95"
              aria-label={isSignedIn ? `Add ${product.title} to cart` : 'Sign in before adding to cart'}
              title={isSignedIn ? 'Add to cart' : 'Sign in before adding to cart'}
            >
              {isSignedIn ? <ShoppingBag size={17} /> : <LockKeyhole size={17} />}
            </button>
          </div>
        </div>
        {authNotice ? (
          <div className="rounded border border-[#f7d17e]/30 bg-[#f7d17e]/10 p-2 text-xs font-bold leading-5 text-[#f7d17e]">
            Sign in first so we can protect purchases, downloads, and fraud checks.{' '}
            <Link href={`/login?next=${encodeURIComponent(detailHref)}` as Route} className="underline">
              Sign in
            </Link>
          </div>
        ) : null}
        {cartNotice ? (
          <div className="rounded border border-[#7bd8bd]/30 bg-[#7bd8bd]/10 p-2 text-xs font-bold leading-5 text-[#7bd8bd]">
            Added to your private cart.
          </div>
        ) : null}
        {cartError ? (
          <div className="rounded border border-[#f08bb0]/30 bg-[#f08bb0]/10 p-2 text-xs font-bold leading-5 text-[#f08bb0]">
            {cartError}
          </div>
        ) : null}
      </div>
    </article>
  );
}
