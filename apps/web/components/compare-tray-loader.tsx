'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CompareTray = dynamic(() => import('./compare-tray').then((module) => module.CompareTray), {
  ssr: false,
});

export function CompareTrayLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const handle = browserWindow.requestIdleCallback
      ? browserWindow.requestIdleCallback(() => setReady(true))
      : window.setTimeout(() => setReady(true), 1_200);

    return () => {
      if (browserWindow.cancelIdleCallback) {
        browserWindow.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, []);

  return ready ? <CompareTray /> : null;
}
