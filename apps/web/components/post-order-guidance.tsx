'use client';

import { BadgeCheck, CreditCard, FileArchive, MessageCircle, RefreshCw } from 'lucide-react';
import type { DownloadEntitlement, OrderResponse, PaymentSession } from '../lib/api';
import { ActionLink, Button } from './ui';

type Tone = 'light' | 'dark';

export function PostOrderGuidance({
  order,
  payment,
  downloads = [],
  tone = 'light',
  onRefresh,
}: {
  order: OrderResponse;
  payment?: PaymentSession;
  downloads?: DownloadEntitlement[];
  tone?: Tone;
  onRefresh?: () => void;
}) {
  const paid = order.status === 'paid' || payment?.status === 'paid';
  const failed = payment?.status === 'failed';
  const hasDownloads = downloads.some((item) => item.order.id === order.id);
  const state = failed ? 'failed' : hasDownloads ? 'ready' : paid ? 'paid' : 'waiting';
  const styles = toneStyles(tone);

  return (
    <section className={`rounded-lg border p-3 ${styles.shell}`}>
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded ${styles.icon}`}>
          <BadgeCheck size={17} />
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.14em] ${styles.kicker}`}>After-order guidance</p>
          <h3 className={`mt-1 text-base font-black ${styles.title}`}>{stateTitle(state)}</h3>
          <p className={`mt-1 text-xs leading-5 ${styles.text}`}>{stateText(state, order.orderNumber)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <GuidanceStep tone={tone} icon={CreditCard} title="Payment reference" text={`Use ${order.orderNumber} as the payment reference.`} />
        <GuidanceStep
          tone={tone}
          icon={FileArchive}
          title="Delivery vault"
          text={hasDownloads ? 'Your files are ready in the vault.' : 'Files unlock after payment approval.'}
        />
        <GuidanceStep tone={tone} icon={MessageCircle} title="Support" text="Use the account page if payment or delivery needs review." />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionLink href="/account" intent={tone === 'dark' ? 'gold' : 'secondary'} className="h-9 px-3 text-xs" icon={FileArchive}>
          Open delivery desk
        </ActionLink>
        {onRefresh ? (
          <Button type="button" onClick={onRefresh} intent={tone === 'dark' ? 'ghost' : 'secondary'} className="h-9 px-3 text-xs">
            <RefreshCw size={14} />
            Refresh status
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function GuidanceStep({ tone, icon: Icon, title, text }: { tone: Tone; icon: typeof CreditCard; title: string; text: string }) {
  const styles = toneStyles(tone);

  return (
    <div className={`flex gap-2 rounded border p-2 ${styles.step}`}>
      <Icon className={styles.stepIcon} size={14} />
      <div>
        <p className={`text-xs font-black ${styles.title}`}>{title}</p>
        <p className={`mt-0.5 text-xs leading-5 ${styles.text}`}>{text}</p>
      </div>
    </div>
  );
}

function stateTitle(state: 'waiting' | 'paid' | 'ready' | 'failed') {
  if (state === 'ready') return 'Downloads are ready.';
  if (state === 'paid') return 'Payment approved, vault is preparing.';
  if (state === 'failed') return 'Payment needs attention.';
  return 'Payment review is waiting.';
}

function stateText(state: 'waiting' | 'paid' | 'ready' | 'failed', orderNumber: string) {
  if (state === 'ready') return 'Open the delivery desk and download the approved files from your account.';
  if (state === 'paid') return 'Your order is paid. Delivery access should appear shortly after entitlement checks.';
  if (state === 'failed') return 'The payment session failed. Keep the order number and contact support before retrying.';
  return `Your order is saved. Complete manual payment using ${orderNumber}, then wait for approval.`;
}

function toneStyles(tone: Tone) {
  if (tone === 'dark') {
    return {
      shell: 'border-white/[0.1] bg-white/[0.055] text-white',
      icon: 'bg-gold/15 text-gold',
      kicker: 'text-gold',
      title: 'text-white',
      text: 'text-white/58',
      step: 'border-white/[0.1] bg-black/15',
      stepIcon: 'mt-1 shrink-0 text-gold',
    };
  }

  return {
    shell: 'border-pine/20 bg-surface/70 text-ink',
    icon: 'bg-pine/10 text-pine',
    kicker: 'text-pine',
    title: 'text-ink',
    text: 'text-muted',
    step: 'border-pine/15 bg-pine/5',
    stepIcon: 'mt-1 shrink-0 text-pine',
  };
}
