'use client';

import { Bookmark, ChevronLeft, ChevronRight, LockKeyhole, Loader2, Search, Sparkles } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { fetchAiDiscoveryStatus, sendAiDiscoveryMessage, type AiDiscoveryResponse, type AiDiscoveryStatus } from '../lib/api';
import { pendingAiSearchKey } from '../lib/ai-search';
import { accessTokenKey, authChangedEvent, useAuthSession } from '../lib/auth-session';
import { updateAttribution } from '../lib/attribution';
import { trackFunnelEvent } from '../lib/funnel-analytics';
import { saveSearch } from '../lib/saved-searches';
import { rememberSearchTaste } from '../lib/taste-memory';
import { BuyerProfileRecovery } from './buyer-profile-recovery';
import { CustomerEmptyState, CustomerJourneyRail } from './customer-experience';
import { ProductCard } from './product-card';
import { ActionLink, Button, Notice, Panel } from './ui';

const guestSearchUsedKey = '3s-design-search-preview-used';
const guestLimit = 3;
const signedInLimit = 9;
const starterBriefs = [
  'premium restaurant launch, black and gold, Instagram',
  'calm real estate listing, trust, clean layout',
  'urgent sale campaign, bold offer, social posts',
  'luxury wedding invitation, soft premium feeling',
] as const;

export function SearchExperience() {
  const { isSignedIn } = useAuthSession();
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [response, setResponse] = useState<AiDiscoveryResponse | null>(null);
  const [status, setStatus] = useState<AiDiscoveryStatus | null>(null);
  const [page, setPage] = useState(1);
  const [guestUsed, setGuestUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const source = response?.intent.source === 'openai' ? 'openai' : 'rules';
  const canPage = isSignedIn && Boolean(response);
  const nextPath = useMemo(() => {
    const path = `/search${lastQuery ? `?q=${encodeURIComponent(lastQuery)}` : ''}` as Route;
    return path;
  }, [lastQuery]);

  useEffect(() => {
    setGuestUsed(window.localStorage.getItem(guestSearchUsedKey) === 'true');

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('q')?.trim();
    const queued = window.localStorage.getItem(pendingAiSearchKey)?.trim();
    if (queued) {
      window.localStorage.removeItem(pendingAiSearchKey);
    }

    const initial = fromUrl || queued || '';
    if (initial) {
      setQuery(initial);
      void runSearch(initial, 1);
    }

    fetchAiDiscoveryStatus()
      .then(setStatus)
      .catch(() => setStatus(null));

    const updateGuestGate = () => setGuestUsed(window.localStorage.getItem(guestSearchUsedKey) === 'true');
    window.addEventListener(authChangedEvent, updateGuestGate);
    return () => window.removeEventListener(authChangedEvent, updateGuestGate);
    // runSearch intentionally uses the mount-time auth gate for the initial request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(prompt: string, requestedPage = 1) {
    const text = prompt.trim();
    if (!text || loading) {
      return;
    }

    const signedInNow = Boolean(window.localStorage.getItem(accessTokenKey));
    if (!signedInNow && (guestUsed || requestedPage > 1)) {
      setNotice('Sign in to unlock every result page, save briefs, and continue refining this search.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    updateAttribution({ source: 'search', brief: text });
    trackFunnelEvent('search_started', {
      query: text,
      requestedPage,
      signedIn: signedInNow,
    });

    try {
      const result = await sendAiDiscoveryMessage({
        message: text,
        limit: signedInNow ? signedInLimit : guestLimit,
        page: signedInNow ? requestedPage : 1,
      });

      if (!signedInNow) {
        window.localStorage.setItem(guestSearchUsedKey, 'true');
        setGuestUsed(true);
      }

      setResponse(result);
      trackFunnelEvent('search_completed', {
        query: text,
        requestedPage: result.pagination.page,
        returned: result.pagination.returned,
        source: result.intent.source ?? 'rules',
      });
      setLastQuery(text);
      setQuery(text);
      setPage(result.pagination.page);
      rememberSearchTaste(text);
      window.history.replaceState(null, '', `/search?q=${encodeURIComponent(text)}`);
    } catch {
      setError('Search is not reachable right now. Try again shortly.');
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query, 1);
  }

  function saveCurrentSearch() {
    if (!response || !lastQuery) {
      return;
    }

    saveSearch({
      prompt: lastQuery,
      source,
      resultCount: response.pagination.returned,
      topResult: response.items[0]?.title,
    });
    setNotice('Search saved to your account workspace on this device.');
  }

  return (
    <main className="showcase-page search-experience min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/?intro=0" className="brand-lockup text-white" aria-label="Back home">
            <span className="brand-mark" aria-hidden="true">
              <span className="brand-mark__stroke brand-mark__stroke--one" />
              <span className="brand-mark__stroke brand-mark__stroke--two" />
              <span className="brand-mark__spark" />
            </span>
            <span>
              <span className="block text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/55">AI concierge search</span>
              <span className="block text-xl font-black text-white">3S Design</span>
            </span>
          </Link>
          <div className="flex gap-2">
            <ActionLink href="/account" intent="ghost" className="h-10">
              Account
            </ActionLink>
          </div>
        </div>

        <div className="mb-5">
          <CustomerJourneyRail current="discover" tone="dark" />
        </div>

        <section className="search-decision-shell text-white">
          <div className="grid gap-4 p-4 lg:grid-cols-[0.82fr_1.18fr] lg:p-5">
            <Panel tone="glass" className="search-hero-panel flex flex-col justify-between p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7d17e]">Find by feeling</p>
                <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
                  Describe what the customer should feel. We bring the closest designs.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/64">
                  Guests get one protected preview. Signed-in customers unlock result pages, saved searches, cart, orders, and downloads.
                </p>
              </div>

              <form onSubmit={submit} className="mt-5 grid gap-3">
                <label className="grid gap-2 text-sm font-bold text-white">
                  Search brief
                  <span className="search-brief-input">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-[#101513]/50"
                      placeholder="Luxury black and gold restaurant launch..."
                    />
                  </span>
                </label>
                <Button
                  type="submit"
                  disabled={loading}
                  intent="secondary"
                  className="h-11 border-transparent bg-[#f7d17e] font-black text-[#101513] hover:bg-[#fff8e8]"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Find matched designs
                </Button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {starterBriefs.map((brief) => (
                  <button
                    key={brief}
                    type="button"
                    onClick={() => {
                      setQuery(brief);
                      void runSearch(brief, 1);
                    }}
                    className="search-intent-chip"
                  >
                    {brief}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded border border-white/[0.1] bg-white/[0.05] p-3 text-xs leading-5 text-white/62">
                Engine:{' '}
                <span className="font-black text-white">
                  {response?.intent.source === 'openai' ? 'OpenAI structured' : 'Smart local rules'}
                </span>
                {status?.openAiConfigured ? ' / OpenAI key configured with store=false' : ' / local mode only'}
              </div>
            </Panel>

            <Panel tone="glass" className="search-results-panel p-3">
              {response ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7d17e]">Matched designs</p>
                      <h2 className="mt-1 text-xl font-black text-white">
                        Page {page} / {response.pagination.returned} shown
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">{response.assistantMessage}</p>
                    </div>
                    <div className="flex gap-2">
                      {isSignedIn ? (
                        <Button type="button" onClick={saveCurrentSearch} intent="gold" className="h-10 px-3">
                          <Bookmark size={16} />
                          Save
                        </Button>
                      ) : (
                        <ActionLink
                          href={`/login?next=${encodeURIComponent(nextPath)}` as Route}
                          intent="gold"
                          className="h-10 px-3"
                          icon={LockKeyhole}
                        >
                          Unlock
                        </ActionLink>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-lg border border-white/[0.1] bg-white/[0.05] p-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Signal title="Colors" values={response.brief.colors} />
                    <Signal title="Feeling" values={response.brief.styles} />
                    <Signal title="Use" values={response.brief.useCases} />
                    <Signal title="Platform" values={response.brief.platforms} />
                  </div>

                  <SearchMatchSummary response={response} lastQuery={lastQuery} signedIn={isSignedIn} />

                  {notice ? <Notice className="border-[#f7d17e]/30 bg-[#f7d17e]/10 text-[#f7d17e]">{notice}</Notice> : null}
                  {error ? <Notice tone="error">{error}</Notice> : null}

                  {response.items.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {response.items.map((product) => (
                        <div
                          key={product.id}
                          onClickCapture={() =>
                            trackFunnelEvent('search_result_clicked', {
                              productId: product.id,
                              slug: product.slug,
                              query: lastQuery,
                              matchScore: product.match?.score ?? null,
                            })
                          }
                        >
                          <ProductCard
                            product={product}
                            compact
                            sourcePrompt={lastQuery}
                            sourceSignals={[
                              ...(product.match?.matchedSignals ?? []),
                              ...response.brief.colors,
                              ...response.brief.styles,
                              ...response.brief.useCases,
                              ...response.brief.platforms,
                            ]}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <SearchRecoveryState onPick={(brief) => void runSearch(brief, 1)} />
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.1] pt-3">
                    <p className="text-sm text-white/55">
                      {isSignedIn ? 'Use pages to inspect more design directions.' : 'Sign in to continue past the protected preview.'}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        disabled={!canPage || page <= 1 || loading}
                        onClick={() => void runSearch(lastQuery, Math.max(page - 1, 1))}
                        intent="ghost"
                        className="h-10 px-3"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        disabled={!canPage || !response.pagination.hasMore || loading}
                        onClick={() => void runSearch(lastQuery, page + 1)}
                        intent="ghost"
                        className="h-10 px-3"
                      >
                        Next
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                    {!isSignedIn ? (
                      <p className="basis-full text-xs font-bold leading-5 text-[#f7d17e]">
                        Result paging is locked for signed-in customers so searches, carts, and downloads stay attached to one account.
                      </p>
                    ) : response.pagination.hasMore ? null : (
                      <p className="basis-full text-xs font-bold leading-5 text-white/45">You have reached the end of these matches.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <BuyerProfileRecovery compact />
                  <CustomerEmptyState
                    tone="dark"
                    icon={Sparkles}
                    title="Start with intent, not a file name."
                    text='Example: "restaurant launch, black and gold, Instagram, luxury, appetite, trust".'
                  />
                </div>
              )}
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function Signal({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded border border-white/[0.1] bg-black/20 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-white/45">{title}</p>
      <p className="mt-2 text-sm font-bold text-white">{values.length ? values.join(', ') : 'Needs refinement'}</p>
    </div>
  );
}

function SearchMatchSummary({ response, lastQuery, signedIn }: { response: AiDiscoveryResponse; lastQuery: string; signedIn: boolean }) {
  const topMatch = response.items[0];
  const topReason = topMatch?.match?.reason ?? response.assistantMessage;
  const confidence = response.brief.confidence ? `${Math.round(response.brief.confidence * 100)}%` : 'Needs refinement';

  return (
    <div className="search-match-summary">
      <SearchMatchCard label="Intent" value={lastQuery || response.brief.summary || 'Fresh discovery'} />
      <SearchMatchCard label="Confidence" value={confidence} />
      <SearchMatchCard label="Top reason" value={topReason} />
      <SearchMatchCard label="Access" value={signedIn ? 'Full result pages unlocked' : 'Protected preview only'} />
    </div>
  );
}

function SearchMatchCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="search-match-card">
      <p className="search-match-card__label">{label}</p>
      <p className="search-match-card__value line-clamp-3">{value}</p>
    </div>
  );
}

function SearchRecoveryState({ onPick }: { onPick: (brief: string) => void }) {
  const recoveryBriefs = [
    'restaurant launch, appetite, premium, Instagram',
    'real estate trust, calm luxury, property listing',
    'sale campaign, urgency, clean ecommerce banner',
  ];

  return (
    <div className="rounded-lg border border-white/[0.12] bg-black/20 p-4">
      <CustomerEmptyState
        tone="dark"
        icon={Search}
        title="No strong match yet."
        text="The brief needs a clearer business, mood, platform, or buying moment. Try one of these recovery directions."
      />
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {recoveryBriefs.map((brief) => (
          <button key={brief} type="button" onClick={() => onPick(brief)} className="search-intent-chip">
            {brief}
          </button>
        ))}
      </div>
    </div>
  );
}
