'use client';

import { BrainCircuit, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCustomerProfile, updateBuyerProfile } from '../lib/api';
import { queueAiSearch } from '../lib/ai-search';
import { useAuthSession } from '../lib/auth-session';
import {
  buildBuyerProfileSnapshot,
  buildCustomerDecisionProfile,
  rememberAccountBuyerProfile,
  tasteMemoryChangedEvent,
  type CustomerDecisionProfile,
} from '../lib/taste-memory';

const emptyTaste = buildEmptyTaste();

export function TasteMemoryPanel() {
  const router = useRouter();
  const { isSignedIn } = useAuthSession();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedSnapshot = useRef<string>('');
  const [taste, setTaste] = useState<CustomerDecisionProfile>(emptyTaste);
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'failed'>('local');

  const scheduleSync = useCallback((profile: CustomerDecisionProfile) => {
    const snapshot = buildBuyerProfileSnapshot(profile);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSyncedSnapshot.current) {
      return;
    }

    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }

    syncTimer.current = setTimeout(() => {
      setSyncState('syncing');
      updateBuyerProfile(snapshot)
        .then((response) => {
          lastSyncedSnapshot.current = serialized;
          rememberAccountBuyerProfile(response.buyerProfile);
          setSyncState('synced');
        })
        .catch(() => setSyncState('failed'));
    }, 700);
  }, []);

  useEffect(() => {
    const refresh = () => {
      const profile = buildCustomerDecisionProfile();
      setTaste(profile);

      if (isSignedIn) {
        scheduleSync(profile);
      }
    };

    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(tasteMemoryChangedEvent, refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(tasteMemoryChangedEvent, refresh);
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }
    };
  }, [isSignedIn, scheduleSync]);

  useEffect(() => {
    if (!isSignedIn) {
      setSyncState('local');
      return;
    }

    setSyncState('syncing');
    fetchCustomerProfile()
      .then((response) => {
        rememberAccountBuyerProfile(response.buyerProfile);
        const profile = buildCustomerDecisionProfile();
        setTaste(profile);
        const snapshot = buildBuyerProfileSnapshot(profile);
        lastSyncedSnapshot.current = JSON.stringify(snapshot);
        return updateBuyerProfile(snapshot);
      })
      .then((response) => {
        rememberAccountBuyerProfile(response.buyerProfile);
        setSyncState('synced');
      })
      .catch(() => setSyncState('failed'));
  }, [isSignedIn]);

  function openTasteSearch() {
    queueAiSearch(taste.prompt);
    router.push(`/search?q=${encodeURIComponent(taste.prompt)}`);
  }

  return (
    <section className="rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
          <BrainCircuit size={17} />
        </span>
        <div>
          <h2 className="text-lg font-black">Taste memory</h2>
          <p className="mt-1 text-xs leading-5 text-white/55">
            3S learns from saved designs, cart intent, and concierge searches on this device.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <MemoryRow label="Signature" value={taste.signature} />
        <MemoryRow label="Palette" value={taste.colors.slice(0, 3).join(', ') || 'Waiting for color signals'} />
        <MemoryRow label="Mood" value={taste.moods.slice(0, 2).join(' + ') || taste.styles.slice(0, 2).join(' + ') || 'Not shaped yet'} />
        <MemoryRow label="Account sync" value={syncLabel(syncState)} />
      </div>

      <button
        type="button"
        onClick={openTasteSearch}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#fff8e8] px-4 text-sm font-black text-[#101513] transition hover:bg-[#f7d17e]"
      >
        Build from memory
        <Sparkles size={16} />
      </button>
    </section>
  );
}

function MemoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/[0.1] bg-white/[0.05] p-2.5">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/38">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function syncLabel(state: 'local' | 'syncing' | 'synced' | 'failed') {
  if (state === 'synced') return 'Saved to account';
  if (state === 'syncing') return 'Syncing account profile';
  if (state === 'failed') return 'Local only, retrying later';
  return 'Local device memory';
}

function buildEmptyTaste(): CustomerDecisionProfile {
  return {
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
}
