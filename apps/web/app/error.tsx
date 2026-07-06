'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 text-center dark:bg-[#0b0f0e]">
      <section className="max-w-lg rounded-lg border border-line bg-white p-6 shadow-sm dark:bg-[#121816]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-berry">Recovery needed</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Something interrupted this view</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          The page failed before it could finish loading. Try again, or return to the marketplace if the problem keeps happening.
        </p>
        {error.digest ? <p className="mt-3 text-xs font-bold text-muted">Error reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded bg-pine px-5 text-sm font-bold text-white transition hover:bg-[#1b4a3f]"
          >
            <RotateCcw size={16} />
            Try again
          </button>
          <Link
            href="/?intro=0"
            className="inline-flex h-11 items-center justify-center rounded border border-line bg-white px-5 text-sm font-bold text-ink transition hover:border-pine hover:text-pine dark:bg-[#0f1513]"
          >
            Marketplace
          </Link>
        </div>
      </section>
    </main>
  );
}
