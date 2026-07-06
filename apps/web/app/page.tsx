import { ArrowUpRight, Crown, Flame, HeartHandshake, Sparkles, Wand2 } from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AiDiscoveryPanel } from '../components/ai-discovery-panel';
import { CompareTray } from '../components/compare-tray';
import { DesignPreview } from '../components/design-preview';
import { IntentLink } from '../components/intent-link';
import { ProductCard } from '../components/product-card';
import { ShowcaseHeader } from '../components/showcase-header';
import { SiteFooter } from '../components/site-footer';
import { SiteIntro } from '../components/site-intro';
import { fetchBestSellers, fetchProducts, type ProductSummary } from '../lib/api';
import { type AppLocale, homeCopy } from '../lib/locale';
import { getRequestLocale } from '../lib/server-locale';

export const dynamic = 'force-dynamic';

const momentIcons = [Flame, Sparkles, Crown, HeartHandshake, Wand2, Sparkles] as const;

export default async function HomePage() {
  const locale = await getRequestLocale();
  const copy = homeCopy[locale];
  const intentPaths = copy.intentPaths;
  const [products, bestSellers] = await Promise.all([fetchProducts(), fetchBestSellers()]);
  const featured = bestSellers.items.length ? bestSellers.items : products.items.slice(0, 6);
  const heroProduct = featured[0] ?? products.items[0];

  return (
    <main className="showcase-page min-h-screen overflow-hidden text-white">
      <SiteIntro />
      <ShowcaseHeader locale={locale} />
      <CompareTray />

      <section className="hero-stage relative overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
        <Image src="/intro/cinematic-03.png" alt="" fill priority sizes="100vw" className="object-cover opacity-[0.42]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_64%_18%,rgba(247,209,126,0.14),transparent_30%),linear-gradient(180deg,rgba(6,11,10,0.26),rgba(6,11,10,0.68)_56%,#060b0a_100%)]" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0">
            <div className="mb-4 hidden gap-4 overflow-auto pb-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/[0.72] thin-scrollbar md:flex">
              {intentPaths.map((item, index) => (
                <IntentLink key={item.id} href={`#${item.id}` as Route} label={item.label} prompt={item.prompt} active={index === 0} />
              ))}
            </div>

            {heroProduct ? (
              <HeroShowcase product={heroProduct} locale={locale} />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/[0.60]">
                {copy.publishPrompt}
              </div>
            )}
          </div>

          <aside className="hero-side hidden space-y-3 lg:block lg:pt-8">
            <div className="showcase-side-panel rounded-lg border border-white/[0.12] bg-white/[0.08] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
                    <Flame size={17} />
                  </span>
                  <div>
                    <h2 className="text-base font-black">{copy.bestSellers}</h2>
                    <p className="text-xs text-white/[0.55]">{copy.bestSellersText}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                {featured.slice(0, 4).map((product, index) => (
                  <BestSellerRow key={product.id} product={product} index={index} />
                ))}
                {!featured.length ? <p className="text-sm text-white/65">{copy.noProducts}</p> : null}
              </div>
            </div>

            <div className="showcase-side-panel rounded-lg border border-white/[0.12] bg-black/25 p-3 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7d17e]">{copy.newRule}</p>
              <p className="mt-2 text-sm leading-6 text-white/[0.74]">{copy.newRuleText}</p>
            </div>
          </aside>
        </div>
      </section>

      <section id="ai-finder" className="ai-concierge relative mx-auto max-w-7xl scroll-mt-24 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7d17e]">{copy.aiKicker}</p>
            <h2 className="mt-2 max-w-3xl text-xl font-black text-white sm:text-2xl">{copy.aiTitle}</h2>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded border border-white/[0.12] bg-white/[0.08] px-4 text-sm font-bold text-white transition hover:border-[#f7d17e] hover:text-[#f7d17e]"
          >
            {copy.saveSearch}
          </Link>
        </div>
        <div className="ai-concierge__panel rounded-lg border border-white/[0.12] bg-white/[0.06] p-2 shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <AiDiscoveryPanel />
        </div>
      </section>

      <section id="shop-by-emotion" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7d17e]">{copy.momentsKicker}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{copy.momentsTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.62]">{copy.momentsText}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {intentPaths.map((path, index) => (
            <MoodCollection
              key={path.id}
              id={path.id}
              icon={momentIcons[index] ?? Sparkles}
              title={path.title}
              text={path.text}
              prompt={path.prompt}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <section id="latest-designs" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7d17e]">{copy.latestKicker}</p>
            <h2 className="mt-2 text-2xl font-black text-white">{copy.latestTitle}</h2>
          </div>
        </div>

        {products.items.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/[0.14] bg-white/[0.04] p-10 text-center text-sm text-white/[0.60]">
            {copy.emptyCatalog}
          </div>
        )}
      </section>

      <SiteFooter products={featured.length ? featured : products.items} locale={locale} />
    </main>
  );
}

function HeroShowcase({ product, locale = 'en' }: { product: ProductSummary; locale?: AppLocale }) {
  const href = `/products/${product.slug}` as Route;
  const copy = homeCopy[locale];

  return (
    <div className="hero-showcase relative overflow-hidden rounded-lg border border-white/[0.12] bg-black/[0.24] shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(247,209,126,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.01))]" />

      <div className="hero-showcase__grid relative grid min-h-[380px] gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr] xl:min-h-[420px]">
        <div className="hero-showcase__copy flex flex-col justify-start gap-4">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#f7d17e]">
              <Sparkles size={14} />
              {copy.featuredDesign}
            </div>
            <h1 className="hero-showcase__title max-w-xl text-3xl font-black leading-[1.02] text-white sm:text-4xl lg:text-[2.65rem]">
              {product.title}
            </h1>
            <p className="mt-3 max-w-md text-xs font-black uppercase tracking-[0.16em] text-[#f7d17e]">{copy.readyVisuals}</p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/[0.70]">{product.subtitle ?? copy.fallbackSubtitle}</p>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                product.designDna?.moods?.[0] ?? copy.premium,
                product.designDna?.styles?.[0] ?? copy.curated,
                product.designDna?.platforms?.[0] ?? copy.readyToUse,
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-white/[0.76]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="hero-price-card grid gap-3 rounded-lg border border-white/[0.12] bg-white/[0.07] p-3 backdrop-blur-md sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/[0.45]">{copy.startsAt}</p>
                <p className="mt-1 text-2xl font-black text-[#f7d17e]">
                  {product.currency} {product.basePrice}
                </p>
                <p className="mt-1 text-xs font-semibold text-white/[0.62]">{copy.license}</p>
              </div>
              <Link
                href={href}
                className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#fff8e8] px-4 text-sm font-black text-[#101513] transition hover:-translate-y-0.5 hover:bg-[#f7d17e]"
              >
                {copy.viewDesign}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        <Link
          href={href}
          className="hero-preview-card group relative min-h-[320px] overflow-hidden rounded-lg border border-white/[0.12] bg-black/[0.22]"
          aria-label={`View ${product.title}`}
        >
          <DesignPreview product={product} variant="hero" />
          <div className="pointer-events-none absolute inset-x-5 bottom-5 flex items-center justify-between rounded-lg border border-white/[0.12] bg-black/[0.28] px-4 py-3 text-sm font-bold text-white/[0.78] opacity-0 backdrop-blur-md transition group-hover:opacity-100">
            <span>{copy.openStudio}</span>
            <ArrowUpRight size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
}

function BestSellerRow({ product, index }: { product: ProductSummary; index: number }) {
  const href = `/products/${product.slug}` as Route;

  return (
    <Link
      href={href}
      className="group grid grid-cols-[46px_1fr_auto] items-center gap-2 rounded border border-white/10 bg-white/[0.06] p-2 transition hover:-translate-y-0.5 hover:border-[#f7d17e]/[0.35] hover:bg-white/[0.1]"
    >
      <div className="h-12 overflow-hidden rounded bg-black/20">
        <DesignPreview product={product} variant="mini" />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-black text-white">{product.title}</p>
        <p className="text-xs text-white/[0.52]">
          {product.currency} {product.basePrice}
        </p>
      </div>
      <span className="flex h-7 w-7 items-center justify-center rounded bg-[#f7d17e]/14 text-xs font-black text-[#f7d17e]">
        {index + 1}
      </span>
    </Link>
  );
}

function MoodCollection({
  id,
  icon: Icon,
  title,
  text,
  prompt,
  locale,
}: {
  id?: string;
  icon: typeof Crown;
  title: string;
  text: string;
  prompt?: string;
  locale: AppLocale;
}) {
  const copy = homeCopy[locale];

  return (
    <div
      id={id}
      className="group scroll-mt-24 overflow-hidden rounded-lg border border-white/[0.12] bg-white/[0.06] p-3 shadow-[0_18px_64px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#f7d17e]/[0.35] hover:bg-white/[0.09]"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e] transition group-hover:scale-105">
        <Icon size={18} />
      </span>
      <h3 className="mt-3 text-base font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/[0.64]">{text}</p>
      {prompt ? <IntentLink href="#ai-finder" label={copy.findMatches} prompt={prompt} active /> : null}
    </div>
  );
}
