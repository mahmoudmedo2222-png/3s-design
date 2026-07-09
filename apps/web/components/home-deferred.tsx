'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProductSummary } from '../lib/api';
import type { AppLocale } from '../lib/locale';

const AiDiscoveryPanel = dynamic(() => import('./ai-discovery-panel').then((module) => module.AiDiscoveryPanel), {
  ssr: false,
  loading: () => <DeferredBlock className="min-h-[420px]" />,
});

const BuyerProfileRecovery = dynamic(() => import('./buyer-profile-recovery').then((module) => module.BuyerProfileRecovery), {
  ssr: false,
  loading: () => <DeferredBlock className="min-h-28" />,
});

const ClientStudioPreview = dynamic(() => import('./client-studio-preview').then((module) => module.ClientStudioPreview), {
  ssr: false,
  loading: () => <DeferredBlock className="mx-auto my-4 min-h-[520px] max-w-7xl" />,
});

const SiteFooter = dynamic(() => import('./site-footer').then((module) => module.SiteFooter), {
  ssr: false,
  loading: () => <DeferredBlock className="min-h-56 rounded-none" />,
});

const StorefrontDiscovery = dynamic(() => import('./storefront-discovery').then((module) => module.StorefrontDiscovery), {
  ssr: false,
  loading: () => <DeferredBlock className="min-h-[640px]" />,
});

export function DeferredAiDiscoveryPanel() {
  return (
    <ViewportMount fallback={<DeferredBlock className="min-h-[420px]" />}>
      <AiDiscoveryPanel />
    </ViewportMount>
  );
}

export function DeferredBuyerProfileRecovery() {
  return (
    <ViewportMount fallback={<DeferredBlock className="min-h-28" />} rootMargin="500px">
      <BuyerProfileRecovery />
    </ViewportMount>
  );
}

export function DeferredClientStudioPreview({ locale }: { locale: AppLocale }) {
  return (
    <ViewportMount fallback={<DeferredBlock className="mx-auto my-4 min-h-[520px] max-w-7xl" />} rootMargin="420px">
      <ClientStudioPreview locale={locale} />
    </ViewportMount>
  );
}

export function DeferredSiteFooter({ products, locale }: { products: ProductSummary[]; locale: AppLocale }) {
  return (
    <ViewportMount fallback={<DeferredBlock className="min-h-56 rounded-none" />}>
      <SiteFooter products={products} locale={locale} />
    </ViewportMount>
  );
}

export function DeferredStorefrontDiscovery({ products }: { products: ProductSummary[] }) {
  return (
    <ViewportMount fallback={<DeferredBlock className="min-h-[640px]" />}>
      <StorefrontDiscovery products={products} />
    </ViewportMount>
  );
}

function DeferredBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg border border-white/[0.08] bg-white/[0.045] ${className}`} aria-hidden="true" />;
}

function ViewportMount({ children, fallback, rootMargin = '300px' }: { children: ReactNode; fallback: ReactNode; rootMargin?: string }) {
  const [mounted, setMounted] = useState(false);
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mounted || !element) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      const handle = globalThis.setTimeout(() => setMounted(true), 1_800);
      return () => globalThis.clearTimeout(handle);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, mounted, rootMargin]);

  return <div ref={setElement}>{mounted ? children : fallback}</div>;
}
