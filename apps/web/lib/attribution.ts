'use client';

export const attributionKey = '3s-design-attribution';
export const attributionChangedEvent = '3s-design-attribution-changed';

export type AttributionSnapshot = {
  source: string | null;
  campaign: string | null;
  medium: string | null;
  intent: string | null;
  brief: string | null;
  referrer: string | null;
  landingPath: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

type AttributionUpdate = Partial<Pick<AttributionSnapshot, 'source' | 'campaign' | 'medium' | 'intent' | 'brief' | 'referrer'>>;

const textLimit = 180;
const pathLimit = 260;

export function captureAttributionFromLocation() {
  if (typeof window === 'undefined') {
    return null;
  }

  const current = readAttribution();
  const url = new URL(window.location.href);
  const now = new Date().toISOString();
  const detected = {
    source: cleanText(url.searchParams.get('utm_source') ?? url.searchParams.get('source')),
    campaign: cleanText(url.searchParams.get('utm_campaign') ?? url.searchParams.get('campaign')),
    medium: cleanText(url.searchParams.get('utm_medium') ?? url.searchParams.get('medium')),
    intent: cleanText(url.searchParams.get('intent')),
    brief: cleanText(url.searchParams.get('brief') ?? url.searchParams.get('q')),
    referrer: cleanReferrer(document.referrer),
  };

  const next: AttributionSnapshot = {
    source: current?.source ?? detected.source ?? inferInternalSource(url.pathname),
    campaign: current?.campaign ?? detected.campaign ?? null,
    medium: current?.medium ?? detected.medium ?? null,
    intent: detected.intent ?? current?.intent ?? null,
    brief: detected.brief ?? current?.brief ?? null,
    referrer: current?.referrer ?? detected.referrer ?? null,
    landingPath: current?.landingPath ?? cleanPath(`${url.pathname}${url.search}`),
    firstSeenAt: current?.firstSeenAt ?? now,
    lastSeenAt: now,
  };

  writeAttribution(next);
  return next;
}

export function updateAttribution(input: AttributionUpdate) {
  if (typeof window === 'undefined') {
    return null;
  }

  const current = captureAttributionFromLocation() ?? createFallbackAttribution();
  const next: AttributionSnapshot = {
    ...current,
    source: cleanText(input.source) ?? current.source,
    campaign: cleanText(input.campaign) ?? current.campaign,
    medium: cleanText(input.medium) ?? current.medium,
    intent: cleanText(input.intent) ?? current.intent,
    brief: cleanText(input.brief) ?? current.brief,
    referrer: cleanReferrer(input.referrer ?? undefined) ?? current.referrer,
    lastSeenAt: new Date().toISOString(),
  };

  writeAttribution(next);
  return next;
}

export function readAttribution() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(attributionKey);
    return raw ? (JSON.parse(raw) as AttributionSnapshot) : null;
  } catch {
    return null;
  }
}

export function attributionPayload(snapshot = captureAttributionFromLocation()): Record<string, string | null> {
  if (!snapshot) {
    return {
      attributionSource: null,
      attributionCampaign: null,
      attributionMedium: null,
      attributionIntent: null,
      attributionBrief: null,
      attributionReferrer: null,
      attributionLandingPath: null,
      attributionFirstSeenAt: null,
    };
  }

  return {
    attributionSource: snapshot.source,
    attributionCampaign: snapshot.campaign,
    attributionMedium: snapshot.medium,
    attributionIntent: snapshot.intent,
    attributionBrief: snapshot.brief,
    attributionReferrer: snapshot.referrer,
    attributionLandingPath: snapshot.landingPath,
    attributionFirstSeenAt: snapshot.firstSeenAt,
  };
}

function writeAttribution(snapshot: AttributionSnapshot) {
  try {
    window.localStorage.setItem(attributionKey, JSON.stringify(snapshot));
    window.dispatchEvent(new Event(attributionChangedEvent));
  } catch {
    // Attribution improves decisions, but it must never block customer actions.
  }
}

function createFallbackAttribution(): AttributionSnapshot {
  const now = new Date().toISOString();
  const path = typeof window === 'undefined' ? '/' : cleanPath(`${window.location.pathname}${window.location.search}`);

  return {
    source: 'direct',
    campaign: null,
    medium: null,
    intent: null,
    brief: null,
    referrer: null,
    landingPath: path,
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

function inferInternalSource(pathname: string) {
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/products')) return 'product';
  if (pathname.startsWith('/checkout')) return 'checkout';
  if (pathname.startsWith('/account')) return 'account';
  return 'direct';
}

function cleanText(value: string | null | undefined) {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, textLimit) : null;
}

function cleanPath(value: string) {
  return value.replace(/\s+/g, '').slice(0, pathLimit) || '/';
}

function cleanReferrer(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, textLimit);
  } catch {
    return cleanText(value);
  }
}
