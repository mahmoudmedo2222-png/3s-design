'use client';

import { ArrowUpRight, Gem, Heart, Palette, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ProductSummary } from '../lib/api';
import { queueAiSearch } from '../lib/ai-search';
import { moodboardChangedEvent, readMoodboardProducts, removeMoodboardProduct } from '../lib/moodboard-store';
import { DesignPreview } from './design-preview';

export function PrivateShowroom() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const taste = useMemo(() => buildTasteProfile(products), [products]);

  useEffect(() => {
    const refresh = () => setProducts(readMoodboardProducts());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(moodboardChangedEvent, refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(moodboardChangedEvent, refresh);
    };
  }, []);

  function remove(productId: string) {
    removeMoodboardProduct(productId);
    setProducts(readMoodboardProducts());
  }

  function openConciergeBrief() {
    queueAiSearch(taste.prompt);
    router.push(`/search?q=${encodeURIComponent(taste.prompt)}`);
  }

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-white/[0.12] bg-white/[0.055] shadow-premium backdrop-blur-xl">
      <div className="border-b border-white/[0.08] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Private showroom</p>
            <h2 className="mt-2 text-xl font-black text-white">A room built from your taste.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
              Save designs and 3S turns them into a private direction: mood, palette, audience signal, and the next best brief.
            </p>
          </div>
          <button
            type="button"
            onClick={openConciergeBrief}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-cream px-4 text-sm font-black text-cream-ink transition hover:-translate-y-0.5 hover:bg-gold"
          >
            Ask concierge
            <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TasteSignal icon={Gem} label="Signature" value={taste.signature} />
          <TasteSignal icon={Palette} label="Palette" value={taste.palette} />
          <TasteSignal icon={Sparkles} label="Feeling" value={taste.feeling} />
        </div>
      </div>

      {products.length ? (
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 6).map((product) => (
            <article key={product.id} className="group overflow-hidden rounded-lg border border-white/[0.1] bg-white/[0.06]">
              <Link
                href={`/products/${product.slug}`}
                className="relative block aspect-[4/3] overflow-hidden"
                aria-label={`Open ${product.title}`}
              >
                <DesignPreview product={product} variant="mini" />
                <span className="absolute inset-x-2 bottom-2 truncate rounded bg-black/[0.46] px-2 py-1 text-nano font-black text-white/82 backdrop-blur">
                  {product.title}
                </span>
              </Link>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white">{product.defaultLicense?.name ?? 'Commercial license'}</p>
                  <p className="mt-0.5 text-micro font-bold text-gold">
                    {product.defaultLicense?.currency ?? product.currency} {product.defaultLicense?.price ?? product.basePrice}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(product.id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/[0.1] bg-white/[0.06] text-white/56 transition hover:border-berry/50 hover:text-berry"
                  aria-label={`Remove ${product.title}`}
                  title="Remove"
                >
                  <X size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gold/15 text-gold">
              <Heart size={18} />
            </span>
            <div>
              <h3 className="text-base font-black text-white">Your showroom is waiting.</h3>
              <p className="mt-1 max-w-xl text-sm leading-6 text-white/58">
                Save two or three designs and this space becomes a private taste profile, not a generic wishlist.
              </p>
            </div>
          </div>
          <Link
            href="/?intro=0#latest-designs"
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.08] px-4 text-sm font-bold text-white transition hover:border-gold hover:text-gold"
          >
            Curate now
          </Link>
        </div>
      )}
    </section>
  );
}

function TasteSignal({ icon: Icon, label, value }: { icon: typeof Gem; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.1] bg-black/[0.18] p-3">
      <Icon className="text-gold" size={17} />
      <p className="mt-2 text-micro font-black uppercase tracking-caps-wide text-white/42">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function buildTasteProfile(products: ProductSummary[]) {
  const styles = topSignals(products.flatMap((product) => product.designDna?.styles ?? []));
  const moods = topSignals(products.flatMap((product) => product.designDna?.moods ?? []));
  const colors = topSignals(products.flatMap((product) => product.designDna?.colors ?? []));
  const uses = topSignals(products.flatMap((product) => product.designDna?.platforms ?? []));

  const signature = [styles[0], moods[0], uses[0]].filter(Boolean).join(' / ') || 'Unwritten signature';
  const palette = colors.slice(0, 3).join(', ') || 'Curate colors by saving designs';
  const feeling = moods.slice(0, 2).join(' + ') || styles.slice(0, 2).join(' + ') || 'Awaiting first signal';

  return {
    signature,
    palette,
    feeling,
    prompt: `Build a private premium shortlist around ${signature}. Prefer ${palette} colors and a ${feeling} customer feeling.`,
  };
}

function topSignals(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([value]) => value);
}
