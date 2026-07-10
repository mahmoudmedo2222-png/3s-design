'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SiteIntro = dynamic(() => import('./site-intro').then((module) => module.SiteIntro), {
  ssr: false,
});

const introStorageKey = '3s-design-intro-seen';

export function SiteIntroLoader() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const introMode = new URLSearchParams(window.location.search).get('intro');

    if (introMode === '0') {
      return;
    }

    if (introMode === '1') {
      setShouldLoad(true);
      return;
    }

    try {
      setShouldLoad(window.sessionStorage.getItem(introStorageKey) !== 'true');
    } catch {
      setShouldLoad(true);
    }
  }, []);

  return shouldLoad ? <SiteIntro /> : null;
}
