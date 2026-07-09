'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { queueAiSearch } from '../lib/ai-search';
import { updateAttribution } from '../lib/attribution';
import { trackFunnelEvent } from '../lib/funnel-analytics';

export function IntentLink({ href, label, prompt, active }: { href: Route; label: string; prompt: string; active?: boolean }) {
  return (
    <Link
      href={href}
      onClick={() => {
        updateAttribution({ source: 'homepage-intent', intent: label, brief: prompt });
        trackFunnelEvent('home_intent_selected', { label, prompt });
        queueAiSearch(prompt);
      }}
      className={`whitespace-nowrap border-b pb-2 transition hover:border-gold hover:text-white ${
        active ? 'border-gold text-white' : 'border-transparent'
      }`}
    >
      {label}
    </Link>
  );
}
