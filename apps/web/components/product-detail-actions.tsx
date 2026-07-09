'use client';

import { ArrowRight, BadgeCheck, Crown, LockKeyhole, ShoppingBag, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import type { ProductDetail } from '../lib/api';
import { useAuthSession } from '../lib/auth-session';
import { useCartStore } from '../lib/cart-store';
import { trackFunnelEvent } from '../lib/funnel-analytics';
import { CompareButton } from './compare-button';
import { MoodboardButton } from './moodboard-button';
import { ActionLink, Button, Notice, Panel } from './ui';

type ProductFitContext = {
  brief: string;
  signals: string[];
};

export function ProductDetailActions({ product, fitContext }: { product: ProductDetail; fitContext?: ProductFitContext | null }) {
  const add = useCartStore((state) => state.add);
  const { isSignedIn } = useAuthSession();
  const [authNotice, setAuthNotice] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const detailHref = `/products/${product.slug}` as Route;
  const privateTailoringHref = `/register?next=${encodeURIComponent(detailHref)}` as Route;
  const primaryLicense = product.defaultLicense ?? product.licenseOptions?.[0] ?? null;
  const licenseOptions = product.licenseOptions?.length ? product.licenseOptions : primaryLicense ? [primaryLicense] : [];
  const [selectedLicenseId, setSelectedLicenseId] = useState(primaryLicense?.id ?? licenseOptions[0]?.id ?? '');
  const selectedLicense = licenseOptions.find((license) => license.id === selectedLicenseId) ?? primaryLicense;
  const displayPrice = selectedLicense?.price ?? product.basePrice;
  const displayCurrency = selectedLicense?.currency ?? product.currency;
  const canPurchase = Boolean(selectedLicense);
  const licenseRules = [
    selectedLicense?.allowsCommercialUse ? 'Commercial use allowed' : 'Commercial use needs confirmation',
    selectedLicense?.allowsModification ? 'Brand edits allowed' : 'Edits need confirmation',
    selectedLicense?.allowsResale ? 'Resale permitted by license' : 'No resale of the base files',
  ];

  async function addToCart() {
    trackFunnelEvent('product_add_to_cart_attempted', {
      productId: product.id,
      slug: product.slug,
      licenseId: selectedLicense?.id ?? null,
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

    if (!canPurchase) {
      setCartError('This design needs a license price before it can be purchased.');
      return;
    }

    setIsAdding(true);

    try {
      await add(product, { licenseId: selectedLicense?.id });
      trackFunnelEvent('product_add_to_cart_succeeded', {
        productId: product.id,
        slug: product.slug,
        licenseId: selectedLicense?.id ?? null,
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
    <Panel className="p-3">
      {fitContext?.brief ? (
        <Panel className="mb-3 border-saffron/25 bg-saffron/10 p-3 shadow-none">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 shrink-0 text-saffron" size={16} />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-saffron">Personal fit before cart</p>
              <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-ink">&quot;{fitContext.brief}&quot;</p>
              {fitContext.signals.length ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  Matched on <strong>{fitContext.signals.slice(0, 3).join(', ')}</strong>. Choose the license only if these signals match
                  the buyer moment.
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Starting from</p>
          <p className="mt-1 text-2xl font-black text-pine">
            {displayCurrency} {displayPrice}
          </p>
          {selectedLicense ? <p className="mt-1 text-xs font-bold text-muted">{selectedLicense.name}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <CompareButton product={product} />
          <MoodboardButton product={product} />
        </div>
      </div>

      {licenseOptions.length > 1 ? (
        <div className="mt-4 grid gap-2" aria-label="License options">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Choose license</p>
          {licenseOptions.map((license) => {
            const active = license.id === selectedLicense?.id;

            return (
              <Button
                key={license.id}
                type="button"
                onClick={() => {
                  setSelectedLicenseId(license.id);
                  trackFunnelEvent('product_license_selected', {
                    productId: product.id,
                    slug: product.slug,
                    licenseId: license.id,
                    licenseName: license.name,
                    price: license.price,
                    currency: license.currency,
                  });
                }}
                intent={active ? 'primary' : 'secondary'}
                className={`grid h-auto justify-stretch gap-1 p-3 text-left ${
                  active ? 'border-pine bg-pine/10 text-ink' : 'border-line bg-paper text-ink hover:border-pine/45 dark:bg-[#0f1513]'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black">{license.name}</span>
                  <span className="shrink-0 text-sm font-black text-pine">
                    {license.currency} {license.price}
                  </span>
                </span>
                <span className="text-xs leading-5 text-muted">
                  {license.allowsCommercialUse ? 'Commercial' : 'Personal/review'} /{' '}
                  {license.allowsModification ? 'Editable' : 'Limited edits'} / {license.allowsResale ? 'Resale allowed' : 'No resale'}
                </span>
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        {!isSignedIn ? (
          <ActionLink
            href={`/login?next=${encodeURIComponent(detailHref)}` as Route}
            onClick={() => {
              trackFunnelEvent('product_add_to_cart_attempted', {
                productId: product.id,
                slug: product.slug,
                licenseId: selectedLicense?.id ?? null,
                signedIn: false,
              });
            }}
            icon={LockKeyhole}
            className="h-10"
          >
            Sign in to add license
          </ActionLink>
        ) : (
          <Button type="button" onClick={() => void addToCart()} disabled={isAdding || !canPurchase} icon={ShoppingBag}>
            {isAdding ? 'Adding...' : canPurchase ? `Add ${selectedLicense?.name ?? 'license'}` : 'License setup needed'}
          </Button>
        )}
        {authNotice ? (
          <Notice tone="info" className="border-saffron/35 bg-saffron/10 p-3 text-xs text-saffron">
            Sign in first so the license, payment, invoice, and download limits belong to your account.{' '}
            <Link href={`/login?next=${encodeURIComponent(detailHref)}` as Route} className="underline">
              Sign in
            </Link>
          </Notice>
        ) : null}
        {cartNotice ? (
          <Notice tone="success" className="p-3 text-xs">
            Added to cart. Review the license and create a private order when ready.
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ActionLink href="/account" intent="secondary" className="h-9 px-3 text-sm">
                Review in account
              </ActionLink>
              <ActionLink href="/checkout" icon={ArrowRight} className="h-9 px-3 text-sm">
                Go to checkout
              </ActionLink>
            </div>
          </Notice>
        ) : null}
        {cartError ? (
          <Notice tone="error" className="p-3 text-xs">
            {cartError}
          </Notice>
        ) : null}
        <ActionLink
          href={privateTailoringHref}
          icon={Crown}
          intent="gold"
          className="h-10 border-saffron/40 bg-saffron/10 text-ink hover:border-saffron hover:bg-saffron/20"
        >
          Request private tailoring
        </ActionLink>
      </div>

      <Panel className="mt-4 p-3 text-xs leading-5 text-muted shadow-none">
        Path: add license to private cart, create checkout, complete payment review, then unlock the download vault. The default purchase is
        non-exclusive unless a private tailoring agreement is created.
      </Panel>

      <Panel className="mt-3 grid gap-2 p-3 shadow-none">
        {[...licenseRules, 'Account owns the license', 'Payment review opens delivery', 'Download limits protect file value'].map(
          (item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-2 text-xs font-bold text-ink">
              <BadgeCheck className="shrink-0 text-pine" size={14} />
              {item}
            </div>
          ),
        )}
      </Panel>
    </Panel>
  );
}
