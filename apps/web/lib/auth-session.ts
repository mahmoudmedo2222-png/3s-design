'use client';

import { useEffect, useState } from 'react';
import type { AuthUser } from './api';

export const accessTokenKey = '3s-design-access-token';
export const refreshTokenKey = '3s-design-refresh-token';
export const refreshTokenExpiresAtKey = '3s-design-refresh-token-expires-at';
export const userKey = '3s-design-user';
export const authChangedEvent = '3s-design-auth-changed';
export const cartStorageKey = '3s-design-cart';

export type StoredAuthSession = {
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  user: AuthUser | null;
  isSignedIn: boolean;
};

const emptyAuthSession: StoredAuthSession = {
  accessToken: null,
  refreshToken: null,
  refreshTokenExpiresAt: null,
  user: null,
  isSignedIn: false,
};

export function readAuthSession(): StoredAuthSession {
  if (typeof window === 'undefined') {
    return emptyAuthSession;
  }

  const accessToken = window.localStorage.getItem(accessTokenKey);
  const refreshToken = window.localStorage.getItem(refreshTokenKey);
  const refreshTokenExpiresAt = window.localStorage.getItem(refreshTokenExpiresAtKey);
  const user = readStoredUser();

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
    user,
    isSignedIn: Boolean(accessToken && user),
  };
}

export function clearAuthSession() {
  window.localStorage.removeItem(accessTokenKey);
  window.localStorage.removeItem(refreshTokenKey);
  window.localStorage.removeItem(refreshTokenExpiresAtKey);
  window.localStorage.removeItem(userKey);
  window.localStorage.removeItem(cartStorageKey);
  window.dispatchEvent(new Event(authChangedEvent));
}

export function useAuthSession() {
  const [session, setSession] = useState<StoredAuthSession>(emptyAuthSession);

  useEffect(() => {
    const update = () => setSession(readAuthSession());
    update();
    window.addEventListener('storage', update);
    window.addEventListener(authChangedEvent, update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener(authChangedEvent, update);
    };
  }, []);

  return session;
}

function readStoredUser() {
  try {
    const raw = window.localStorage.getItem(userKey);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
