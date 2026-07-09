'use client';

import { ArrowUpRight, BadgeCheck, LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { queueAiSearch } from '../lib/ai-search';
import { type AppLocale, footerCopy } from '../lib/locale';
import { DesignPreview } from './design-preview';

const trustIcons = [ShieldCheck, BadgeCheck, LockKeyhole] as const;

export function SiteFooter({ products, locale }: { products: ProductSummary[]; locale: AppLocale }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const previewProducts = products.slice(0, 3);
  const copy = footerCopy[locale];

  function startMatching(value: string) {
    const text = value.trim();
    if (!text) {
      return;
    }

    queueAiSearch(text);
    router.push(`/search?q=${encodeURIComponent(text)}`);
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startMatching(prompt);
  }

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.1] bg-cream-ink px-4 pb-5 pt-7 text-cream sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(247,209,126,0.72),transparent)]" />

      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
        <section className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gold-strong">{copy.kicker}</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight text-cream sm:text-3xl">{copy.title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{copy.text}</p>

          <form
            onSubmit={submitPrompt}
            className="mt-4 grid max-w-2xl gap-2 rounded border border-line bg-paper p-1 shadow-[0_14px_52px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:grid-cols-[1fr_auto]"
          >
            <label className="flex min-h-10 items-center gap-2 rounded bg-cream-ink px-3">
              <Search className="shrink-0 text-gold-strong" size={16} />
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-cream outline-none placeholder:text-white/52"
                placeholder={copy.placeholder}
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-gold-strong px-4 text-sm font-black text-cream-ink transition hover:-translate-y-0.5 hover:bg-cream active:translate-y-0"
            >
              {copy.match}
              <ArrowUpRight size={15} />
            </button>
          </form>
        </section>

        <aside className="grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            {previewProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded border border-line bg-cream-ink transition hover:-translate-y-0.5 hover:border-gold/50"
                aria-label={`View ${product.title}`}
              >
                <DesignPreview product={product} variant="mini" />
                <span className="absolute inset-x-1 bottom-1 truncate rounded bg-cream-ink/85 px-1.5 py-1 text-[0.56rem] font-black text-cream backdrop-blur-md">
                  {product.title}
                </span>
              </Link>
            ))}
          </div>

          <div className="rounded border border-line bg-cream-ink p-3">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {copy.trustSignals.map((label, index) => {
                const Icon = trustIcons[index] ?? ShieldCheck;

                return (
                  <div key={label} className="flex items-center gap-2 text-xs font-bold text-white/75">
                    <Icon className="text-success" size={15} />
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <div className="mx-auto mt-5 flex max-w-7xl flex-col gap-3 border-t border-line pt-4 text-[0.68rem] font-bold text-white/52 sm:flex-row sm:items-center sm:justify-between">
        <p>{copy.summary}</p>
        <div className="flex flex-wrap gap-4">
          {copy.links.map((link) => (
            <span key={link}>{link}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
