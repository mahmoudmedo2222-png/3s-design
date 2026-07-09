'use client';

type HotjarWindow = Window & {
  hj?: (...args: unknown[]) => void;
};

export function trackHotjarEvent(name: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const hotjar = (window as HotjarWindow).hj;
  if (!hotjar) {
    return;
  }

  hotjar('event', name);
}
