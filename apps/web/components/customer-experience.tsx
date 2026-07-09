import { BadgeCheck, Clock3, FileArchive, Search, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function SectionHeading({
  kicker,
  title,
  text,
  align = 'start',
}: {
  kicker: string;
  title: string;
  text?: string;
  align?: 'start' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-pine dark:text-[#f7d17e]">{kicker}</p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-ink sm:text-3xl">{title}</h2>
      {text ? <p className="mt-3 text-sm leading-6 text-muted">{text}</p> : null}
    </div>
  );
}

export function CustomerTrustStrip({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  const items = [
    {
      icon: ShieldCheck,
      title: 'Account-owned license',
      text: 'Every purchase is attached to a protected customer account.',
    },
    {
      icon: FileArchive,
      title: 'Delivery vault',
      text: 'Approved orders unlock files from the account dashboard.',
    },
    {
      icon: Clock3,
      title: 'Manual review ready',
      text: 'Payment review keeps early commerce controlled and traceable.',
    },
  ];

  return (
    <div
      className={
        dark
          ? 'grid gap-3 rounded-lg border border-white/[0.12] bg-white/[0.06] p-3 backdrop-blur-xl md:grid-cols-3'
          : 'grid gap-3 rounded-lg border border-line bg-white p-3 shadow-sm dark:border-white/[0.12] dark:bg-[#121816] md:grid-cols-3'
      }
    >
      {items.map((item) => (
        <TrustItem key={item.title} {...item} dark={dark} />
      ))}
    </div>
  );
}

function TrustItem({ icon: Icon, title, text, dark }: { icon: LucideIcon; title: string; text: string; dark: boolean }) {
  return (
    <div
      className={
        dark
          ? 'flex gap-3 rounded border border-white/[0.1] bg-white/[0.05] p-3'
          : 'flex gap-3 rounded border border-line bg-paper p-3 dark:bg-[#0f1513]'
      }
    >
      <span
        className={
          dark
            ? 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]'
            : 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-pine/10 text-pine'
        }
      >
        <Icon size={17} />
      </span>
      <div>
        <p className={dark ? 'text-sm font-black text-white' : 'text-sm font-black text-ink'}>{title}</p>
        <p className={dark ? 'mt-1 text-xs leading-5 text-white/58' : 'mt-1 text-xs leading-5 text-muted'}>{text}</p>
      </div>
    </div>
  );
}

export function BuyerDecisionCard({ icon: Icon = Sparkles, title, text }: { icon?: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm dark:border-white/[0.12] dark:bg-[#121816]">
      <Icon className="text-pine dark:text-[#f7d17e]" size={18} />
      <p className="mt-3 text-sm font-black text-ink">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}

export function ConfidenceBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-pine/20 bg-pine/10 px-2.5 py-1 text-xs font-bold text-pine dark:border-[#f7d17e]/25 dark:bg-[#f7d17e]/10 dark:text-[#f7d17e]">
      <BadgeCheck size={13} />
      {children}
    </span>
  );
}

export function CustomerJourneyRail({
  current,
  tone = 'light',
}: {
  current: 'discover' | 'inspect' | 'checkout' | 'deliver';
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  const steps = [
    { id: 'discover', label: 'Discover', text: 'Find the right feeling' },
    { id: 'inspect', label: 'Inspect', text: 'Check fit and license' },
    { id: 'checkout', label: 'Checkout', text: 'Create a private order' },
    { id: 'deliver', label: 'Deliver', text: 'Unlock the vault' },
  ] as const;
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <div
      className={
        dark
          ? 'grid gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] p-2 backdrop-blur-xl md:grid-cols-4'
          : 'grid gap-2 rounded-lg border border-line bg-white p-2 shadow-sm dark:border-white/[0.12] dark:bg-[#121816] md:grid-cols-4'
      }
      aria-label="Customer journey"
    >
      {steps.map((step, index) => {
        const active = step.id === current;
        const done = index < currentIndex;

        return (
          <div
            key={step.id}
            className={
              active
                ? dark
                  ? 'rounded border border-[#f7d17e]/45 bg-[#f7d17e]/12 p-3'
                  : 'rounded border border-pine/30 bg-pine/10 p-3'
                : dark
                  ? 'rounded border border-white/[0.08] bg-white/[0.04] p-3'
                  : 'rounded border border-line bg-paper p-3 dark:bg-[#0f1513]'
            }
          >
            <div className="flex items-center gap-2">
              <span
                className={
                  active || done
                    ? dark
                      ? 'inline-flex h-6 w-6 items-center justify-center rounded bg-[#f7d17e] text-xs font-black text-[#101513]'
                      : 'inline-flex h-6 w-6 items-center justify-center rounded bg-pine text-xs font-black text-white'
                    : dark
                      ? 'inline-flex h-6 w-6 items-center justify-center rounded bg-white/[0.08] text-xs font-black text-white/58'
                      : 'inline-flex h-6 w-6 items-center justify-center rounded bg-white text-xs font-black text-muted'
                }
              >
                {done ? <BadgeCheck size={13} /> : index + 1}
              </span>
              <p className={dark ? 'text-sm font-black text-white' : 'text-sm font-black text-ink'}>{step.label}</p>
            </div>
            <p className={dark ? 'mt-2 text-xs leading-5 text-white/56' : 'mt-2 text-xs leading-5 text-muted'}>{step.text}</p>
          </div>
        );
      })}
    </div>
  );
}

export function CustomerEmptyState({
  title,
  text,
  action,
  icon: Icon = Search,
  tone = 'light',
}: {
  title: string;
  text: string;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';

  return (
    <div
      className={
        dark
          ? 'rounded-lg border border-dashed border-white/[0.14] bg-white/[0.04] p-8 text-center'
          : 'rounded-lg border border-dashed border-line bg-white p-8 text-center shadow-sm dark:border-white/[0.14] dark:bg-[#121816]'
      }
    >
      <span
        className={
          dark
            ? 'mx-auto inline-flex h-11 w-11 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]'
            : 'mx-auto inline-flex h-11 w-11 items-center justify-center rounded bg-pine/10 text-pine'
        }
      >
        <Icon size={21} />
      </span>
      <h2 className={dark ? 'mt-3 text-xl font-black text-white' : 'mt-3 text-xl font-black text-ink'}>{title}</h2>
      <p className={dark ? 'mx-auto mt-2 max-w-md text-sm leading-6 text-white/56' : 'mx-auto mt-2 max-w-md text-sm leading-6 text-muted'}>
        {text}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
