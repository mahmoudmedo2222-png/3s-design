'use client';

import { apiBaseUrl } from './api';
import { accessTokenKey } from './auth-session';
import { attributionPayload, captureAttributionFromLocation } from './attribution';

export const funnelEventsKey = '3s-design-funnel-events';
export const funnelSessionKey = '3s-design-funnel-session';
export const funnelChangedEvent = '3s-design-funnel-changed';

export type FunnelEventName =
  | 'home_intent_selected'
  | 'search_started'
  | 'search_completed'
  | 'search_result_clicked'
  | 'product_viewed'
  | 'product_license_selected'
  | 'product_add_to_cart_attempted'
  | 'product_add_to_cart_succeeded'
  | 'checkout_confirmation_toggled'
  | 'checkout_order_attempted'
  | 'checkout_order_created'
  | 'download_receipt_copied'
  | 'download_asset_requested';

export type FunnelEvent = {
  id: string;
  name: FunnelEventName;
  sessionId: string;
  payload: Record<string, string | number | boolean | null>;
  createdAt: string;
  path: string;
};

const eventLimit = 160;

export function trackFunnelEvent(name: FunnelEventName, payload: Record<string, string | number | boolean | null> = {}) {
  if (typeof window === 'undefined') {
    return null;
  }

  const attribution = captureAttributionFromLocation();
  const event: FunnelEvent = {
    id: createEventId(name),
    name,
    sessionId: getFunnelSessionId(),
    payload: sanitizePayload({ ...attributionPayload(attribution), ...payload }),
    createdAt: new Date().toISOString(),
    path: `${window.location.pathname}${window.location.search}`,
  };

  try {
    const next = [event, ...readFunnelEvents()].slice(0, eventLimit);
    window.localStorage.setItem(funnelEventsKey, JSON.stringify(next));
    window.dispatchEvent(new Event(funnelChangedEvent));
    void sendFunnelEvent(event);
  } catch {
    return null;
  }

  return event;
}

export function readFunnelEvents() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(funnelEventsKey);
    return raw ? (JSON.parse(raw) as FunnelEvent[]) : [];
  } catch {
    return [];
  }
}

export function summarizeFunnel(events = readFunnelEvents()) {
  const counts = new Map<FunnelEventName, number>();

  for (const event of events) {
    counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
  }

  return {
    eventCount: events.length,
    productViews: counts.get('product_viewed') ?? 0,
    licenseSelections: counts.get('product_license_selected') ?? 0,
    cartAdds: counts.get('product_add_to_cart_succeeded') ?? 0,
    checkoutAttempts: counts.get('checkout_order_attempted') ?? 0,
    ordersCreated: counts.get('checkout_order_created') ?? 0,
    downloadsRequested: counts.get('download_asset_requested') ?? 0,
  };
}

function getFunnelSessionId() {
  try {
    const current = window.localStorage.getItem(funnelSessionKey);
    if (current) {
      return current;
    }

    const next = `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(funnelSessionKey, next);
    return next;
  } catch {
    return 'session-unavailable';
  }
}

function sanitizePayload(payload: Record<string, string | number | boolean | null>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (typeof value === 'string') {
        return [key, value.slice(0, 180)];
      }

      return [key, value];
    }),
  );
}

function createEventId(name: FunnelEventName) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${name}-${crypto.randomUUID()}`;
  }

  return `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sendFunnelEvent(event: FunnelEvent) {
  try {
    const token = window.localStorage.getItem(accessTokenKey);
    await fetch(`${apiBaseUrl}/analytics/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      keepalive: true,
      body: JSON.stringify({
        name: event.name,
        sessionId: event.sessionId,
        path: event.path,
        payload: event.payload,
      }),
    });
  } catch {
    // Local funnel storage remains the fallback when analytics transport is unavailable.
  }
}
