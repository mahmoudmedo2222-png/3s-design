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
    <IdleMount fallback={<DeferredBlock className="min-h-[420px]" />}>
      <AiDiscoveryPanel />
    </IdleMount>
  );
}

export function DeferredBuyerProfileRecovery() {
  return (
    <IdleMount fallback={<DeferredBlock className="min-h-28" />}>
      <BuyerProfileRecovery />
    </IdleMount>
  );
}

export function DeferredClientStudioPreview({ locale }: { locale: AppLocale }) {
  return (
    <IdleMount fallback={<DeferredBlock className="mx-auto my-4 min-h-[520px] max-w-7xl" />}>
      <ClientStudioPreview locale={locale} />
    </IdleMount>
  );
}

export function DeferredSiteFooter({ products, locale }: { products: ProductSummary[]; locale: AppLocale }) {
  return (
    <IdleMount fallback={<DeferredBlock className="min-h-56 rounded-none" />}>
      <SiteFooter products={products} locale={locale} />
    </IdleMount>
  );
}

export function DeferredStorefrontDiscovery({ products }: { products: ProductSummary[] }) {
  return (
    <IdleMount fallback={<DeferredBlock className="min-h-[640px]" />}>
      <StorefrontDiscovery products={products} />
    </IdleMount>
  );
}

function DeferredBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg border border-white/[0.08] bg-white/[0.045] ${className}`} aria-hidden="true" />;
}

function IdleMount({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const windowWithIdle = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (windowWithIdle.requestIdleCallback) {
      const handle = windowWithIdle.requestIdleCallback(() => setMounted(true), { timeout: 1_200 });
      return () => windowWithIdle.cancelIdleCallback?.(handle);
    }

    const handle = window.setTimeout(() => setMounted(true), 1_200);
    return () => window.clearTimeout(handle);
  }, []);

  return mounted ? children : fallback;
}
