'use client';

import { ArrowRight, CheckCircle2, Clock3, CreditCard, FileArchive, ShieldCheck, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchPayment, type PaymentSession } from '../lib/api';
import { ActionLink, Button, Notice, Panel } from './ui';

export function PaymentStatusWorkspace() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!paymentId) {
      return;
    }

    let active = true;
    let timer: number | null = null;

    const refresh = async () => {
      setLoading(true);
      try {
        const nextPayment = await fetchPayment(paymentId);
        if (!active) {
          return;
        }

        setPayment(nextPayment);
        setError(null);

        if (nextPayment.status === 'pending') {
          timer = window.setTimeout(refresh, 5000);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Payment status could not be loaded.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void refresh();

    return () => {
      active = false;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [paymentId]);

  const status = useMemo(() => paymentStatusCopy(payment), [payment]);

  if (!paymentId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Notice tone="error">Missing payment id. Return to checkout or your account dashboard.</Notice>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-5 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="premium-panel p-5">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded ${status.iconTone}`}>
            <status.icon size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Payment status</p>
            <h1 className="mt-1 text-3xl font-black text-ink">{status.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{status.text}</p>
          </div>
        </div>

        {error ? (
          <Notice tone="error" className="mt-4">
            {error}
          </Notice>
        ) : null}

        {payment ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatusDatum label="Provider" value={payment.provider} />
            <StatusDatum label="Mode" value={payment.mode.replaceAll('_', ' ')} />
            <StatusDatum label="Amount" value={`${payment.currency} ${payment.amount}`} />
            <StatusDatum label="Status" value={payment.status} />
          </div>
        ) : (
          <p className="mt-5 rounded border border-line bg-paper p-3 text-sm font-bold text-muted">
            {loading ? 'Loading secure payment status...' : 'Waiting for payment status.'}
          </p>
        )}

        {payment?.redirectUrl && payment.status === 'pending' ? (
          <div className="mt-5 rounded-lg border border-saffron/30 bg-saffron/10 p-4">
            <p className="text-sm font-black text-ink">Secure provider checkout is ready.</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Complete the payment on the provider page. Delivery unlocks only after the trusted webhook confirms the payment.
            </p>
            <Button type="button" onClick={() => window.location.assign(payment.redirectUrl!)} className="mt-3 h-10 font-black">
              Open secure payment
              <ArrowRight size={16} />
            </Button>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <ActionLink href="/account" icon={FileArchive} className="h-10">
            Open account
          </ActionLink>
          <ActionLink href="/?intro=0#latest-designs" intent="secondary" className="h-10">
            Continue browsing
          </ActionLink>
        </div>
      </section>

      <aside className="space-y-3">
        <Panel className="p-4">
          <ShieldCheck className="text-pine" size={20} />
          <h2 className="mt-2 text-lg font-black text-ink">Why this page exists</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Payment providers can confirm late or send duplicate events. We keep this page between checkout and delivery so files never open
            before a verified payment event.
          </p>
        </Panel>
        <Panel className="p-4">
          <CreditCard className="text-saffron" size={20} />
          <h2 className="mt-2 text-lg font-black text-ink">If money was deducted</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Keep the provider reference. If confirmation is delayed, support can reconcile the payment without losing your order.
          </p>
        </Panel>
      </aside>
    </main>
  );
}

function paymentStatusCopy(payment: PaymentSession | null) {
  if (!payment) {
    return {
      icon: Clock3,
      iconTone: 'bg-saffron/15 text-saffron',
      title: 'Checking payment status.',
      text: 'We are loading the latest payment session from your account.',
    };
  }

  if (payment.status === 'paid') {
    return {
      icon: CheckCircle2,
      iconTone: 'bg-pine text-white',
      title: 'Payment confirmed.',
      text: 'Your delivery vault is being prepared. Open your account to download the approved files.',
    };
  }

  if (payment.status === 'failed' || payment.status === 'expired') {
    return {
      icon: XCircle,
      iconTone: 'bg-berry/15 text-berry',
      title: payment.status === 'expired' ? 'Payment session expired.' : 'Payment failed.',
      text: 'No files were unlocked. You can return to checkout or contact support with your provider reference.',
    };
  }

  return {
    icon: Clock3,
    iconTone: 'bg-saffron/15 text-saffron',
    title: 'Payment is pending.',
    text: 'Complete provider checkout if available. We will refresh this page while waiting for trusted confirmation.',
  };
}

function StatusDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-black capitalize text-ink">{value}</p>
    </div>
  );
}
