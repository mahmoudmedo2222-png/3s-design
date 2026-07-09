'use client';

import { useEffect } from 'react';
import type { ProductDetail } from '../lib/api';
import { trackFunnelEvent } from '../lib/funnel-analytics';
import { rememberProductTaste } from '../lib/taste-memory';

export function ProductViewTracker({ product }: { product: ProductDetail }) {
  useEffect(() => {
    rememberProductTaste(product, 'viewed');
    trackFunnelEvent('product_viewed', {
      productId: product.id,
      slug: product.slug,
      title: product.title,
      hasDefaultLicense: Boolean(product.defaultLicense),
      licenseCount: product.licenseOptions?.length ?? 0,
    });
  }, [product]);

  return null;
}
