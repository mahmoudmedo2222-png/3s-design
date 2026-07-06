'use client';

import type { ProductSummary } from './api';
import { rememberProductTaste } from './taste-memory';

const moodboardIdsKey = '3s-design-moodboard';
const moodboardProductsKey = '3s-design-moodboard-products';
export const moodboardChangedEvent = '3s-design-moodboard-changed';

export function readMoodboardProductIds() {
  try {
    return new Set<string>(JSON.parse(window.localStorage.getItem(moodboardIdsKey) ?? '[]'));
  } catch {
    return new Set<string>();
  }
}

export function readMoodboardProducts() {
  try {
    const raw = window.localStorage.getItem(moodboardProductsKey);
    const products = raw ? (JSON.parse(raw) as ProductSummary[]) : [];
    return products.filter((product) => product?.id && product?.slug && product?.title);
  } catch {
    return [];
  }
}

export function isMoodboardSaved(productId: string) {
  return readMoodboardProductIds().has(productId);
}

export function saveMoodboardProduct(product: ProductSummary) {
  const ids = readMoodboardProductIds();
  const products = readMoodboardProducts();
  ids.add(product.id);

  const nextProducts = [product, ...products.filter((item) => item.id !== product.id)].slice(0, 12);
  window.localStorage.setItem(moodboardIdsKey, JSON.stringify(Array.from(ids)));
  window.localStorage.setItem(moodboardProductsKey, JSON.stringify(nextProducts));
  rememberProductTaste(product, 'saved');
  window.dispatchEvent(new Event(moodboardChangedEvent));
}

export function removeMoodboardProduct(productId: string) {
  const ids = readMoodboardProductIds();
  ids.delete(productId);

  window.localStorage.setItem(moodboardIdsKey, JSON.stringify(Array.from(ids)));
  window.localStorage.setItem(moodboardProductsKey, JSON.stringify(readMoodboardProducts().filter((product) => product.id !== productId)));
  window.dispatchEvent(new Event(moodboardChangedEvent));
}
