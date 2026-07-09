'use client';

import {
  ArrowUpRight,
  BrainCircuit,
  Download,
  LogOut,
  MailCheck,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  createRefundRequest,
  fetchDownloads,
  fetchOrders,
  fetchPayments,
  fetchRefunds,
  requestEmailVerification,
  type DownloadEntitlement,
  type OrderResponse,
  type UserRefundRequest,
  type UserPayment,
} from '../lib/api';
import { clearAuthSession, useAuthSession } from '../lib/auth-session';
import { queueAiSearch } from '../lib/ai-search';
import { useCartStore } from '../lib/cart-store';
import { type AppLocale, commonCopy } from '../lib/locale';
import { readSavedSearches, savedSearchesChangedEvent, type SavedSearch } from '../lib/saved-searches';
import { ClientRitual } from './client-ritual';
import { CustomerJourneyRail, CustomerTrustStrip } from './customer-experience';
import { DeliveryVault } from './delivery-vault';
import { FunnelInsightsPanel } from './funnel-insights-panel';
import { LanguageToggle } from './language-toggle';
import { PrivateShowroom } from './private-showroom';
import { PostOrderGuidance } from './post-order-guidance';
import { TasteMemoryPanel } from './taste-memory-panel';
import { ThemeToggle } from './theme-toggle';
import { ActionLink, Badge, Button, Notice, Panel } from './ui';

const starterPrompt = 'Help me find a design by emotion, industry, colors, customer moment, and commercial use case';

export function AccountDashboard({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const { isSignedIn, user } = useAuthSession();
  const common = commonCopy[locale];
  const items = useCartStore((state) => state.items);
  const hydrateCart = useCartStore((state) => state.hydrate);
  const clearCartLocal = useCartStore((state) => state.clearLocal);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [downloads, setDownloads] = useState<DownloadEntitlement[]>([]);
  const [refunds, setRefunds] = useState<UserRefundRequest[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [refundReasons, setRefundReasons] = useState<Record<string, string>>({});
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      clearCartLocal();
      setOrders([]);
      setPayments([]);
      setDownloads([]);
      setRefunds([]);
      return;
    }

    void hydrateCart();
    void refreshWorkspace();
    setSavedSearches(readSavedSearches());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  useEffect(() => {
    const update = () => setSavedSearches(readSavedSearches());
    update();
    window.addEventListener(savedSearchesChangedEvent, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(savedSearchesChangedEvent, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  async function refreshWorkspace() {
    setWorkspaceError(null);

    try {
      const [orderResponse, paymentResponse, downloadResponse, refundResponse] = await Promise.all([
        fetchOrders(),
        fetchPayments(),
        fetchDownloads(),
        fetchRefunds(),
      ]);

      setOrders(orderResponse.items);
      setPayments(paymentResponse.items);
      setDownloads(downloadResponse.items);
      setRefunds(refundResponse.items);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Client studio could not refresh.');
    }
  }

  function openAiFinder() {
    queueAiSearch(starterPrompt);
    router.push(`/search?q=${encodeURIComponent(starterPrompt)}` as Route);
  }

  async function sendVerification() {
    setVerificationMessage(null);
    setVerificationToken(null);

    try {
      const response = await requestEmailVerification();
      setVerificationToken(response.devEmailVerificationToken ?? null);
      setVerificationMessage('Verification link issued. Check email, or use the dev token shown here in local development.');
    } catch (error) {
      setVerificationMessage(error instanceof Error ? error.message : 'Could not request verification email.');
    }
  }

  async function submitRefundRequest(orderId: string) {
    setWorkspaceError(null);
    const reason = refundReasons[orderId]?.trim() ?? '';

    try {
      await createRefundRequest({ orderId, reason });
      setRefundReasons((current) => ({ ...current, [orderId]: '' }));
      await refreshWorkspace();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Refund request could not be created.');
    }
  }

  function logout() {
    clearCartLocal();
    clearAuthSession();
    router.push('/?intro=0');
    router.refresh();
  }

  if (!isSignedIn) {
    return (
      <main className="account-dashboard min-h-screen bg-[#060b0a] px-4 py-5 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
          <Panel tone="glass" className="w-full max-w-2xl p-5 sm:p-6">
            <Link href="/" className="brand-lockup" aria-label="Back to 3S Design home">
              <span className="brand-mark" aria-hidden="true">
                <span className="brand-mark__stroke brand-mark__stroke--one" />
                <span className="brand-mark__stroke brand-mark__stroke--two" />
                <span className="brand-mark__spark" />
              </span>
              <span>
                <span className="block text-[0.68rem] font-extrabold uppercase leading-none tracking-[0.16em] text-white/55">
                  Client Studio
                </span>
                <span className="mt-1 block text-2xl font-black text-gold">3S Design</span>
              </span>
            </Link>

            <div className="mt-7">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-[#f7d17e]/15 text-gold">
                <ShieldCheck size={19} />
              </span>
              <h1 className="mt-4 text-2xl font-black">Sign in to open your client studio.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/68">
                Purchases, AI briefs, cart items, invoices, download limits, and fraud checks live behind a customer account.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <ActionLink
                href="/login?next=/account"
                icon={UserRound}
                intent="secondary"
                className="h-11 rounded-full bg-cream px-5 font-black hover:bg-gold"
              >
                Sign in
              </ActionLink>
              <ActionLink href="/register?next=/account" icon={Sparkles} intent="ghost" className="h-11 rounded-full px-5">
                Create account
              </ActionLink>
            </div>
          </Panel>
        </div>
      </main>
    );
  }

  return (
    <main className="account-dashboard account-studio-page min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <Panel tone="glass" className="mx-auto flex max-w-7xl items-center justify-between gap-4 p-3">
        <Link href="/?intro=0" className="brand-lockup" aria-label="Back to marketplace">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark__stroke brand-mark__stroke--one" />
            <span className="brand-mark__stroke brand-mark__stroke--two" />
            <span className="brand-mark__spark" />
          </span>
          <span>
            <span className="block text-[0.68rem] font-extrabold uppercase leading-none tracking-[0.16em] text-white/55">
              Client Studio
            </span>
            <span className="mt-1 block text-xl font-black text-white">3S Design</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button type="button" onClick={logout} icon={LogOut} intent="ghost" className="rounded-full">
            Logout
          </Button>
        </div>
      </Panel>

      <section className="mx-auto grid max-w-7xl gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <CustomerJourneyRail current="deliver" tone="dark" />

          <Panel tone="glass" className="account-studio-hero p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Signed in</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Welcome, {user?.fullName?.split(' ')[0] || 'designer'}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/66">
              Your account is now the protected place for design matching, saved intent, checkout, receipts, and future downloads.
            </p>

            <div className="account-ownership-strip mt-5">
              <OwnershipCard label="Orders" value={orders.length} />
              <OwnershipCard label="Payments" value={payments.length} />
              <OwnershipCard label="Vault files" value={downloads.reduce((sum, item) => sum + item.assets.length, 0)} />
              <OwnershipCard label="Saved briefs" value={savedSearches.length} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <StatusCard icon={ShieldCheck} title="Secure session" text="Access and refresh tokens are stored for this device." />
              <StatusCard
                icon={MailCheck}
                title={user?.isEmailVerified ? 'Email verified' : 'Email pending'}
                text={user?.isEmailVerified ? 'Ready for protected downloads.' : 'Verification can be required before files.'}
              />
              <StatusCard
                icon={ShoppingCart}
                title={`${count} cart item${count === 1 ? '' : 's'}`}
                text="Cart is locked to signed-in customers only."
              />
            </div>

            {!user?.isEmailVerified ? (
              <Notice tone="info" className="mt-5 border-[#f7d17e]/25 bg-[#f7d17e]/10 text-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-black">Verify email before serious delivery.</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/66">
                      Verification gives support, payment review, and file recovery a stronger ownership signal.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void sendVerification()}
                    icon={MailCheck}
                    intent="secondary"
                    className="rounded-full bg-[#fff8e8] font-black hover:bg-[#f7d17e]"
                  >
                    Send verification
                  </Button>
                </div>
                {verificationMessage ? <p className="mt-3 text-sm font-bold text-[#f7d17e]">{verificationMessage}</p> : null}
                {verificationToken ? (
                  <div className="mt-3 rounded border border-white/[0.12] bg-black/20 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">Development token</p>
                    <p className="mt-2 break-all font-mono text-xs text-white/75">{verificationToken}</p>
                    <ActionLink
                      href={`/verify-email?token=${encodeURIComponent(verificationToken)}` as Route}
                      intent="gold"
                      className="mt-3 h-9 px-3 text-xs"
                    >
                      Verify now
                    </ActionLink>
                  </div>
                ) : null}
              </Notice>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Button type="button" onClick={openAiFinder} intent="gold" className="group block h-auto rounded-lg p-4 text-start">
                <BrainCircuit className="text-[#f7d17e] transition group-hover:text-[#101513]" size={21} />
                <h2 className="mt-3 text-lg font-black">Continue with AI finder</h2>
                <p className="mt-2 text-sm leading-6 text-white/66 group-hover:text-[#101513]/75">
                  Tell us the feeling and unlock full matched pages because you are signed in.
                </p>
              </Button>

              <ActionLink href="/?intro=0#latest-designs" intent="ghost" className="group block h-auto rounded-lg p-4 text-start">
                <Search className="text-[#f7d17e]" size={21} />
                <h2 className="mt-3 text-lg font-black">Browse staged designs</h2>
                <p className="mt-2 text-sm leading-6 text-white/66">
                  Compare finished products, prices, moods, and commercial use before buying.
                </p>
              </ActionLink>
            </div>
          </Panel>
          <CustomerTrustStrip tone="dark" />
          <PrivateShowroom />
          <DeliveryVault downloads={downloads} />
        </div>

        <aside className="space-y-3">
          <TasteMemoryPanel />
          <FunnelInsightsPanel />

          <Panel tone="glass" className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-black">{common.languageSettings}</h2>
              <p className="mt-1 text-xs leading-5 text-white/55">{common.languageSettingsText}</p>
            </div>
            <LanguageToggle locale={locale} />
          </Panel>

          <Panel tone="glass" className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
                <BrainCircuit size={17} />
              </span>
              <div>
                <h2 className="text-lg font-black">Saved searches</h2>
                <p className="text-xs text-white/55">Return to briefs that felt close</p>
              </div>
            </div>
            {savedSearches.length ? (
              <div className="space-y-2">
                {savedSearches.slice(0, 4).map((search) => (
                  <Link
                    key={search.id}
                    href={`/search?q=${encodeURIComponent(search.prompt)}` as Route}
                    className="block rounded border border-white/[0.1] bg-white/[0.05] p-3 transition hover:-translate-y-0.5 hover:border-[#f7d17e]/45 hover:bg-white/[0.08]"
                  >
                    <p className="line-clamp-2 text-sm font-black">{search.prompt}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {search.resultCount} result{search.resultCount === 1 ? '' : 's'} / {search.source}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-white/62">Save a search from the AI search page and it will appear here.</p>
            )}
          </Panel>

          <ClientRitual orders={orders} payments={payments} downloads={downloads} />

          <Panel tone="glass" className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
                <ShoppingCart size={17} />
              </span>
              <div>
                <h2 className="text-lg font-black">Cart</h2>
                <p className="text-xs text-white/55">Protected checkout preparation</p>
              </div>
            </div>
            {items.length ? (
              <div className="space-y-3">
                {items.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded border border-white/[0.1] bg-white/[0.05] p-3">
                    <p className="line-clamp-1 text-sm font-black">{item.title}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {item.quantity} x {item.currency} {item.unitPrice}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-white/62">No cart items yet. Add a design after choosing the right customer feeling.</p>
            )}
          </Panel>

          <Panel tone="glass" className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
                <Download size={17} />
              </span>
              <div>
                <h2 className="text-lg font-black">Orders and files</h2>
                <p className="text-xs text-white/55">Luxury delivery desk</p>
              </div>
            </div>
            {workspaceError ? (
              <Notice tone="error" className="p-3 text-xs">
                {workspaceError}
              </Notice>
            ) : null}
            <div className="grid gap-3">
              <StudioMetric label="Orders" value={orders.length} />
              <StudioMetric label="Payments" value={payments.length} />
              <StudioMetric label="Download vault" value={downloads.length} />
            </div>
            {orders.length ? (
              <div className="mt-4 space-y-2">
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="rounded border border-white/[0.1] bg-white/[0.05] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black">{order.orderNumber}</p>
                      <Badge tone="gold" className="shrink-0">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-white/55">
                      {order.currency} {order.total}
                    </p>
                    <div className="mt-3">
                      <PostOrderGuidance
                        order={order}
                        payment={payments.find((item) => item.order.id === order.id)?.payment}
                        downloads={downloads}
                        tone="dark"
                        onRefresh={() => void refreshWorkspace()}
                      />
                    </div>
                    <RefundRequestInline
                      order={order}
                      refunds={refunds}
                      reason={refundReasons[order.id] ?? ''}
                      onReasonChange={(value) => setRefundReasons((current) => ({ ...current, [order.id]: value }))}
                      onSubmit={() => void submitRefundRequest(order.id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-white/62">
                Your first private checkout will appear here with payment status and secure download access.
              </p>
            )}
            <Button
              type="button"
              onClick={() => void refreshWorkspace()}
              icon={ArrowUpRight}
              intent="secondary"
              className="mt-4 rounded-full bg-[#fff8e8] font-black hover:bg-[#f7d17e]"
            >
              Refresh studio
            </Button>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function StatusCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <Panel tone="glass" className="p-3 shadow-none">
      <Icon className="text-gold" size={19} />
      <h2 className="mt-2 text-sm font-black">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-white/58">{text}</p>
    </Panel>
  );
}

function OwnershipCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="account-ownership-card">
      <p className="account-ownership-card__label">{label}</p>
      <p className="account-ownership-card__value">{value}</p>
    </div>
  );
}

function StudioMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded border border-white/[0.1] bg-white/[0.05] px-3 py-2">
      <span className="text-xs font-bold text-white/58">{label}</span>
      <span className="text-sm font-black text-gold">{value}</span>
    </div>
  );
}

function RefundRequestInline({
  order,
  refunds,
  reason,
  onReasonChange,
  onSubmit,
}: {
  order: OrderResponse;
  refunds: UserRefundRequest[];
  reason: string;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const existing = refunds.find((item) => item.order.id === order.id);

  if (existing) {
    return (
      <div className="mt-3 rounded border border-white/[0.1] bg-black/15 p-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-gold">Refund request</p>
        <p className="mt-1 text-sm font-bold text-white/75">{existing.refundRequest.status.replaceAll('_', ' ')}</p>
        {existing.refundRequest.adminNote ? (
          <p className="mt-1 text-xs leading-5 text-white/55">{existing.refundRequest.adminNote}</p>
        ) : null}
      </div>
    );
  }

  if (order.status !== 'paid' || !order.paidAt) {
    return null;
  }

  return (
    <div className="mt-3 rounded border border-gold/20 bg-gold/5 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gold">24h refund review</p>
      <textarea
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        rows={3}
        placeholder="Explain what is not working with the file. Minimum 20 characters."
        className="mt-2 w-full resize-y rounded border border-white/[0.12] bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/35"
      />
      <Button type="button" onClick={onSubmit} disabled={reason.trim().length < 20} intent="secondary" className="mt-2 rounded-full">
        Request refund review
      </Button>
      {reason.trim().length < 20 ? (
        <p className="mt-2 text-xs font-bold leading-5 text-white/45">Write at least 20 characters so support has enough context.</p>
      ) : null}
    </div>
  );
}
