'use client';

import { ArrowUpRight, Download, Loader2, LockKeyhole, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { useAuthSession } from '../lib/auth-session';
import { useCartStore } from '../lib/cart-store';
import { trackFunnelEvent } from '../lib/funnel-analytics';
import { CompareButton } from './compare-button';
import { DesignPreview } from './design-preview';
import { MoodboardButton } from './moodboard-button';
import { Badge } from './ui';

function designFeeling(product: ProductSummary) {
  const moods = product.designDna?.moods ?? [];
  const styles = product.designDna?.styles ?? [];
  const first = moods[0] ?? styles[0];

  if (!first) {
    return 'Ready to make the brand feel sharper';
  }

  return `${first} mood`;
}

function uniqueSignals(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

export function ProductCard({
  product,
  compact = false,
  sourcePrompt,
  sourceSignals,
}: {
  product: ProductSummary;
  compact?: boolean;
  sourcePrompt?: string;
  sourceSignals?: string[];
}) {
  const add = useCartStore((state) => state.add);
  const { isSignedIn } = useAuthSession();
  const [authNotice, setAuthNotice] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const detailHref = productDetailHref(product.slug, sourcePrompt, sourceSignals ?? product.match?.matchedSignals);
  const feeling = designFeeling(product);
  const primaryLicense = product.defaultLicense ?? product.licenseOptions?.[0] ?? null;
  const displayPrice = primaryLicense?.price ?? product.basePrice;
  const displayCurrency = primaryLicense?.currency ?? product.currency;
  const quickSignals = uniqueSignals([
    product.designDna?.industries?.[0],
    product.designDna?.platforms?.[0],
    product.designDna?.styles?.[0],
  ]);
  const bestFor = uniqueSignals([product.designDna?.industries?.[0], product.designDna?.platforms?.[0]]).join(' + ');
  const deliveryCue = product.designDna?.formats?.[0] ?? 'Vault delivery';
  const visibleMatchSignals = uniqueSignals([...(product.match?.matchedSignals ?? []), ...(sourceSignals ?? [])]).slice(0, compact ? 2 : 4);
  const hasPersonalSignals = Boolean(!product.match && visibleMatchSignals.length);

  async function addToCart() {
    trackFunnelEvent('product_add_to_cart_attempted', {
      source: 'card',
      productId: product.id,
      slug: product.slug,
      licenseId: primaryLicense?.id ?? null,
      signedIn: isSignedIn,
    });

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
      trackFunnelEvent('product_add_to_cart_succeeded', {
        source: 'card',
        productId: product.id,
        slug: product.slug,
        licenseId: primaryLicense?.id ?? null,
        price: displayPrice,
        currency: displayCurrency,
      });
      setCartNotice(true);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Could not add this design.');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <article className="product-card group">
      <Link href={detailHref} className="product-card__preview" aria-label={`View ${product.title}`}>
        <DesignPreview product={product} variant={compact ? 'mini' : 'card'} />
        {product.isFeatured ? (
          <Badge tone="gold" className="absolute start-2 top-2 border-transparent bg-gold text-cream-ink">
            Featured
          </Badge>
        ) : null}
        {product.match ? (
          <Badge tone="success" className="absolute end-2 top-2 bg-surface-inverse/75 shadow-sm backdrop-blur-md">
            {product.match.score}% fit
          </Badge>
        ) : null}
        <span className="visual-chip absolute bottom-2 start-2 max-w-[calc(100%-1rem)] border-white/[0.18] bg-black/[0.62] text-gold-strong shadow-sm backdrop-blur-md">
          <Sparkles size={13} />
          <span className="truncate">{feeling}</span>
        </span>
      </Link>

      <div className="product-card__body">
        <div className="space-y-1">
          <Link href={detailHref} className="group/title inline-flex min-w-0 items-start gap-1">
            <h3 className="product-card__title transition group-hover/title:text-gold-strong">{product.title}</h3>
            <ArrowUpRight className="mt-0.5 shrink-0 text-white/[0.65] transition group-hover/title:text-gold-strong" size={14} />
          </Link>
          {!compact && product.subtitle ? <p className="product-card__subtitle">{product.subtitle}</p> : null}
        </div>

        {product.match || hasPersonalSignals ? (
          <div className="product-card__decision">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[var(--3s-pine-bright)]">
                {product.match?.decisionTag ?? 'Matched your profile'}
              </span>
              <span className="text-[0.68rem] font-black text-white/70">{product.match?.confidenceLabel ?? 'Personalized'}</span>
            </div>
            {!compact ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/62">
                {product.match?.reason ?? `This design shares ${visibleMatchSignals.slice(0, 3).join(', ')} with your buying memory.`}
              </p>
            ) : null}
            {visibleMatchSignals.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {visibleMatchSignals.map((signal, index) => (
                  <span key={`${signal}-${index}`} className="visual-chip min-h-0 rounded px-2 py-1 text-[0.68rem]">
                    {signal}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!compact ? (
          <div className="grid gap-2 text-xs font-semibold text-white/[0.62]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={14} className="text-[var(--3s-pine-bright)]" />
              {primaryLicense?.allowsCommercialUse ? 'Commercial, editable license' : 'Reusable license details before checkout'}
            </span>
            <div className="product-card__proof">
              <span className="product-card__meta-row">
                <span className="text-white/65">Best for</span>
                <strong>{bestFor || 'Brand-ready campaign'}</strong>
              </span>
              <span className="product-card__meta-row">
                <span className="inline-flex items-center gap-1 text-white/65">
                  <Download size={13} />
                  Delivery
                </span>
                <strong>{deliveryCue}</strong>
              </span>
            </div>
            {quickSignals.length ? (
              <div className="flex flex-wrap gap-1.5">
                {quickSignals.map((signal, index) => (
                  <span key={`${signal}-${index}`} className="visual-chip min-h-0 rounded px-2 py-1 text-[0.68rem]">
                    {signal}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="product-card__footer">
          <span className="product-card__price">
            {displayCurrency} {displayPrice}
          </span>
          <div className="flex items-center gap-2">
            <CompareButton product={product} />
            {!compact ? <MoodboardButton product={product} /> : null}
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => void addToCart()}
                disabled={isAdding}
                className="product-card__icon-action"
                aria-label={`Add ${product.title} to cart`}
                title="Add to cart"
              >
                {isAdding ? <Loader2 className="animate-spin" size={17} /> : <ShoppingBag size={17} />}
              </button>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(detailHref)}` as Route}
                className="product-card__icon-action"
                aria-label="Sign in before adding to cart"
                title="Sign in before adding to cart"
              >
                <LockKeyhole size={17} />
              </Link>
            )}
          </div>
        </div>
        {authNotice ? (
          <div className="rounded border border-gold/35 bg-cream p-2 text-xs font-bold leading-5 text-cream-ink">
            Sign in first so we can protect purchases, downloads, and fraud checks.{' '}
            <Link href={`/login?next=${encodeURIComponent(detailHref)}` as Route} className="underline">
              Sign in
            </Link>
          </div>
        ) : null}
        {cartNotice ? (
          <div className="rounded border border-success/30 bg-success/10 p-2 text-xs font-bold leading-5 text-success">
            Added to your private cart.
          </div>
        ) : null}
        {cartError ? (
          <div className="rounded border border-berry/30 bg-berry/10 p-2 text-xs font-bold leading-5 text-berry">
            {cartError}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function productDetailHref(slug: string, sourcePrompt?: string, sourceSignals?: string[]) {
  if (!sourcePrompt?.trim()) {
    return `/products/${slug}` as Route;
  }

  const params = new URLSearchParams();
  params.set('brief', sourcePrompt.trim());
  const signals = uniqueSignals(sourceSignals ?? []).slice(0, 8);
  if (signals.length) {
    params.set('signals', signals.join('|'));
  }

  return `/products/${slug}?${params.toString()}` as Route;
}
