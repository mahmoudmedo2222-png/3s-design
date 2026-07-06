'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { queueAiSearch } from '../lib/ai-search';

export function IntentLink({ href, label, prompt, active }: { href: Route; label: string; prompt: string; active?: boolean }) {
  return (
    <Link
      href={href}
      onClick={() => queueAiSearch(prompt)}
      className={`whitespace-nowrap border-b pb-2 transition hover:border-[#f7d17e] hover:text-white ${
        active ? 'border-[#f7d17e] text-white' : 'border-transparent'
      }`}
    >
      {label}
    </Link>
  );
}
