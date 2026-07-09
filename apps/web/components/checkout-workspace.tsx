'use client';

import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Copy,
  CreditCard,
  FileArchive,
  LockKeyhole,
  MessageCircle,
  PlugZap,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthSession } from '../lib/auth-session';
import { fetchPaymentProviderReadiness, type PaymentProviderReadiness } from '../lib/api';
import { captureAttributionFromLocation, readAttribution, type AttributionSnapshot } from '../lib/attribution';
import { useCartStore, type CartItem } from '../lib/cart-store';
import { trackFunnelEvent } from '../lib/funnel-analytics';
import { buildCustomerDecisionProfile, tasteMemoryChangedEvent, type CustomerDecisionProfile } from '../lib/taste-memory';
import { CustomerEmptyState, CustomerJourneyRail, CustomerTrustStrip } from './customer-experience';
import { PostOrderGuidance } from './post-order-guidance';
import { ActionLink, Badge, Button, Notice, Panel } from './ui';

export function CheckoutWorkspace() {
  const router = useRouter();
  const { isSignedIn } = useAuthSession();
  const items = useCartStore((state) => state.items);
  const totals = useCartStore((state) => state.totals);
  const hydrate = useCartStore((state) => state.hydrate);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);
  const clearLocal = useCartStore((state) => state.clearLocal);
  const checkout = useCartStore((state) => state.checkout);
  const isLoading = useCartStore((state) => state.isLoading);
  const isCheckingOut = useCartStore((state) => state.isCheckingOut);
  const error = useCartStore((state) => state.error);
  const notice = useCartStore((state) => state.notice);
  const lastCheckout = useCartStore((state) => state.lastCheckout);
  const [mounted, setMounted] = useState(false);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);
  const [providers, setProviders] = useState<PaymentProviderReadiness[]>([]);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [decisionProfile, setDecisionProfile] = useState<CustomerDecisionProfile | null>(null);
  const [attribution, setAttribution] = useState<AttributionSnapshot | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const refreshDecisionContext = () => {
      setDecisionProfile(buildCustomerDecisionProfile());
      setAttribution(captureAttributionFromLocation() ?? readAttribution());
    };

    refreshDecisionContext();
    window.addEventListener('storage', refreshDecisionContext);
    window.addEventListener(tasteMemoryChangedEvent, refreshDecisionContext);

    return () => {
      window.removeEventListener('storage', refreshDecisionContext);
      window.removeEventListener(tasteMemoryChangedEvent, refreshDecisionContext);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (isSignedIn) {
      void hydrate();
    } else {
      clearLocal();
    }
  }, [clearLocal, hydrate, isSignedIn, mounted]);

  useEffect(() => {
    if (!mounted || !isSignedIn) {
      setProviders([]);
      setProvidersError(null);
      return;
    }

    let active = true;

    fetchPaymentProviderReadiness()
      .then((response) => {
        if (active) {
          setProviders(response.items);
          setProvidersError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setProviders([]);
          setProvidersError(err instanceof Error ? err.message : 'Payment readiness is not reachable');
        }
      });

    return () => {
      active = false;
    };
  }, [isSignedIn, mounted]);

  async function createOrder() {
    if (!licenseConfirmed) {
      return;
    }

    try {
      const selectedProvider = selectCheckoutProvider(providers);
      trackFunnelEvent('checkout_order_attempted', {
        itemCount: items.length,
        total: totals.total,
        currency: totals.currency,
        provider: selectedProvider,
        buyerStage: decisionProfile?.stage ?? null,
        buyerConfidence: decisionProfile?.confidence ?? null,
        attributionSource: attribution?.source ?? null,
      });
      const result = await checkout(selectedProvider);
      trackFunnelEvent('checkout_order_created', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        currency: result.order.currency,
        provider: result.payment.provider,
      });
      router.push(`/checkout/status?paymentId=${encodeURIComponent(result.payment.id)}` as Route);
    } catch {
      return;
    }
  }

  async function copyOrderNumber() {
    const orderNumber = lastCheckout?.order.orderNumber;
    if (!orderNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedOrderNumber(true);
      window.setTimeout(() => setCopiedOrderNumber(false), 1800);
    } catch {
      setCopiedOrderNumber(false);
    }
  }

  if (!isSignedIn) {
    return (
      <section className="checkout-workspace mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-4">
          <CustomerJourneyRail current="checkout" />
          <div className="premium-panel p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-saffron/15 text-saffron">
              <LockKeyhole size={19} />
            </span>
            <h1 className="mt-4 text-3xl font-black text-ink">Sign in before checkout.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Checkout is locked to customer accounts so order ownership, payment review, invoices, and download limits cannot drift between
              devices.
            </p>
            {!mounted ? (
              <p className="mt-3 rounded border border-saffron/30 bg-saffron/10 p-3 text-xs font-bold leading-5 text-ink">
                Preparing the secure checkout workspace. If you are already signed in, your cart will appear here automatically.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionLink href="/login?next=/checkout" className="h-11 px-5" icon={LockKeyhole}>
                Sign in
              </ActionLink>
              <ActionLink href="/register?next=/checkout" intent="secondary" className="h-11 px-5" icon={UserPlus}>
                Create account
              </ActionLink>
            </div>
          </div>
        </div>
        <CheckoutTrustPanel />
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
      <div className="space-y-4">
        <CustomerJourneyRail current="checkout" />

        <div className="premium-panel p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Review order</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-ink">Private checkout</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Confirm the license lines before creating the order. We use the strongest available payment route and unlock delivery only
                after trusted confirmation.
              </p>
            </div>
            {items.length ? (
              <Button type="button" onClick={() => void clear()} intent="danger" className="h-10 px-3">
                Clear cart
              </Button>
            ) : null}
          </div>
        </div>

        <div className="premium-panel overflow-hidden">
          {items.length ? (
            <div className="divide-y divide-line">
              {items.map((item) => (
                <div key={item.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-base font-black text-ink">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {item.licenseName} / Qty {item.quantity} / {item.currency} {item.unitPrice}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone="success" className="normal-case tracking-normal">
                        {item.licenseType}
                      </Badge>
                      <Badge tone="gold" className="normal-case tracking-normal text-ink">
                        Account-owned license
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <p className="text-lg font-black text-ink">
                      {item.currency} {item.total}
                    </p>
                    <Button
                      type="button"
                      onClick={() => void remove(item.id)}
                      intent="danger"
                      size="icon"
                      aria-label={`Remove ${item.title}`}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <CustomerEmptyState
                icon={ShoppingBag}
                title={isLoading ? 'Loading your cart...' : 'Your cart is empty.'}
                text="Add a design after checking its fit, license, and customer moment. Checkout works best when the decision is already clear."
                action={
                  <ActionLink href="/?intro=0#latest-designs" className="h-10">
                    Browse designs
                  </ActionLink>
                }
              />
            </div>
          )}
        </div>

        {items.length ? (
          <>
            <CheckoutDecisionConfidence items={items} profile={decisionProfile} attribution={attribution} />
            <Panel className="grid gap-3 p-3 md:grid-cols-3">
              <CheckoutPromise title="1. Private order" text="The order is created inside the signed-in customer account." />
              <CheckoutPromise
                title="2. Payment review"
                text="Provider checkout is used when ready; manual review remains the controlled fallback."
              />
              <CheckoutPromise title="3. Vault delivery" text="Approved purchases unlock download access from the account dashboard." />
            </Panel>
          </>
        ) : null}

        {error ? <Notice tone="error">{error}</Notice> : null}
        {notice && !lastCheckout ? <Notice tone="success">{notice}</Notice> : null}
        {lastCheckout ? <OrderCreatedPanel copied={copiedOrderNumber} onCopy={() => void copyOrderNumber()} /> : null}
        <CustomerTrustStrip />
      </div>

      <aside className="space-y-3 lg:sticky lg:top-5 lg:self-start">
        <Panel className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-pine/10 text-pine">
              <CreditCard size={17} />
            </span>
            <div>
              <h2 className="text-lg font-black text-ink">Order summary</h2>
              <p className="text-xs text-muted">{paymentModeLabel(providers)}</p>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <SummaryRow label="Subtotal" value={`${totals.currency} ${totals.subtotal}`} />
            <SummaryRow label="Discount" value={`${totals.currency} ${totals.discountTotal}`} />
            <SummaryRow label="Tax" value={`${totals.currency} ${totals.taxTotal}`} />
            <div className="mt-2 flex items-center justify-between border-t border-line pt-3 text-base font-black">
              <span>Total</span>
              <span>
                {totals.currency} {totals.total}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded border border-saffron/30 bg-saffron/10 p-3">
            <p className="text-sm font-black text-ink">Before you create the order</p>
            <div className="mt-3 grid gap-2">
              <SummaryCheck
                text={
                  selectCheckoutProvider(providers) === 'manual'
                    ? 'This does not charge a card automatically.'
                    : 'You will be sent to secure provider checkout.'
                }
              />
              <SummaryCheck text="The order is saved before payment starts." />
              <SummaryCheck text="Downloads open only after trusted payment confirmation." />
            </div>
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded border border-line bg-paper p-3 text-sm font-bold leading-6 text-ink dark:bg-[#0f1513]">
            <input
              type="checkbox"
              checked={licenseConfirmed}
              onChange={(event) => {
                setLicenseConfirmed(event.target.checked);
                trackFunnelEvent('checkout_confirmation_toggled', {
                  checked: event.target.checked,
                  itemCount: items.length,
                  total: totals.total,
                });
              }}
              className="mt-1 h-4 w-4 accent-pine"
            />
            <span>I reviewed the selected license, order total, and delivery-vault process before creating this order.</span>
          </label>

          <Button
            type="button"
            onClick={() => void createOrder()}
            disabled={!items.length || isLoading || isCheckingOut || !licenseConfirmed}
            className="mt-4 h-11 w-full font-black"
          >
            {isCheckingOut
              ? 'Creating order...'
              : selectCheckoutProvider(providers) === 'manual'
                ? 'Create private order'
                : 'Continue to secure payment'}
            <ArrowRight size={17} />
          </Button>
          {!items.length ? (
            <p className="mt-2 text-xs font-bold leading-5 text-muted">Add a design to the cart before creating a private order.</p>
          ) : !licenseConfirmed ? (
            <p className="mt-2 text-xs font-bold leading-5 text-saffron">
              Confirm the license and delivery-vault process above to enable this button.
            </p>
          ) : null}

          {lastCheckout ? (
            <Button type="button" onClick={() => router.push('/account')} intent="secondary" className="mt-2 w-full">
              Open delivery desk
              <FileArchive size={16} />
            </Button>
          ) : null}
        </Panel>

        <PaymentReadinessPanel error={providersError} providers={providers} />
        <CheckoutProgress orderCreated={Boolean(lastCheckout)} />
        <CheckoutTrustPanel />
      </aside>
    </section>
  );
}

function OrderCreatedPanel({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  const lastCheckout = useCartStore((state) => state.lastCheckout);

  if (!lastCheckout) {
    return null;
  }

  const order = lastCheckout.order;
  const payment = lastCheckout.payment;

  return (
    <section className="rounded-lg border border-pine/25 bg-pine/10 p-4 shadow-sm">
      <div className="flex gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-pine text-white">
          <CheckCircle2 size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Order created</p>
          <h2 className="mt-1 text-2xl font-black text-ink">Payment review is waiting.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your order is saved. Use the order number as the payment reference, then the delivery vault opens after payment approval.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <SuccessDatum label="Order" value={order.orderNumber} />
        <SuccessDatum label="Amount" value={`${order.currency} ${order.total}`} />
        <SuccessDatum label="Payment" value={payment.mode === 'manual_review' ? 'Manual review' : payment.provider} />
        <SuccessDatum label="Status" value={order.status} />
      </div>

      <div className="mt-4 rounded border border-pine/20 bg-white/70 p-3 dark:bg-[#101816]">
        <p className="text-sm font-black text-ink">Manual payment instructions</p>
        <ol className="mt-2 grid gap-2 text-sm leading-6 text-muted">
          <li>1. Pay the exact amount shown above using the approved manual payment method.</li>
          <li>2. Use order number {order.orderNumber} as the payment reference.</li>
          <li>3. Payment is reviewed by the 3S team before downloads are unlocked.</li>
          <li>4. After approval, files appear in your account Delivery Vault.</li>
        </ol>
      </div>

      <div className="mt-4">
        <PostOrderGuidance order={order} payment={payment} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={onCopy} className="h-10 font-black">
          <Copy size={16} />
          {copied ? 'Copied' : 'Copy order number'}
        </Button>
        <ActionLink href="/account" intent="secondary" className="h-10" icon={FileArchive}>
          Open delivery desk
        </ActionLink>
        <ActionLink href="/?intro=0#latest-designs" intent="secondary" className="h-10" icon={ShoppingBag}>
          Continue shopping
        </ActionLink>
        <ActionLink href="/account" intent="secondary" className="h-10" icon={MessageCircle}>
          Contact support
        </ActionLink>
      </div>
    </section>
  );
}

function SuccessDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-pine/20 bg-white/70 p-3 dark:bg-[#101816]">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function SummaryCheck({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs font-bold leading-5 text-ink">
      <BadgeCheck className="mt-0.5 shrink-0 text-pine" size={14} />
      <span>{text}</span>
    </div>
  );
}

function CheckoutProgress({ orderCreated }: { orderCreated: boolean }) {
  const steps = [
    { label: 'Cart reviewed', done: true },
    { label: 'Order created', done: orderCreated },
    { label: 'Payment review', done: false },
    { label: 'Vault unlocked', done: false },
  ];

  return (
    <Panel className="p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Checkout progress</p>
      <div className="mt-4 grid gap-2">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-black ${
                step.done ? 'bg-pine text-white' : 'bg-paper text-muted dark:bg-[#0f1513]'
              }`}
            >
              {step.done ? <CheckCircle2 size={14} /> : index + 1}
            </span>
            <span className={step.done ? 'text-sm font-black text-ink' : 'text-sm font-bold text-muted'}>{step.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function selectCheckoutProvider(providers: PaymentProviderReadiness[]) {
  if (providers.some((provider) => provider.provider === 'paymob' && provider.configured)) {
    return 'paymob';
  }

  return 'manual';
}

function paymentModeLabel(providers: PaymentProviderReadiness[]) {
  return selectCheckoutProvider(providers) === 'paymob' ? 'Paymob secure checkout' : 'Manual review mode';
}

function CheckoutPromise({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-line bg-paper p-3 dark:bg-[#0f1513]">
      <p className="text-sm font-black text-ink">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}

function CheckoutDecisionConfidence({
  items,
  profile,
  attribution,
}: {
  items: CartItem[];
  profile: CustomerDecisionProfile | null;
  attribution: AttributionSnapshot | null;
}) {
  const primaryItem = items[0];
  const itemTitles = items.map((item) => item.title).slice(0, 3);
  const licenseNames = [...new Set(items.map((item) => item.licenseName).filter(Boolean))].slice(0, 3);
  const source = attribution?.campaign ?? attribution?.intent ?? attribution?.brief ?? profile?.prompt;
  const reasons = profile?.reasons.length ? profile.reasons : (profile?.terms.slice(0, 4).map((term) => `Signal: ${term}`) ?? []);

  return (
    <Panel className="overflow-hidden border-pine/20 p-0">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-pine/10 text-pine">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Checkout decision confidence</p>
              <h2 className="mt-1 text-xl font-black text-ink">
                {primaryItem ? `You are about to order ${primaryItem.title}.` : 'Review the buying decision before checkout.'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                {profile
                  ? `${profile.signature}. ${profile.nextAction}`
                  : 'Confirm that the selected products, license, and delivery flow still match the customer moment.'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <DecisionFact label="Cart focus" value={itemTitles.join(' / ')} fallback="No cart focus yet" />
            <DecisionFact label="License" value={licenseNames.join(' / ')} fallback="License not selected" />
            <DecisionFact label="Intent source" value={source ?? ''} fallback="Direct checkout" />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(reasons.length ? reasons : ['Account-owned license', 'Manual payment review', 'Vault delivery']).slice(0, 5).map((reason) => (
              <span key={reason} className="rounded border border-pine/20 bg-pine/10 px-2.5 py-1 text-xs font-bold text-pine">
                {reason}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-line bg-paper p-4 dark:bg-[#0f1513] lg:border-l lg:border-t-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Do not create the order if</p>
          <div className="mt-3 grid gap-2">
            <SummaryCheck text="The license does not match the intended commercial use." />
            <SummaryCheck text="The buyer moment no longer matches the selected design." />
            <SummaryCheck text="You are not ready for manual payment review and vault delivery." />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function DecisionFact({ label, value, fallback }: { label: string; value: string; fallback: string }) {
  return (
    <div className="rounded border border-line bg-paper p-3 dark:bg-[#0f1513]">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-ink">{value || fallback}</p>
    </div>
  );
}

function CheckoutTrustPanel() {
  const steps = [
    { icon: LockKeyhole, title: 'Account ownership', text: 'The order, license, and downloads stay attached to this signed-in account.' },
    {
      icon: ShieldCheck,
      title: 'Payment review',
      text: 'Current checkout creates a manual payment session until a live provider is chosen.',
    },
    { icon: FileArchive, title: 'Delivery vault', text: 'Approved purchases unlock downloadable assets from the account dashboard.' },
  ];

  return (
    <Panel className="p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Buyer confidence</p>
      <div className="mt-4 grid gap-3">
        {steps.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 rounded border border-line bg-paper p-3 dark:bg-[#0f1513]">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-saffron/15 text-saffron">
              <Icon size={15} />
            </span>
            <div>
              <p className="text-sm font-black text-ink">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PaymentReadinessPanel({ providers, error }: { providers: PaymentProviderReadiness[]; error: string | null }) {
  const manual = providers.find((item) => item.provider === 'manual');
  const liveProviders = providers.filter((item) => item.provider !== 'manual');

  return (
    <Panel className="p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-saffron/15 text-saffron">
          <PlugZap size={17} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Payment readiness</p>
          <h2 className="mt-1 text-lg font-black text-ink">
            {providers.some((provider) => provider.provider === 'paymob' && provider.configured)
              ? 'Secure provider checkout is ready.'
              : manual?.configured
                ? 'Safe manual checkout is active.'
                : 'Payment status needs attention.'}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Provider checkout stays disabled until setup, webhook verification, and amount checks are ready.
          </p>
        </div>
      </div>

      {error ? (
        <Notice tone="error" className="mt-3 text-xs font-bold">
          {error}
        </Notice>
      ) : null}

      <div className="mt-4 grid gap-2">
        {(providers.length ? providers : placeholderProviders()).map((provider) => (
          <div
            key={provider.provider}
            className="flex items-center justify-between gap-3 rounded border border-line bg-paper p-3 dark:bg-[#0f1513]"
          >
            <div>
              <p className="text-sm font-black capitalize text-ink">{provider.provider}</p>
              <p className="mt-1 text-xs text-muted">
                {provider.mode === 'manual_review' ? 'Manual review flow' : 'Provider checkout flow'}
              </p>
              {provider.nextAction ? <p className="mt-1 max-w-md text-xs leading-5 text-muted">{provider.nextAction}</p> : null}
            </div>
            <span
              className={`rounded px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                provider.configured ? 'bg-pine/10 text-pine' : 'bg-saffron/15 text-saffron'
              }`}
            >
              {provider.configured ? 'Ready' : 'Needs keys'}
            </span>
          </div>
        ))}
      </div>

      {liveProviders.some((provider) => !provider.configured) ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          Missing keys are intentionally hidden from customers. The admin/dev checklist can expose exact env names during setup.
        </p>
      ) : null}
    </Panel>
  );
}

function placeholderProviders(): PaymentProviderReadiness[] {
  return [
    { provider: 'manual', configured: true, mode: 'manual_review', missing: [] },
    { provider: 'paypal', configured: false, mode: 'provider_checkout', missing: [] },
    { provider: 'paymob', configured: false, mode: 'provider_checkout', missing: [] },
    { provider: 'fawry', configured: false, mode: 'provider_checkout', missing: [] },
  ];
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <span>{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}
