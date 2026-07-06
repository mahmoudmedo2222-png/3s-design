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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchDownloads, fetchOrders, fetchPayments, type DownloadEntitlement, type OrderResponse, type UserPayment } from '../lib/api';
import { clearAuthSession, useAuthSession } from '../lib/auth-session';
import { queueAiSearch } from '../lib/ai-search';
import { useCartStore } from '../lib/cart-store';
import { ClientRitual } from './client-ritual';
import { PrivateShowroom } from './private-showroom';
import { TasteMemoryPanel } from './taste-memory-panel';
import { ThemeToggle } from './theme-toggle';

const starterPrompt = 'Help me find a design by emotion, industry, colors, customer moment, and commercial use case';

export function AccountDashboard() {
  const router = useRouter();
  const { isSignedIn, user } = useAuthSession();
  const items = useCartStore((state) => state.items);
  const hydrateCart = useCartStore((state) => state.hydrate);
  const clearCartLocal = useCartStore((state) => state.clearLocal);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [downloads, setDownloads] = useState<DownloadEntitlement[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      clearCartLocal();
      setOrders([]);
      setPayments([]);
      setDownloads([]);
      return;
    }

    void hydrateCart();
    void refreshWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function refreshWorkspace() {
    setWorkspaceError(null);

    try {
      const [orderResponse, paymentResponse, downloadResponse] = await Promise.all([fetchOrders(), fetchPayments(), fetchDownloads()]);

      setOrders(orderResponse.items);
      setPayments(paymentResponse.items);
      setDownloads(downloadResponse.items);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Client studio could not refresh.');
    }
  }

  function openAiFinder() {
    queueAiSearch(starterPrompt);
    router.push('/?intro=0#ai-finder');
  }

  function logout() {
    clearCartLocal();
    clearAuthSession();
    router.push('/?intro=0');
    router.refresh();
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#060b0a] px-4 py-5 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
          <section className="w-full max-w-2xl rounded-lg border border-white/[0.12] bg-white/[0.06] p-5 shadow-[0_24px_78px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-6">
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
                <span className="mt-1 block text-2xl font-black text-[#f7d17e]">3S Design</span>
              </span>
            </Link>

            <div className="mt-7">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
                <ShieldCheck size={19} />
              </span>
              <h1 className="mt-4 text-2xl font-black">Sign in to open your client studio.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/68">
                Purchases, AI briefs, cart items, invoices, download limits, and fraud checks live behind a customer account.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?next=/account"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#fff8e8] px-5 text-sm font-black text-[#101513] transition hover:-translate-y-0.5 hover:bg-[#f7d17e]"
              >
                <UserRound size={17} />
                Sign in
              </Link>
              <Link
                href="/register?next=/account"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-5 text-sm font-bold text-white transition hover:border-[#f7d17e] hover:text-[#f7d17e]"
              >
                <Sparkles size={17} />
                Create account
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060b0a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-lg border border-white/[0.12] bg-white/[0.06] p-3 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
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
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-4 text-sm font-bold text-white transition hover:border-[#f7d17e] hover:text-[#f7d17e]"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 shadow-[0_22px_82px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7d17e]">Signed in</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Welcome, {user?.fullName?.split(' ')[0] || 'designer'}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/66">
              Your account is now the protected place for design matching, saved intent, checkout, receipts, and future downloads.
            </p>

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

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={openAiFinder}
                className="group rounded-lg border border-[#f7d17e]/35 bg-[#f7d17e]/10 p-4 text-left transition hover:-translate-y-0.5 hover:bg-[#f7d17e] hover:text-[#101513]"
              >
                <BrainCircuit className="text-[#f7d17e] transition group-hover:text-[#101513]" size={21} />
                <h2 className="mt-3 text-lg font-black">Continue with AI finder</h2>
                <p className="mt-2 text-sm leading-6 text-white/66 group-hover:text-[#101513]/75">
                  Tell us the feeling and unlock full matched pages because you are signed in.
                </p>
              </button>

              <Link
                href="/?intro=0#latest-designs"
                className="group rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 transition hover:-translate-y-0.5 hover:border-[#f7d17e]/45 hover:bg-white/[0.1]"
              >
                <Search className="text-[#f7d17e]" size={21} />
                <h2 className="mt-3 text-lg font-black">Browse staged designs</h2>
                <p className="mt-2 text-sm leading-6 text-white/66">
                  Compare finished products, prices, moods, and commercial use before buying.
                </p>
              </Link>
            </div>
          </div>
          <PrivateShowroom />
        </div>

        <aside className="space-y-3">
          <TasteMemoryPanel />

          <ClientRitual orders={orders} payments={payments} downloads={downloads} />

          <div className="rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-xl">
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
          </div>

          <div className="rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-xl">
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
              <p className="rounded border border-[#f08bb0]/30 bg-[#f08bb0]/10 p-3 text-xs font-bold leading-5 text-[#f08bb0]">
                {workspaceError}
              </p>
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
                      <span className="rounded bg-[#f7d17e]/15 px-2 py-1 text-[0.65rem] font-black uppercase text-[#f7d17e]">
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/55">
                      {order.currency} {order.total}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-white/62">
                Your first private checkout will appear here with payment status and secure download access.
              </p>
            )}
            <button
              type="button"
              onClick={() => void refreshWorkspace()}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#fff8e8] px-4 text-sm font-black text-[#101513] transition hover:bg-[#f7d17e]"
            >
              Refresh studio
              <ArrowUpRight size={16} />
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatusCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/[0.12] bg-white/[0.06] p-3">
      <Icon className="text-[#f7d17e]" size={19} />
      <h2 className="mt-2 text-sm font-black">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-white/58">{text}</p>
    </div>
  );
}

function StudioMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded border border-white/[0.1] bg-white/[0.05] px-3 py-2">
      <span className="text-xs font-bold text-white/58">{label}</span>
      <span className="text-sm font-black text-[#f7d17e]">{value}</span>
    </div>
  );
}
