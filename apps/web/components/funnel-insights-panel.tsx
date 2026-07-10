'use client';

import { Activity, Download, MousePointerClick, ReceiptText, Search, ShoppingBag, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { funnelChangedEvent, readFunnelEvents, summarizeFunnel } from '../lib/funnel-analytics';

export function FunnelInsightsPanel() {
  const [summary, setSummary] = useState(() => summarizeFunnel([]));

  useEffect(() => {
    const update = () => setSummary(summarizeFunnel(readFunnelEvents()));
    update();
    window.addEventListener(funnelChangedEvent, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(funnelChangedEvent, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return (
    <section className="rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-gold/15 text-gold">
          <Activity size={17} />
        </span>
        <div>
          <h2 className="text-lg font-black">Local funnel</h2>
          <p className="text-xs text-white/55">This device only, for UX debugging</p>
        </div>
      </div>

      <div className="grid gap-2">
        <FunnelMetric icon={MousePointerClick} label="Product views" value={summary.productViews} />
        <FunnelMetric icon={Search} label="License picks" value={summary.licenseSelections} />
        <FunnelMetric icon={ShoppingBag} label="Cart adds" value={summary.cartAdds} />
        <FunnelMetric icon={ReceiptText} label="Orders created" value={summary.ordersCreated} />
        <FunnelMetric icon={Download} label="Downloads requested" value={summary.downloadsRequested} />
      </div>

      <p className="mt-3 text-xs leading-5 text-white/45">
        Next production step: send these events to the backend or analytics provider with privacy rules and consent copy.
      </p>
    </section>
  );
}

function FunnelMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-white/[0.1] bg-white/[0.05] px-3 py-2">
      <span className="inline-flex items-center gap-2 text-xs font-bold text-white/58">
        <Icon className="text-gold" size={14} />
        {label}
      </span>
      <span className="text-sm font-black text-gold">{value}</span>
    </div>
  );
}
