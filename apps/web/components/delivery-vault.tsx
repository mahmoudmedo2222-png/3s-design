'use client';

import { CalendarClock, Copy, Download, ExternalLink, FileArchive, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { createDownloadUrl, type DownloadEntitlement } from '../lib/api';
import { trackFunnelEvent } from '../lib/funnel-analytics';
import { ActionLink, Badge, Button, Notice, Panel } from './ui';

export function DeliveryVault({ downloads }: { downloads: DownloadEntitlement[] }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadAsset(entitlementId: string, assetId: string) {
    const key = `${entitlementId}:${assetId}`;
    setLoadingKey(key);
    setError(null);
    trackFunnelEvent('download_asset_requested', {
      entitlementId,
      assetId,
    });

    try {
      const response = await createDownloadUrl(entitlementId, assetId);
      window.open(response.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Download could not be prepared.');
    } finally {
      setLoadingKey(null);
    }
  }

  async function copyLicenseReceipt(item: DownloadEntitlement) {
    const receipt = [
      `Product: ${item.product.title}`,
      `License: ${item.license.name}`,
      `Order: ${item.order.orderNumber}`,
      `Paid at: ${item.order.paidAt ?? 'pending/manual review'}`,
      `Downloads remaining: ${item.downloadsRemaining}/${item.maxDownloads}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(receipt);
      trackFunnelEvent('download_receipt_copied', {
        entitlementId: item.id,
        productId: item.product.id,
        orderNumber: item.order.orderNumber,
      });
      setCopiedKey(item.id);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  }

  return (
    <Panel tone="glass" className="p-4 shadow-[0_22px_82px_rgba(0,0,0,0.22)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
            <FileArchive size={17} />
          </span>
          <div>
            <h2 className="text-lg font-black">Delivery vault</h2>
            <p className="text-xs text-white/55">Purchased designs and download limits</p>
          </div>
        </div>
        <Badge tone="gold" className="px-2.5 py-1 text-xs">
          {downloads.length}
        </Badge>
      </div>

      {downloads.length ? (
        <div className="grid gap-3">
          {error ? (
            <Notice tone="error" className="p-3 text-xs">
              {error}
            </Notice>
          ) : null}
          {downloads.map((item) => (
            <Panel key={item.id} tone="glass" className="p-3 shadow-none">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-black text-white">{item.product.title}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {item.license.name} / Order {item.order.orderNumber}
                  </p>
                </div>
                <Badge tone={item.isActive ? 'success' : 'neutral'} className="shrink-0">
                  {item.isActive ? 'active' : 'inactive'}
                </Badge>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <VaultMetric label="Remaining" value={item.downloadsRemaining} />
                <VaultMetric label="Used" value={item.downloadsUsed} />
                <VaultMetric label="Hourly left" value={item.hourlyDownloadsRemaining} />
              </div>

              <div className="mt-3 grid gap-2 rounded border border-white/[0.1] bg-black/15 p-3 sm:grid-cols-2">
                <VaultFact icon={ShieldCheck} label="License" value={item.license.name} />
                <VaultFact
                  icon={CalendarClock}
                  label="Access"
                  value={item.expiresAt ? `Expires ${formatDate(item.expiresAt)}` : 'No expiry shown'}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <ActionLink
                  href={`/products/${item.product.slug}`}
                  icon={ExternalLink}
                  intent="secondary"
                  className="h-9 bg-[#fff8e8] px-3 text-xs font-black hover:bg-[#f7d17e]"
                >
                  Product page
                </ActionLink>
                <Button
                  type="button"
                  onClick={() => void copyLicenseReceipt(item)}
                  icon={Copy}
                  intent="ghost"
                  size="sm"
                  className="font-black"
                >
                  {copiedKey === item.id ? 'Copied receipt' : 'Copy license receipt'}
                </Button>
              </div>

              {item.assets.length ? (
                <div className="mt-3 grid gap-2">
                  {item.assets.map((asset) => {
                    const key = `${item.id}:${asset.id}`;
                    const disabledReason = downloadDisabledReason(item, loadingKey === key);

                    return (
                      <div key={asset.id} className="grid gap-1">
                        <button
                          type="button"
                          onClick={() => void downloadAsset(item.id, asset.id)}
                          disabled={Boolean(disabledReason)}
                          className="flex min-h-11 items-center justify-between gap-3 rounded border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-left transition hover:border-[#f7d17e]/60 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black text-white">{asset.fileName}</span>
                            <span className="mt-0.5 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/42">
                              {asset.assetType.replace('_', ' ')} / {asset.mimeType}
                            </span>
                          </span>
                          <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded bg-[#fff8e8] px-2 text-xs font-black text-[#101513]">
                            <Download size={13} />
                            {loadingKey === key ? 'Preparing' : 'Download'}
                          </span>
                        </button>
                        {disabledReason && loadingKey !== key ? <p className="text-xs font-bold text-white/42">{disabledReason}</p> : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded border border-white/[0.1] bg-black/15 p-3 text-xs font-bold leading-5 text-white/52">
                  No delivery asset is ready for this entitlement yet.
                </p>
              )}
            </Panel>
          ))}
        </div>
      ) : (
        <Panel tone="glass" className="p-4 shadow-none">
          <ShieldCheck className="text-[#f7d17e]" size={20} />
          <p className="mt-3 text-sm font-black text-white">No unlocked files yet.</p>
          <p className="mt-2 text-sm leading-6 text-white/58">
            After payment approval, purchased designs show here with license, order number, and download limits.
          </p>
          <ActionLink href="/?intro=0#latest-designs" intent="secondary" className="mt-4 h-10 bg-[#fff8e8] font-black hover:bg-[#f7d17e]">
            Browse designs
          </ActionLink>
        </Panel>
      )}
    </Panel>
  );
}

function VaultMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-white/[0.1] bg-black/15 px-3 py-2">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
      <p className="mt-1 text-sm font-black text-[#f7d17e]">{value}</p>
    </div>
  );
}

function downloadDisabledReason(item: DownloadEntitlement, preparing: boolean) {
  if (preparing) return 'Preparing secure download link.';
  if (!item.isActive) return 'This entitlement is inactive until payment or support review is complete.';
  if (item.downloadsRemaining <= 0) return 'Download limit reached for this license.';
  if (item.hourlyDownloadsRemaining <= 0) return 'Hourly download limit reached. Try again later.';
  return null;
}

function VaultFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="shrink-0 text-[#f7d17e]" size={15} />
      <div className="min-w-0">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
        <p className="truncate text-xs font-black text-white/76">{value}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
