'use client';

import { ArrowUpRight, Scale, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { clearCompareProducts, compareChangedEvent, removeCompareProduct, readCompareProducts } from '../lib/compare-store';
import { ActionLink, Badge, Button, Panel } from './ui';

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
    <Panel
      className={`fixed bottom-4 right-4 z-50 overflow-hidden rounded-lg border border-line bg-white text-ink shadow-[0_24px_90px_rgba(0,0,0,0.28)] transition-[width] ${
        open ? 'w-[min(920px,calc(100vw-32px))]' : 'w-[min(360px,calc(100vw-32px))]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 text-sm font-black"
          aria-label={open ? 'Collapse product comparison' : 'Open product comparison'}
          title={open ? 'Collapse comparison' : 'Open comparison'}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-pine/10 text-pine">
            <Scale size={16} />
          </span>
          Compare {products.length}/3
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            onClick={clearCompareProducts}
            icon={Trash2}
            intent="danger"
            size="icon"
            className="h-8 w-8 bg-paper text-muted"
            aria-label="Clear compare"
            title="Clear compare"
          />
          <Button
            type="button"
            onClick={() => setOpen(false)}
            icon={X}
            intent="secondary"
            size="icon"
            className="h-8 w-8 bg-paper text-muted"
            aria-label="Collapse compare"
            title="Collapse"
          />
        </div>
      </div>

      {open ? (
        <div className="grid gap-2 p-3 md:grid-cols-3">
          {products.map((product) => (
            <CompareCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </Panel>
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
    <Panel className="p-3 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-black text-ink">{product.title}</h3>
          <p className="mt-1 text-base font-black text-pine">
            {license?.currency ?? product.currency} {license?.price ?? product.basePrice}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => removeCompareProduct(product.id)}
          icon={X}
          intent="danger"
          size="icon"
          className="h-8 w-8 shrink-0 bg-white text-muted"
          aria-label={`Remove ${product.title} from compare`}
          title="Remove"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {signals.length ? (
          signals.map((signal, index) => (
            <Badge key={`${signal}-${index}`} className="bg-white normal-case tracking-normal">
              {signal}
            </Badge>
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

      <ActionLink href={`/products/${product.slug}`} icon={ArrowUpRight} className="mt-3 h-9 w-full px-3 text-xs font-black">
        Open product
      </ActionLink>
    </Panel>
  );
}
