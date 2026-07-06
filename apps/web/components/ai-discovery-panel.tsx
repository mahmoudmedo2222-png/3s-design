'use client';

import {
  Bot,
  Brush,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Loader2,
  LockKeyhole,
  Palette,
  SearchCheck,
  Send,
  Sparkles,
  Store,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ProductCard } from './product-card';
import { fetchAiDiscoveryStatus, sendAiDiscoveryMessage, type AiDiscoveryStatus, type ProductSummary } from '../lib/api';
import { aiSearchEvent, consumeQueuedAiSearch } from '../lib/ai-search';
import { accessTokenKey, authChangedEvent } from '../lib/auth-session';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type DiscoveryBrief = {
  summary: string;
  colors: string[];
  styles: string[];
  useCases: string[];
  platforms: string[];
  keywords: string[];
  confidence: number;
};

const guestAiSearchKey = '3s-design-guest-ai-search-used';
const aiMemoryKey = '3s-design-ai-discovery-memory';
const guestResultLimit = 3;
const signedInResultLimit = 9;

type AiDiscoveryMemory = {
  sessionId?: string;
  lastPrompt?: string;
  questions?: string[];
  updatedAt: string;
};

export function AiDiscoveryPanel() {
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [guestSearchUsed, setGuestSearchUsed] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Tell me the business, feeling, colors, and where the design will be used. I will return a tight shortlist, not a catalog.',
    },
  ]);
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [brief, setBrief] = useState<DiscoveryBrief | null>(null);
  const [discoveryStatus, setDiscoveryStatus] = useState<AiDiscoveryStatus | null>(null);
  const [intentSource, setIntentSource] = useState<'openai' | 'rules' | undefined>();
  const [lastPrompt, setLastPrompt] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [questions, setQuestions] = useState<string[]>([
    'Should the buyer feel prestige, trust, appetite, speed, calm, or desire first?',
    'What is the customer moment: launch, offer, menu decision, property inquiry, or brand reveal?',
    'Do you want a reusable ready design or a privately tailored campaign direction?',
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateAuth = () => setIsSignedIn(Boolean(window.localStorage.getItem(accessTokenKey)));
    updateAuth();
    setGuestSearchUsed(window.localStorage.getItem(guestAiSearchKey) === 'true');

    const stored = readAiMemory();
    if (stored) {
      setSessionId(stored.sessionId);
      setLastPrompt(stored.lastPrompt ?? '');
      setQuestions(stored.questions?.length ? stored.questions : questions);
      if (stored.lastPrompt) {
        setChat((items) => [
          ...items,
          {
            role: 'assistant',
            content: `Welcome back. I remember your last direction: "${stored.lastPrompt}". Refine it or start a new feeling.`,
          },
        ]);
      }
    }
    window.addEventListener('storage', updateAuth);
    window.addEventListener(authChangedEvent, updateAuth);

    return () => {
      window.removeEventListener('storage', updateAuth);
      window.removeEventListener(authChangedEvent, updateAuth);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchAiDiscoveryStatus()
      .then((status) => {
        if (!cancelled) {
          setDiscoveryStatus(status);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDiscoveryStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event?: FormEvent<HTMLFormElement>, override?: string, requestedPage = 1) {
    event?.preventDefault();
    const formMessage = event?.currentTarget ? String(new FormData(event.currentTarget).get('message') ?? '') : '';
    const candidate = override ?? (formMessage || message);
    const text = (candidate || lastPrompt).trim();
    if (!text || loading) {
      return;
    }

    if (!isSignedIn && (guestSearchUsed || requestedPage > 1)) {
      setChat((items) => [
        ...items,
        {
          role: 'assistant',
          content: 'Sign in to unlock the full AI finder, more matched designs, saved briefs, and result pages.',
        },
      ]);
      return;
    }

    if (requestedPage === 1) {
      setMessage('');
      setChat((items) => [...items, { role: 'user', content: text }]);
    }

    setLoading(true);

    try {
      const response = await sendAiDiscoveryMessage({
        message: text,
        sessionId,
        limit: isSignedIn ? signedInResultLimit : guestResultLimit,
        page: isSignedIn ? requestedPage : 1,
      });
      if (!isSignedIn) {
        window.localStorage.setItem(guestAiSearchKey, 'true');
        setGuestSearchUsed(true);
      }
      setSessionId(response.sessionId);
      setLastPrompt(text);
      setResults(response.items);
      setBrief(response.brief);
      setIntentSource(response.intent.source === 'openai' ? 'openai' : 'rules');
      setPage(response.pagination.page);
      setHasMore(isSignedIn && response.pagination.hasMore);
      setQuestions(response.nextQuestions);
      writeAiMemory({
        sessionId: response.sessionId,
        lastPrompt: text,
        questions: response.nextQuestions,
        updatedAt: new Date().toISOString(),
      });
      setChat((items) => [
        ...items,
        {
          role: 'assistant',
          content: !isSignedIn
            ? `${response.assistantMessage} I showed a private preview. Sign in to unlock the full match list.`
            : requestedPage === 1
              ? response.assistantMessage
              : `${response.assistantMessage} I moved you to results page ${response.pagination.page}.`,
        },
      ]);
    } catch {
      setChat((items) => [...items, { role: 'assistant', content: 'I could not reach the assistant right now. Try again shortly.' }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function runQueuedSearch(event?: Event) {
      const fromEvent = event instanceof CustomEvent && typeof event.detail === 'string' ? event.detail : undefined;
      const queued = fromEvent ?? consumeQueuedAiSearch();
      if (fromEvent) {
        consumeQueuedAiSearch();
      }
      if (!queued) {
        return;
      }

      setMessage(queued);
      void submit(undefined, queued);
    }

    window.addEventListener(aiSearchEvent, runQueuedSearch);
    runQueuedSearch();

    return () => {
      window.removeEventListener(aiSearchEvent, runQueuedSearch);
    };
    // submit intentionally reads the latest chat/search state through the current render closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, guestSearchUsed, loading, sessionId]);

  return (
    <section className="ai-finder-grid grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="ai-finder-card rounded-lg border border-line bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-ink text-white">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">AI design finder</h2>
            <p className="text-xs text-muted">{isSignedIn ? 'Full matching unlocked.' : 'One protected preview before sign in.'}</p>
          </div>
        </div>

        <EngineStatus status={discoveryStatus} source={intentSource} />

        <div className="thin-scrollbar mb-3 max-h-[200px] space-y-2 overflow-auto pr-1">
          {chat.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={`rounded-lg px-3 py-2 text-xs leading-5 ${
                item.role === 'assistant' ? 'border border-line bg-paper text-ink' : 'ml-8 bg-ink text-white'
              }`}
            >
              {item.content}
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <input
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Luxury black and gold restaurant launch..."
            className="h-10 min-w-0 flex-1 rounded border border-line bg-white px-3 text-sm text-ink"
            disabled={!isSignedIn && guestSearchUsed}
          />
          <button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded bg-ink text-white transition hover:-translate-y-0.5 hover:scale-105 hover:bg-pine active:translate-y-0 active:scale-95 disabled:opacity-60"
            disabled={loading}
            title="Send"
            aria-label="Send AI discovery message"
          >
            {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          </button>
        </form>

        {!isSignedIn && guestSearchUsed ? (
          <div className="mt-3 rounded-lg border border-saffron/30 bg-saffron/10 p-3">
            <div className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 shrink-0 text-saffron" size={16} />
              <div>
                <p className="text-xs font-bold text-ink">Full AI matching is protected.</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Create an account to continue refining, browse all matched pages, and save your brief.
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 flex-1 items-center justify-center rounded border border-line bg-white px-3 text-xs font-bold text-ink transition hover:border-pine hover:text-pine"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 flex-1 items-center justify-center rounded bg-pine px-3 text-xs font-bold text-white transition hover:bg-[#1b4a3f]"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : null}

        {questions.length ? (
          <div className="mt-3 grid gap-2">
            {questions.slice(0, 2).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void submit(undefined, question)}
                disabled={!isSignedIn && guestSearchUsed}
                className="ai-question-chip group flex items-center gap-2 rounded border border-line bg-paper px-3 py-2 text-left text-xs font-semibold text-ink transition hover:-translate-y-0.5 hover:border-pine hover:bg-pine/10 hover:text-pine active:translate-y-0 dark:hover:bg-pine/20 dark:hover:text-[#7bd8bd]"
              >
                <Sparkles className="shrink-0 text-saffron transition group-hover:scale-110" size={14} />
                <span>{question}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ai-results-card min-h-[300px] rounded-lg border border-line bg-white p-3 shadow-sm">
        {lastPrompt ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-pine/10 text-pine">
                  <Bot size={16} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">Matched designs</h2>
                  <p className="text-xs text-muted">
                    {isSignedIn ? `Page ${page} / ${results.length} shown` : `${results.length} preview matches shown`}
                  </p>
                </div>
              </div>
              {isSignedIn ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void submit(undefined, lastPrompt, Math.max(page - 1, 1))}
                    disabled={loading || page <= 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded border border-line bg-white text-ink transition hover:-translate-x-0.5 hover:border-pine hover:text-pine active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit(undefined, lastPrompt, page + 1)}
                    disabled={loading || !hasMore}
                    className="inline-flex h-9 w-9 items-center justify-center rounded border border-line bg-white text-ink transition hover:translate-x-0.5 hover:border-pine hover:text-pine active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Next page"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </div>

            {results.length ? (
              <div className="space-y-4">
                {brief ? <DiscoveryBriefPanel brief={brief} source={intentSource} status={discoveryStatus} /> : null}
                {results.some((product) => product.match) ? <SmartMatchList products={results.slice(0, 3)} /> : null}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((product) => (
                    <ProductCard key={product.id} product={product} compact />
                  ))}
                </div>
                {!isSignedIn ? <GuestUnlockPanel /> : null}
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded border border-dashed border-line bg-paper px-6 text-center text-sm text-muted">
                No strong matches yet. Add the business type, colors, platform, and mood.
              </div>
            )}
          </>
        ) : (
          <SmartDiscoveryStart onPick={(prompt) => void submit(undefined, prompt)} />
        )}
      </div>
    </section>
  );
}

function readAiMemory() {
  try {
    const raw = window.localStorage.getItem(aiMemoryKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AiDiscoveryMemory>;
    if (!parsed.updatedAt) {
      return null;
    }

    return parsed as AiDiscoveryMemory;
  } catch {
    return null;
  }
}

function writeAiMemory(memory: AiDiscoveryMemory) {
  try {
    window.localStorage.setItem(aiMemoryKey, JSON.stringify(memory));
  } catch {
    // Ignore private browsing storage failures.
  }
}

function EngineStatus({ status, source }: { status: AiDiscoveryStatus | null; source?: 'openai' | 'rules' }) {
  const activeMode = source ?? status?.mode;
  const openAiActive = activeMode === 'openai';

  return (
    <div className="mb-3 rounded-lg border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-black text-ink">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              openAiActive ? 'bg-pine shadow-[0_0_0_4px_rgba(31,107,89,0.12)]' : 'bg-saffron shadow-[0_0_0_4px_rgba(247,209,126,0.18)]'
            }`}
          />
          {openAiActive ? 'OpenAI intent engine' : 'Smart local matching'}
        </span>
        <span className="rounded bg-white px-2 py-1 text-[0.68rem] font-bold uppercase text-muted">{status?.model ?? 'Rules'}</span>
      </div>
      <p className="mt-2 hidden text-xs leading-5 text-muted sm:block">
        {openAiActive
          ? 'Structured AI reads emotion, use case, colors, and platform before matching.'
          : 'Arabic-aware local matching is active until the OpenAI key is connected.'}
      </p>
    </div>
  );
}

function SmartDiscoveryStart({ onPick }: { onPick: (prompt: string) => void }) {
  const prompts = [
    {
      icon: Store,
      label: 'Make them crave it',
      prompt:
        'Make my restaurant launch feel luxurious, appetizing, and impossible to ignore in black and gold, with a reusable commercial design license',
      hint: 'Restaurant, menu, launch posts',
    },
    {
      icon: Sparkles,
      label: 'Make them act now',
      prompt: 'Make my fashion sale feel premium, urgent, and desirable with ecommerce banners that do not look cheap',
      hint: 'Sale, scarcity, premium offer',
    },
    {
      icon: Brush,
      label: 'Make them trust us',
      prompt: 'Make my real estate brand feel calm, trusted, and high value in blue and white, suitable for repeated lead campaigns',
      hint: 'Trust, clarity, expensive feel',
    },
  ];

  return (
    <div className="flex flex-col justify-between gap-4">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-pine/10 text-pine">
            <SearchCheck size={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Smart brief builder</h2>
            <p className="text-xs text-muted">Build a buying feeling before choosing a file.</p>
          </div>
        </div>

        <div className="hidden gap-2 sm:grid sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <Insight icon={Palette} title="Feeling" text="Luxury, trust, speed, calm, appetite, desire, or excitement." />
          <Insight icon={Layers3} title="First moment" text="Where they see it first: launch, sale, menu, website, or reveal." />
          <Insight icon={Sparkles} title="Memory" text="What should stay in their head after they scroll away." />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-paper p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Quick starts</p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {prompts.map(({ icon: Icon, label, prompt, hint }) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPick(prompt)}
              className="ai-quick-start group rounded border border-line bg-white p-2.5 text-left transition hover:-translate-y-0.5 hover:border-pine hover:bg-pine/10 active:translate-y-0 dark:hover:border-[#7bd8bd] dark:hover:bg-pine/20"
            >
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink group-hover:text-pine dark:group-hover:text-[#7bd8bd]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-saffron/15 text-saffron transition group-hover:scale-110">
                  <Icon size={14} />
                </span>
                {label}
              </span>
              <span className="block text-xs leading-5 text-muted group-hover:text-ink dark:group-hover:text-[#eef8f4]">{hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiscoveryBriefPanel({
  brief,
  source,
  status,
}: {
  brief: DiscoveryBrief;
  source?: 'openai' | 'rules';
  status: AiDiscoveryStatus | null;
}) {
  const chips = [
    ...brief.useCases.map((value) => ({ label: value, tone: 'pine' })),
    ...brief.styles.map((value) => ({ label: value, tone: 'saffron' })),
    ...brief.colors.map((value) => ({ label: value, tone: 'berry' })),
    ...brief.platforms.map((value) => ({ label: value, tone: 'pine' })),
  ].slice(0, 8);

  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">AI brief</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">{brief.summary || 'Design search'}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded bg-pine/10 px-2 py-1 text-xs font-semibold text-pine">
            {Math.round(brief.confidence * 100)}% intent confidence
          </span>
          <span className="rounded bg-saffron/10 px-2 py-1 text-xs font-semibold text-saffron">
            {(source ?? status?.mode) === 'openai' ? 'OpenAI structured' : 'Local smart rules'}
          </span>
        </div>
      </div>

      {chips.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={`${chip.tone}-${chip.label}`}
              className={`rounded border px-2 py-1 text-xs font-semibold ${
                chip.tone === 'saffron'
                  ? 'border-saffron/30 bg-saffron/10 text-saffron'
                  : chip.tone === 'berry'
                    ? 'border-berry/30 bg-berry/10 text-berry'
                    : 'border-pine/30 bg-pine/10 text-pine'
              }`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SmartMatchList({ products }: { products: ProductSummary[] }) {
  return (
    <section className="grid gap-2 xl:grid-cols-3">
      {products.map((product) => {
        const match = product.match;
        if (!match) {
          return null;
        }

        return (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group rounded-lg border border-line bg-paper p-3 transition hover:-translate-y-0.5 hover:border-pine hover:bg-pine/10"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded bg-pine/10 px-2 py-1 text-[0.68rem] font-black uppercase text-pine">{match.decisionTag}</span>
              <span className="text-sm font-black text-ink">{match.score}%</span>
            </div>
            <h3 className="line-clamp-1 text-sm font-black text-ink group-hover:text-pine">{product.title}</h3>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">{match.reason}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {match.matchedSignals.slice(0, 4).map((signal) => (
                <span key={signal} className="rounded border border-line bg-white px-2 py-0.5 text-[0.68rem] font-bold text-muted">
                  {signal}
                </span>
              ))}
            </div>
            <p className="mt-3 line-clamp-2 text-[0.72rem] font-semibold leading-5 text-pine">{match.reuseModel}</p>
          </Link>
        );
      })}
    </section>
  );
}

function GuestUnlockPanel() {
  return (
    <div className="overflow-hidden rounded-lg border border-saffron/35 bg-[#fff7e6] dark:bg-[#1b1710]">
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-saffron text-ink">
            <LockKeyhole size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-ink">Unlock all matched designs</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Sign in to view every result page, continue refining the brief, save searches, and keep the best matches inside your account.
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Link
            href="/login"
            className="inline-flex h-10 flex-1 items-center justify-center rounded border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-pine hover:text-pine sm:flex-none"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 flex-1 items-center justify-center rounded bg-pine px-4 text-sm font-bold text-white transition hover:bg-[#1b4a3f] sm:flex-none"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

function Insight({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-2.5">
      <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded bg-saffron/15 text-saffron">
        <Icon size={16} />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}
