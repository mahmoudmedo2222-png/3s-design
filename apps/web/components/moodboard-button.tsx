'use client';

import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { isMoodboardSaved, removeMoodboardProduct, saveMoodboardProduct } from '../lib/moodboard-store';

export function MoodboardButton({ product }: { product: ProductSummary }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isMoodboardSaved(product.id));
  }, [product.id]);

  function toggleSaved() {
    if (isMoodboardSaved(product.id)) {
      removeMoodboardProduct(product.id);
    } else {
      saveMoodboardProduct(product);
    }

    setSaved(isMoodboardSaved(product.id));
  }

  return (
    <button
      type="button"
      onClick={toggleSaved}
      className={`inline-flex h-9 w-9 items-center justify-center rounded border transition hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95 ${
        saved ? 'border-berry bg-berry text-white' : 'border-line bg-white text-ink hover:border-berry hover:text-berry'
      }`}
      aria-label={saved ? `Remove ${product.title} from moodboard` : `Save ${product.title} to moodboard`}
      title={saved ? 'Saved to moodboard' : 'Save to moodboard'}
    >
      <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
