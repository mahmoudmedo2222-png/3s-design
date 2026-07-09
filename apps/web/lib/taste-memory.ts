'use client';

import type { BuyerProfileSnapshot, ProductSummary } from './api';
import { readAttribution } from './attribution';

const tasteMemoryKey = '3s-design-taste-memory';
const accountBuyerProfileKey = '3s-design-account-buyer-profile';
export const tasteMemoryChangedEvent = '3s-design-taste-memory-changed';

type TasteAction = 'saved' | 'cart' | 'search' | 'viewed' | 'studio';

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

export type CustomerDecisionProfile = TasteProfile & {
  confidence: 'fresh' | 'warming' | 'strong';
  stage: 'new' | 'exploring' | 'deciding';
  nextAction: string;
  reasons: string[];
  terms: string[];
};

export type StudioDirection = {
  brandName: string;
  mood: string;
  palette: string;
  output: string;
  prompt: string;
  savedAt: string;
};

const studioDirectionKey = '3s-design-studio-direction';
const studioDirectionUrlKey = 'studio';
const studioDirectionCookieMaxAge = 60 * 60 * 24 * 180;
export const studioDirectionChangedEvent = '3s-design-studio-direction-changed';

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
    colors: inferSignals(text, colorSignals),
    styles: inferSignals(text, styleSignals),
    moods: inferSignals(text, moodSignals),
    useCases: inferSignals(text, useCaseSignals),
    createdAt: new Date().toISOString(),
  });
}

export function saveStudioDirection(direction: Omit<StudioDirection, 'savedAt'>) {
  const saved: StudioDirection = {
    ...direction,
    savedAt: new Date().toISOString(),
  };

  writeJsonStorage(studioDirectionKey, saved);
  writeJsonCookie(studioDirectionKey, saved);
  writeJsonUrlState(studioDirectionUrlKey, saved);
  writeTasteEvent({
    id: `studio-${Date.now()}`,
    action: 'studio',
    title: direction.brandName || 'Studio direction',
    prompt: direction.prompt,
    colors: [direction.palette],
    styles: [direction.output],
    moods: [direction.mood],
    useCases: ['studio-preview'],
    createdAt: saved.savedAt,
  });
  window.dispatchEvent(new Event(studioDirectionChangedEvent));

  return saved;
}

export function readStudioDirection(): StudioDirection | null {
  return (
    readJsonUrlState<StudioDirection>(studioDirectionUrlKey) ??
    readJsonStorage<StudioDirection>(studioDirectionKey) ??
    readJsonCookie<StudioDirection>(studioDirectionKey) ??
    null
  );
}

export function readTasteEvents() {
  return readJsonStorage<TasteEvent[]>(tasteMemoryKey) ?? [];
}

export function readAccountBuyerProfile() {
  return readJsonStorage<BuyerProfileSnapshot>(accountBuyerProfileKey);
}

export function rememberAccountBuyerProfile(profile: BuyerProfileSnapshot) {
  writeJsonStorage(accountBuyerProfileKey, profile);
  window.dispatchEvent(new Event(tasteMemoryChangedEvent));
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

export function buildCustomerDecisionProfile(): CustomerDecisionProfile {
  const taste = buildTasteProfile();
  const accountProfile = readAccountBuyerProfile();
  const attribution = readAttribution();
  const attributionTerms = [
    attribution?.intent,
    attribution?.brief,
    attribution?.campaign,
    attribution?.medium,
    attribution?.source && attribution.source !== 'direct' ? attribution.source : null,
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/[,\s/+-]+/))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 2);

  const colors = topSignals([...taste.colors, ...(accountProfile?.colors ?? [])]);
  const styles = topSignals([...taste.styles, ...(accountProfile?.styles ?? [])]);
  const moods = topSignals([...taste.moods, ...(accountProfile?.moods ?? [])]);
  const useCases = topSignals([...taste.useCases, ...(accountProfile?.useCases ?? [])]);
  const terms = topSignals([...colors, ...styles, ...moods, ...useCases, ...(accountProfile?.terms ?? []), ...attributionTerms]).slice(
    0,
    10,
  );
  const eventCount = Math.max(taste.eventCount, accountProfile?.eventCount ?? 0);
  const confidence =
    eventCount >= 5 ? 'strong' : eventCount >= 2 || attribution?.brief || accountProfile?.confidence === 'warming' ? 'warming' : 'fresh';
  const stage =
    eventCount >= 4 ? 'deciding' : eventCount >= 1 || attribution?.brief || accountProfile?.stage === 'exploring' ? 'exploring' : 'new';
  const primaryIntent = attribution?.intent ?? attribution?.brief;
  const reasons = [
    primaryIntent ? `Intent: ${primaryIntent}` : null,
    styles[0] ? `Style: ${styles[0]}` : null,
    moods[0] ? `Mood: ${moods[0]}` : null,
    useCases[0] ? `Use: ${useCases[0]}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    ...taste,
    signature: taste.eventCount ? taste.signature : (accountProfile?.signature ?? taste.signature),
    colors,
    styles,
    moods,
    useCases,
    eventCount,
    confidence,
    stage,
    nextAction:
      stage === 'deciding'
        ? 'Open the strongest match and confirm license/delivery.'
        : stage === 'exploring'
          ? 'Use the memory brief to narrow the catalog.'
          : 'Start with a buyer moment or save two designs.',
    reasons: reasons.length ? reasons : (accountProfile?.reasons ?? []),
    terms,
    prompt: primaryIntent ?? accountProfile?.prompt ?? taste.prompt,
  };
}

export function buildBuyerProfileSnapshot(profile = buildCustomerDecisionProfile()): BuyerProfileSnapshot {
  return {
    signature: profile.signature,
    colors: profile.colors.slice(0, 10),
    styles: profile.styles.slice(0, 10),
    moods: profile.moods.slice(0, 10),
    useCases: profile.useCases.slice(0, 10),
    confidence: profile.confidence,
    stage: profile.stage,
    nextAction: profile.nextAction,
    reasons: profile.reasons.slice(0, 8),
    terms: profile.terms.slice(0, 16),
    prompt: profile.prompt,
    eventCount: profile.eventCount,
  };
}

function writeTasteEvent(event: TasteEvent) {
  const next = [event, ...readTasteEvents().filter((item) => item.id !== event.id || item.action !== event.action)].slice(0, 80);
  writeJsonStorage(tasteMemoryKey, next);
  window.dispatchEvent(new Event(tasteMemoryChangedEvent));
}

function readJsonStorage<TValue>(key: string): TValue | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as TValue) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Some embedded or private browser contexts disable localStorage; cookies keep studio recovery intact.
  }
}

function readJsonCookie<TValue>(key: string): TValue | null {
  try {
    const prefix = `${key}=`;
    const item = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(prefix))
      ?.slice(prefix.length);

    return item ? (JSON.parse(decodeURIComponent(item)) as TValue) : null;
  } catch {
    return null;
  }
}

function writeJsonCookie(key: string, value: unknown) {
  try {
    document.cookie = `${key}=${encodeURIComponent(JSON.stringify(value))}; max-age=${studioDirectionCookieMaxAge}; path=/; samesite=lax`;
  } catch {
    // The UI can still continue even when every client-side persistence layer is unavailable.
  }
}

function readJsonUrlState<TValue>(key: string): TValue | null {
  try {
    const raw = new URL(window.location.href).searchParams.get(key);
    return raw ? (JSON.parse(raw) as TValue) : null;
  } catch {
    return null;
  }
}

function writeJsonUrlState(key: string, value: unknown) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(key, JSON.stringify(value));
    window.history.replaceState(window.history.state, '', url);
  } catch {
    // URL state is a shareable fallback only; failing here should not block the studio flow.
  }
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

const colorSignals = ['black', 'gold', 'white', 'cream', 'red', 'green', 'blue', 'pink', 'silver', 'brown', 'orange', 'purple'];

const styleSignals = ['premium', 'luxury', 'minimal', 'bold', 'modern', 'classic', 'cinematic', 'clean', 'editorial', 'elegant'];
const moodSignals = ['calm', 'urgent', 'trust', 'warm', 'romantic', 'exclusive', 'playful', 'professional', 'appetite', 'celebration'];
const useCaseSignals = [
  'restaurant',
  'cafe',
  'menu',
  'real estate',
  'property',
  'wedding',
  'invitation',
  'sale',
  'instagram',
  'launch',
  'course',
];

function inferSignals(text: string, signals: string[]) {
  const normalized = text.toLowerCase();
  return signals.filter((signal) => normalized.includes(signal));
}
