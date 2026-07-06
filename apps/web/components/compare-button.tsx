'use client';

import { Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { compareChangedEvent, isCompareSelected, toggleCompareProduct } from '../lib/compare-store';

export function CompareButton({ product }: { product: ProductSummary }) {
  const [selected, setSelected] = useState(false);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const refresh = () => setSelected(isCompareSelected(product.id));
    refresh();
    window.addEventListener(compareChangedEvent, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener(compareChangedEvent, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [product.id]);

  function toggle() {
    const result = toggleCompareProduct(product);
    setSelected(isCompareSelected(product.id));

    if (result === 'full') {
      setNotice(true);
      window.setTimeout(() => setNotice(false), 1800);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        className={`inline-flex h-9 w-9 items-center justify-center rounded border transition hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95 ${
          selected ? 'border-pine bg-pine text-white' : 'border-line bg-white text-ink hover:border-pine hover:text-pine'
        }`}
        aria-label={selected ? `Remove ${product.title} from compare` : `Compare ${product.title}`}
        title={selected ? 'Selected for compare' : 'Compare'}
      >
        <Scale size={17} />
      </button>
      {notice ? (
        <span className="absolute bottom-10 right-0 z-20 w-44 rounded border border-saffron/30 bg-[#fff8e8] p-2 text-xs font-bold leading-5 text-ink shadow-panel">
          Compare is limited to 3 designs.
        </span>
      ) : null}
    </span>
  );
}
