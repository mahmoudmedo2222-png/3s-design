'use client';

import { ArrowUpRight, BrainCircuit, Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { queueAiSearch } from '../lib/ai-search';
import { useAuthSession } from '../lib/auth-session';
import { buildCustomerDecisionProfile, tasteMemoryChangedEvent, type CustomerDecisionProfile } from '../lib/taste-memory';
import { ActionLink, Button, Panel } from './ui';

const emptyProfile: CustomerDecisionProfile = {
  signature: 'quiet luxury direction',
  colors: [],
  styles: [],
  moods: [],
  useCases: [],
  prompt: 'Build a premium shortlist around quiet luxury, trust, and a polished customer feeling.',
  eventCount: 0,
  confidence: 'fresh',
  stage: 'new',
  nextAction: 'Start with a buyer moment or save two designs.',
  reasons: [],
  terms: [],
};

export function BuyerProfileRecovery({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { isSignedIn } = useAuthSession();
  const [profile, setProfile] = useState<CustomerDecisionProfile>(emptyProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setProfile(buildCustomerDecisionProfile());
      setReady(true);
    };

    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(tasteMemoryChangedEvent, refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(tasteMemoryChangedEvent, refresh);
    };
  }, []);

  if (!ready || (profile.stage === 'new' && profile.eventCount === 0 && !profile.reasons.length)) {
    return null;
  }

  function continueSearch() {
    queueAiSearch(profile.prompt);
    router.push(`/search?q=${encodeURIComponent(profile.prompt)}`);
  }

  return (
    <Panel tone="glass" className={`border-[#f7d17e]/20 bg-[#f7d17e]/[0.07] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
              <BrainCircuit size={17} />
            </span>
            <p className="text-sm font-black text-white">Continue from your buying profile</p>
            <span className="rounded border border-white/[0.12] bg-black/20 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-white/50">
              {isSignedIn ? 'account memory' : 'device memory'} / {profile.confidence}
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/66">
            {profile.signature}. {profile.nextAction}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {(profile.reasons.length ? profile.reasons : profile.terms.map((term) => `Signal: ${term}`)).slice(0, 4).map((reason) => (
              <span key={reason} className="rounded border border-white/[0.1] bg-black/20 px-2 py-1 text-[0.68rem] font-bold text-white/58">
                {reason}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={continueSearch} intent="gold" className="h-10 font-black">
            <Sparkles size={16} />
            Resume search
          </Button>
          <ActionLink href="/?intro=0#latest-designs" intent="ghost" icon={Search} className="h-10">
            Browse matches
          </ActionLink>
          <ActionLink href="/account" intent="ghost" icon={ArrowUpRight} className="h-10">
            Account
          </ActionLink>
        </div>
      </div>
    </Panel>
  );
}
