'use client';

import { RotateCcw } from 'lucide-react';
import { ActionLink, Button, Panel } from '../components/ui';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 text-center dark:bg-[#0b0f0e]">
      <Panel className="max-w-lg p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-berry">Recovery needed</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Something interrupted this view</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          The page failed before it could finish loading. Try again, or return to the marketplace if the problem keeps happening.
        </p>
        {error.digest ? <p className="mt-3 text-xs font-bold text-muted">Error reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset} icon={RotateCcw} className="h-11 px-5">
            Try again
          </Button>
          <ActionLink href="/?intro=0" intent="secondary" className="h-11 px-5">
            Marketplace
          </ActionLink>
        </div>
      </Panel>
    </main>
  );
}
