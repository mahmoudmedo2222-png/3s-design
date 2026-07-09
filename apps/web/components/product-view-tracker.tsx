'use client';

import { useEffect } from 'react';
import type { ProductDetail } from '../lib/api';
import { trackFunnelEvent } from '../lib/funnel-analytics';

export function ProductViewTracker({ product }: { product: ProductDetail }) {
  useEffect(() => {
    trackFunnelEvent('product_viewed', {
      productId: product.id,
      slug: product.slug,
      title: product.title,
      hasDefaultLicense: Boolean(product.defaultLicense),
      licenseCount: product.licenseOptions?.length ?? 0,
    });
  }, [product.defaultLicense, product.id, product.licenseOptions?.length, product.slug, product.title]);

  return null;
}
