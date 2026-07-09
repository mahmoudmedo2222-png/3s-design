'use client';

import { Filter, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { buildCustomerDecisionProfile, tasteMemoryChangedEvent, type CustomerDecisionProfile } from '../lib/taste-memory';
import { CustomerEmptyState } from './customer-experience';
import { ProductCard } from './product-card';
import { Button, Input, Panel } from './ui';

const buyerNiches = [
  { id: 'all', label: 'All', terms: [] },
  { id: 'restaurant', label: 'Restaurants', terms: ['restaurant', 'cafe', 'coffee', 'food', 'burger', 'menu'] },
  { id: 'real-estate', label: 'Real estate', terms: ['real estate', 'property', 'broker', 'home', 'villa'] },
  { id: 'fashion', label: 'Fashion', terms: ['fashion', 'beauty', 'salon', 'cosmetic', 'style'] },
  { id: 'courses', label: 'Courses', terms: ['course', 'coach', 'training', 'academy', 'education'] },
  { id: 'events', label: 'Events', terms: ['event', 'launch', 'wedding', 'party', 'conference'] },
] as const;

const sortModes = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price-low', label: 'Entry price' },
  { id: 'featured', label: 'Featured first' },
] as const;

const intentPrompts = [
  'premium restaurant instagram',
  'black friday sale urgency',
  'calm real estate listing',
  'luxury wedding invitation',
  'cafe launch story kit',
] as const;

function productText(product: ProductSummary) {
  return [
    product.title,
    product.subtitle,
    product.description,
    ...(product.designDna?.industries ?? []),
    ...(product.designDna?.styles ?? []),
    ...(product.designDna?.moods ?? []),
    ...(product.designDna?.platforms ?? []),
    ...(product.designDna?.occasions ?? []),
    ...(product.designDna?.audiences ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function nicheCount(products: ProductSummary[], terms: readonly string[]) {
  if (!terms.length) {
    return products.length;
  }

  return products.filter((product) => terms.some((term) => productText(product).includes(term))).length;
}

const emptyDecisionProfile: CustomerDecisionProfile = {
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

export function StorefrontDiscovery({ products }: { products: ProductSummary[] }) {
  const [activeNiche, setActiveNiche] = useState<(typeof buyerNiches)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<(typeof sortModes)[number]['id']>('recommended');
  const [decisionProfile, setDecisionProfile] = useState<CustomerDecisionProfile>(emptyDecisionProfile);

  useEffect(() => {
    const refresh = () => setDecisionProfile(buildCustomerDecisionProfile());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(tasteMemoryChangedEvent, refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(tasteMemoryChangedEvent, refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const niche = buyerNiches.find((item) => item.id === activeNiche) ?? buyerNiches[0];
    const normalizedQuery = query.trim().toLowerCase();

    const matches = products.filter((product) => {
      const text = productText(product);
      const matchesNiche = !niche.terms.length || niche.terms.some((term) => text.includes(term));
      const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);

      return matchesNiche && matchesQuery;
    });

    return [...matches].sort((left, right) => {
      if (sortMode === 'price-low') {
        return Number(left.defaultLicense?.price ?? left.basePrice) - Number(right.defaultLicense?.price ?? right.basePrice);
      }

      if (sortMode === 'featured') {
        return Number(Boolean(right.isFeatured)) - Number(Boolean(left.isFeatured));
      }

      const rightMemoryScore = productMemoryScore(right, decisionProfile.terms);
      const leftMemoryScore = productMemoryScore(left, decisionProfile.terms);
      const rightSignals =
        (right.designDna?.moods?.length ?? 0) + (right.designDna?.styles?.length ?? 0) + (right.designDna?.platforms?.length ?? 0);
      const leftSignals =
        (left.designDna?.moods?.length ?? 0) + (left.designDna?.styles?.length ?? 0) + (left.designDna?.platforms?.length ?? 0);

      return (
        rightMemoryScore - leftMemoryScore ||
        Number(Boolean(right.isFeatured)) - Number(Boolean(left.isFeatured)) ||
        rightSignals - leftSignals
      );
    });
  }, [activeNiche, decisionProfile.terms, products, query, sortMode]);

  const activeNicheLabel = buyerNiches.find((item) => item.id === activeNiche)?.label ?? 'All';
  const profileReasons = decisionProfile.reasons.length ? decisionProfile.reasons : [`Stage: ${decisionProfile.stage}`];

  return (
    <div className="space-y-4">
      <Panel tone="glass" className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-gold/15 text-gold">
              <Sparkles size={16} />
            </span>
            <p className="text-sm font-black text-white">Your buying memory</p>
            <span className="rounded border border-white/[0.1] bg-white/[0.06] px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-white/50">
              {decisionProfile.confidence}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">
            {decisionProfile.signature}. {decisionProfile.nextAction}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {profileReasons.slice(0, 4).map((reason) => (
              <span key={reason} className="rounded border border-white/[0.1] bg-black/20 px-2 py-1 text-[0.68rem] font-bold text-white/58">
                {reason}
              </span>
            ))}
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setQuery(decisionProfile.prompt);
            setSortMode('recommended');
          }}
          intent="gold"
          className="h-10 shrink-0 font-black"
        >
          Use memory brief
        </Button>
      </Panel>

      <Panel tone="glass" className="p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-gold">
              <SlidersHorizontal size={15} />
              Buyer-intent filters
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 thin-scrollbar">
              {buyerNiches.map((niche) => {
                const active = activeNiche === niche.id;
                const count = nicheCount(products, niche.terms);

                return (
                  <Button
                    key={niche.id}
                    type="button"
                    onClick={() => setActiveNiche(niche.id)}
                    icon={Filter}
                    intent={active ? 'gold' : 'ghost'}
                    className={`shrink-0 font-black ${active ? 'border-gold bg-gold text-[#101513]' : 'text-white/72 hover:text-gold'}`}
                  >
                    {niche.label}
                    <span className={active ? 'text-[#101513]/62' : 'text-white/42'}>{count}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={17} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by niche, mood, color, platform..."
              className="bg-black/20 pl-10 pr-3 font-bold text-white placeholder:text-white/34 focus:border-gold focus:bg-black/20"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.1] pt-3">
          <span className="py-2 text-xs font-black uppercase tracking-[0.14em] text-white/42">Try intent</span>
          {intentPrompts.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              onClick={() => setQuery(prompt)}
              intent="ghost"
              size="sm"
              className="text-white/66 hover:text-gold"
            >
              {prompt}
            </Button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 border-t border-white/[0.1] pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 text-sm leading-6 text-white/62">
            Showing <strong className="text-white">{filtered.length}</strong> design{filtered.length === 1 ? '' : 's'} for{' '}
            <strong className="text-gold">{activeNicheLabel}</strong>
            {query.trim() ? (
              <>
                {' '}
                matching <strong className="text-white">"{query.trim()}"</strong>
              </>
            ) : null}
            .
          </div>

          <div className="flex flex-wrap gap-2">
            {sortModes.map((mode) => {
              const active = sortMode === mode.id;

              return (
                <Button
                  key={mode.id}
                  type="button"
                  onClick={() => setSortMode(mode.id)}
                  intent={active ? 'gold' : 'ghost'}
                  size="sm"
                  className={`font-black ${active ? 'border-gold bg-gold text-[#101513]' : 'text-white/66 hover:text-gold'}`}
                >
                  {mode.label}
                </Button>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-3">
        <DiscoveryRule
          title="Pick by customer feeling"
          text="Start with trust, appetite, urgency, luxury, or calm before looking at price."
        />
        <DiscoveryRule title="Check where it will live" text="Match the design to Instagram, menu, launch, listing, or invitation use." />
        <DiscoveryRule
          title="Confirm license early"
          text="Open the product page when the mood fits, then verify commercial use and delivery."
        />
      </div>

      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <CustomerEmptyState
          tone="dark"
          icon={Sparkles}
          title="No exact fit in the current catalog."
          text="Try a broader niche, clear the search terms, or use the AI finder when the buyer moment is more specific than the catalog filters."
        />
      )}
    </div>
  );
}

function productMemoryScore(product: ProductSummary, terms: string[]) {
  if (!terms.length) {
    return 0;
  }

  const text = productText(product);
  return terms.reduce((score, term) => score + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function DiscoveryRule({ title, text }: { title: string; text: string }) {
  return (
    <Panel tone="glass" className="p-3 text-white">
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-xs leading-5 text-white/56">{text}</p>
    </Panel>
  );
}
