'use client';

import type { ProductSummary } from './api';

const tasteMemoryKey = '3s-design-taste-memory';
export const tasteMemoryChangedEvent = '3s-design-taste-memory-changed';

type TasteAction = 'saved' | 'cart' | 'search' | 'viewed';

type TasteEvent = {
  id: string;
  action: TasteAction;
  title: string;
  slug?: string;
  prompt?: string;
  colors: string[];
  styles: string[];
  moods: string[];
  useCases: string[];
  createdAt: string;
};

export type TasteProfile = {
  signature: string;
  colors: string[];
  styles: string[];
  moods: string[];
  useCases: string[];
  prompt: string;
  eventCount: number;
};

export function rememberProductTaste(product: ProductSummary, action: Exclude<TasteAction, 'search'>) {
  writeTasteEvent({
    id: product.id,
    action,
    title: product.title,
    slug: product.slug,
    colors: product.designDna?.colors ?? [],
    styles: product.designDna?.styles ?? [],
    moods: product.designDna?.moods ?? [],
    useCases: [...(product.designDna?.industries ?? []), ...(product.designDna?.platforms ?? [])],
    createdAt: new Date().toISOString(),
  });
}

export function rememberSearchTaste(prompt: string) {
  const text = prompt.trim();
  if (!text) {
    return;
  }

  writeTasteEvent({
    id: `search-${Date.now()}`,
    action: 'search',
    title: text,
    prompt: text,
    colors: [],
    styles: [],
    moods: [],
    useCases: [],
    createdAt: new Date().toISOString(),
  });
}

export function readTasteEvents() {
  try {
    const raw = window.localStorage.getItem(tasteMemoryKey);
    return raw ? (JSON.parse(raw) as TasteEvent[]) : [];
  } catch {
    return [];
  }
}

export function buildTasteProfile(): TasteProfile {
  const events = readTasteEvents();
  const colors = topSignals(events.flatMap((event) => event.colors));
  const styles = topSignals(events.flatMap((event) => event.styles));
  const moods = topSignals(events.flatMap((event) => event.moods));
  const useCases = topSignals(events.flatMap((event) => event.useCases));
  const recentSearch = events.find((event) => event.action === 'search')?.prompt;
  const signature = [styles[0], moods[0], useCases[0]].filter(Boolean).join(' / ') || 'quiet luxury direction';

  return {
    signature,
    colors,
    styles,
    moods,
    useCases,
    eventCount: events.length,
    prompt:
      recentSearch ??
      `Build a premium shortlist around ${signature}, with ${colors.slice(0, 3).join(', ') || 'refined'} colors and a ${
        moods[0] ?? styles[0] ?? 'high-trust'
      } customer feeling.`,
  };
}

function writeTasteEvent(event: TasteEvent) {
  const next = [event, ...readTasteEvents().filter((item) => item.id !== event.id || item.action !== event.action)].slice(0, 80);
  window.localStorage.setItem(tasteMemoryKey, JSON.stringify(next));
  window.dispatchEvent(new Event(tasteMemoryChangedEvent));
}

function topSignals(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([value]) => value);
}
