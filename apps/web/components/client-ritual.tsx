'use client';

import { BadgeCheck, FileArchive, FileCheck2, ShieldCheck } from 'lucide-react';
import type { DownloadEntitlement, OrderResponse, UserPayment } from '../lib/api';

export function ClientRitual({
  orders,
  payments,
  downloads,
}: {
  orders: OrderResponse[];
  payments: UserPayment[];
  downloads: DownloadEntitlement[];
}) {
  const latestOrder = orders[0];
  const latestPayment = latestOrder ? payments.find((item) => item.order.id === latestOrder.id)?.payment : undefined;
  const hasDownloads = downloads.length > 0;
  const paid = latestOrder?.status === 'paid' || latestPayment?.status === 'paid';

  const steps = [
    {
      icon: ShieldCheck,
      title: 'Payment review',
      text: latestOrder ? `Order ${latestOrder.orderNumber} is ${latestOrder.status}.` : 'Create your first private checkout.',
      active: Boolean(latestOrder),
      done: paid,
    },
    {
      icon: FileCheck2,
      title: 'Quality seal',
      text: paid ? 'Files are cleared for delivery.' : 'Activated after payment confirmation.',
      active: Boolean(latestOrder),
      done: paid,
    },
    {
      icon: FileArchive,
      title: 'Download vault',
      text: hasDownloads
        ? `${downloads.length} entitlement${downloads.length === 1 ? '' : 's'} ready.`
        : 'Secure downloads appear here after approval.',
      active: paid || hasDownloads,
      done: hasDownloads,
    },
  ];

  return (
    <section className="rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
          <BadgeCheck size={17} />
        </span>
        <div>
          <h2 className="text-lg font-black">Client ritual</h2>
          <p className="text-xs text-white/55">From checkout to delivery</p>
        </div>
      </div>

      <div className="grid gap-3">
        {steps.map(({ icon: Icon, title, text, active, done }) => (
          <div key={title} className="flex gap-3 rounded border border-white/[0.1] bg-white/[0.05] p-2.5">
            <span
              className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded ${
                done ? 'bg-[#7bd8bd]/18 text-[#7bd8bd]' : active ? 'bg-[#f7d17e]/15 text-[#f7d17e]' : 'bg-white/[0.06] text-white/36'
              }`}
            >
              <Icon size={15} />
            </span>
            <div>
              <p className="text-sm font-black text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-white/55">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
