'use client';

import { ArrowUpRight, Scale, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { clearCompareProducts, compareChangedEvent, removeCompareProduct, readCompareProducts } from '../lib/compare-store';

export function CompareTray() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const next = readCompareProducts();
      setProducts(next);
      setOpen((current) => current && next.length > 0);
    };
    refresh();
    window.addEventListener(compareChangedEvent, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener(compareChangedEvent, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!products.length) {
    return null;
  }

  return (
    <section className="fixed bottom-4 right-4 z-50 w-[min(920px,calc(100vw-32px))] overflow-hidden rounded-lg border border-line bg-white text-ink shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 text-sm font-black">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-pine/10 text-pine">
            <Scale size={16} />
          </span>
          Compare {products.length}/3
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearCompareProducts}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-line bg-paper text-muted transition hover:border-berry hover:text-berry"
            aria-label="Clear compare"
            title="Clear compare"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-line bg-paper text-muted transition hover:border-pine hover:text-pine"
            aria-label="Collapse compare"
            title="Collapse"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="grid gap-2 p-3 md:grid-cols-3">
          {products.map((product) => (
            <CompareCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CompareCard({ product }: { product: ProductSummary }) {
  const license = product.defaultLicense ?? product.licenseOptions?.[0] ?? null;
  const dna = product.designDna;
  const signals = [
    dna?.industries?.[0],
    dna?.moods?.[0] ?? dna?.styles?.[0],
    dna?.colors?.slice(0, 2).join(' + '),
    dna?.platforms?.[0] ?? dna?.formats?.[0],
  ].filter(Boolean);

  return (
    <article className="rounded border border-line bg-paper p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-black text-ink">{product.title}</h3>
          <p className="mt-1 text-base font-black text-pine">
            {license?.currency ?? product.currency} {license?.price ?? product.basePrice}
          </p>
        </div>
        <button
          type="button"
          onClick={() => removeCompareProduct(product.id)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line bg-white text-muted transition hover:border-berry hover:text-berry"
          aria-label={`Remove ${product.title} from compare`}
          title="Remove"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {signals.length ? (
          signals.map((signal) => (
            <span key={signal} className="rounded border border-line bg-white px-2 py-1 text-[0.68rem] font-bold text-muted">
              {signal}
            </span>
          ))
        ) : (
          <span className="text-xs font-semibold text-muted">No design DNA yet</span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted">
        {license?.allowsCommercialUse
          ? 'Commercial reusable license. Private tailoring can create a brand-specific version.'
          : 'Review license details before checkout.'}
      </p>

      <Link
        href={`/products/${product.slug}`}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded bg-pine px-3 text-xs font-black text-white transition hover:bg-[#1b4a3f]"
      >
        Open product
        <ArrowUpRight size={14} />
      </Link>
    </article>
  );
}
