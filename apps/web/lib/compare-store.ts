'use client';

import type { ProductSummary } from './api';
import { rememberProductTaste } from './taste-memory';

const compareProductsKey = '3s-design-compare-products';
export const compareChangedEvent = '3s-design-compare-changed';
export const compareLimit = 3;

export function readCompareProducts() {
  try {
    const raw = window.localStorage.getItem(compareProductsKey);
    const products = raw ? (JSON.parse(raw) as ProductSummary[]) : [];
    return products.filter((product) => product?.id && product?.slug && product?.title).slice(0, compareLimit);
  } catch {
    return [];
  }
}

export function isCompareSelected(productId: string) {
  return readCompareProducts().some((product) => product.id === productId);
}

export function toggleCompareProduct(product: ProductSummary) {
  const products = readCompareProducts();

  if (products.some((item) => item.id === product.id)) {
    writeCompareProducts(products.filter((item) => item.id !== product.id));
    return 'removed' as const;
  }

  if (products.length >= compareLimit) {
    return 'full' as const;
  }

  writeCompareProducts([product, ...products]);
  rememberProductTaste(product, 'viewed');
  return 'added' as const;
}

export function removeCompareProduct(productId: string) {
  writeCompareProducts(readCompareProducts().filter((product) => product.id !== productId));
}

export function clearCompareProducts() {
  writeCompareProducts([]);
}

function writeCompareProducts(products: ProductSummary[]) {
  window.localStorage.setItem(compareProductsKey, JSON.stringify(products.slice(0, compareLimit)));
  window.dispatchEvent(new Event(compareChangedEvent));
}
