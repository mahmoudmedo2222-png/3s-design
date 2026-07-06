import {
  BadgeCheck,
  Compass,
  Crown,
  Eye,
  FileCheck2,
  Fingerprint,
  Gem,
  LockKeyhole,
  Palette,
  ShieldCheck,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandMirror } from '../../../components/brand-mirror';
import { CartButton } from '../../../components/cart-button';
import { CompareTray } from '../../../components/compare-tray';
import { ProductDetailActions } from '../../../components/product-detail-actions';
import { ProductCard } from '../../../components/product-card';
import { ThemeToggle } from '../../../components/theme-toggle';
import { fetchProductBySlug, fetchProducts, type ProductDetail } from '../../../lib/api';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

function listItems(values: string[] | undefined, fallback: string[]) {
  const cleaned = (values ?? []).filter(Boolean);
  return cleaned.length ? cleaned.slice(0, 5) : fallback;
}

function emotionalPromise(product: ProductDetail) {
  const moods = listItems(product.designDna?.moods, ['premium', 'clear', 'confident']);
  const styles = listItems(product.designDna?.styles, ['modern', 'polished']);
  const audiences = listItems(product.designDna?.audiences, ['customers']);

  return `Built to make ${audiences[0]} feel ${moods[0]} before they read a single word. The ${styles[0]} direction helps the brand look ready, trusted, and easier to choose.`;
}

function aiReason(product: ProductDetail) {
  const uses = listItems(product.designDna?.platforms, ['social media', 'campaigns']);
  const colors = listItems(product.designDna?.colors, ['balanced colors']);
  const moods = listItems(product.designDna?.moods, ['premium']);

  return `Recommended when the brief needs ${moods.join(', ')} energy, ${colors.join(', ')} tones, and practical use on ${uses.join(', ')}.`;
}

function passportCode(product: ProductDetail) {
  return `3S-${product.id.slice(0, 8).toUpperCase()}`;
}

function fitIndex(product: ProductDetail) {
  const dna = product.designDna;
  const signalCount = [
    ...(dna?.moods ?? []),
    ...(dna?.styles ?? []),
    ...(dna?.colors ?? []),
    ...(dna?.platforms ?? []),
    ...(dna?.industries ?? []),
  ].length;

  return Math.min(98, 74 + signalCount * 3 + product.variants.length * 2);
}

function formatList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, products] = await Promise.all([fetchProductBySlug(slug), fetchProducts()]);

  if (!product) {
    notFound();
  }

  const related = products.items.filter((item) => item.id !== product.id).slice(0, 4);
  const moods = listItems(product.designDna?.moods, ['Premium', 'Trust-building', 'Memorable']);
  const styles = listItems(product.designDna?.styles, ['Modern', 'Polished', 'Commercial']);
  const colors = listItems(product.designDna?.colors, ['Balanced', 'Brand-ready']);
  const industries = listItems(product.designDna?.industries, ['Premium brand']);
  const useCases = listItems(product.designDna?.platforms, ['Social media', 'Campaign launch', 'Brand presence']);
  const formats = formatList(product.variants.flatMap((variant) => variant.fileFormats)).slice(0, 6);
  const software = formatList(product.variants.flatMap((variant) => variant.softwareCompatibility)).slice(0, 6);

  return (
    <main className="min-h-screen bg-paper dark:bg-[#0b0f0e]">
      <header className="border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="brand-lockup min-w-0" aria-label="Back to 3S Design home">
            <span className="brand-mark" aria-hidden="true">
              <span className="brand-mark__stroke brand-mark__stroke--one" />
              <span className="brand-mark__stroke brand-mark__stroke--two" />
              <span className="brand-mark__spark" />
            </span>
            <span className="min-w-0">
              <span className="brand-kicker block">Curated Creative Marketplace</span>
              <span className="brand-title block">3S Design</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded border border-line bg-white px-3 py-2 text-sm font-bold text-ink transition hover:border-pine hover:text-pine"
            >
              Marketplace
            </Link>
            <ThemeToggle />
            <CartButton />
          </div>
        </div>
      </header>
      <CompareTray />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <section className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-line bg-[#eef2ee] shadow-sm dark:bg-[#17211d]">
              <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#dce4dc_1px,transparent_1px),linear-gradient(90deg,#dce4dc_1px,transparent_1px)] [background-size:26px_26px] dark:[background-image:linear-gradient(#27372f_1px,transparent_1px),linear-gradient(90deg,#27372f_1px,transparent_1px)]" />
              <div className="absolute inset-6 rounded-lg border border-white/50 bg-white/35 shadow-panel backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]" />
              <div className="relative flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded bg-pine text-white shadow-sm">
                  <Eye size={19} />
                </span>
                <p className="max-w-md text-base font-black text-ink">{product.previewAltText ?? product.title}</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  Protected watermarked preview. The final files unlock only after purchase.
                </p>
                <div className="absolute inset-x-8 top-1/2 -rotate-12 rounded border border-white/40 bg-white/25 py-2 text-center text-lg font-black uppercase tracking-[0.18em] text-pine/30 backdrop-blur-[1px] dark:text-[#7bd8bd]/25">
                  3S Design Preview
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Design with a feeling</p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-ink lg:text-4xl">{product.title}</h1>
              {product.subtitle ? <p className="mt-3 text-base leading-7 text-muted">{product.subtitle}</p> : null}
              <p className="mt-4 rounded-lg border border-line bg-white p-3 text-sm leading-6 text-ink shadow-sm dark:bg-[#121816]">
                {emotionalPromise(product)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...moods, ...styles].slice(0, 6).map((item) => (
                  <span key={item} className="rounded border border-pine/25 bg-pine/10 px-3 py-1 text-xs font-bold text-pine">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <section className="grid gap-3 md:grid-cols-3">
            <ValueCard
              icon={Sparkles}
              title="Why it sells"
              text="It helps the customer feel the offer is polished, intentional, and worth paying attention to."
            />
            <ValueCard icon={Wand2} title="AI match reason" text={aiReason(product)} />
            <ValueCard
              icon={ShieldCheck}
              title="Safe to buy"
              text="Preview is protected, files are checked, and support covers broken downloads within 24 hours."
            />
          </section>

          <DesignPassport
            product={product}
            moods={moods}
            styles={styles}
            colors={colors}
            industries={industries}
            useCases={useCases}
            formats={formats}
          />

          <BrandMirror product={product} />

          <LuxuryProof product={product} />

          <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:bg-[#121816]">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-saffron/15 text-saffron">
                <Palette size={18} />
              </span>
              <div>
                <h2 className="text-base font-black text-ink">Brand emotion map</h2>
                <p className="text-sm text-muted">Use this design when these signals match your business.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <SignalList title="Feeling" values={moods} />
              <SignalList title="Visual style" values={styles} />
              <SignalList title="Best use" values={useCases} />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:bg-[#121816]">
            <h2 className="text-base font-black text-ink">What you get</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoList title="Formats" values={formats.length ? formats : ['Editable source files', 'Ready-to-export previews']} />
              <InfoList title="Software" values={software.length ? software : ['Design editor compatible', 'Export-ready workflow']} />
            </div>
          </section>

          {related.length ? (
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-black text-ink">More designs with the same energy</h2>
                <p className="text-sm text-muted">Keep browsing by feeling, not just category.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {related.map((item) => (
                  <ProductCard key={item.id} product={item} compact />
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-3 lg:sticky lg:top-5 lg:self-start">
          <ProductDetailActions product={product} />

          <section className="rounded-lg border border-line bg-white p-3 shadow-sm dark:bg-[#121816]">
            <h2 className="text-sm font-black text-ink">License clarity</h2>
            <div className="mt-3 grid gap-3">
              <LicenseCard
                icon={BadgeCheck}
                title="Standard commercial"
                text="Use it commercially, edit it for your brand, and publish it. This license is non-exclusive."
              />
              <LicenseCard
                icon={Crown}
                title="Private tailoring"
                text="Request a custom version for your brand while the base design remains reusable for multiple customers."
              />
              <LicenseCard
                icon={LockKeyhole}
                title="Protected files"
                text="Final files are available only after payment and account checks."
              />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-ink p-3 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <FileCheck2 className="text-saffron" size={20} />
              <h2 className="text-sm font-black">Confidence before checkout</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/72">
              If the purchased file does not work, support reviews it within 24 hours. Download limits and fraud checks protect the design
              value for real customers.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function DesignPassport({
  product,
  moods,
  styles,
  colors,
  industries,
  useCases,
  formats,
}: {
  product: ProductDetail;
  moods: string[];
  styles: string[];
  colors: string[];
  industries: string[];
  useCases: string[];
  formats: string[];
}) {
  const license = product.defaultLicense?.name ?? product.licenseOptions?.[0]?.name ?? 'Commercial license';
  const score = fitIndex(product);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-ink p-4 text-white shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f7d17e]/15 text-[#f7d17e]">
              <Fingerprint size={17} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f7d17e]">Design passport</p>
              <h2 className="mt-1 text-xl font-black">{passportCode(product)}</h2>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/68">
            A private buying readout for this design: where it fits, what it makes customers feel, and why it belongs in a premium brand
            moment.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <PassportDatum icon={Gem} label="Fit index" value={`${score}/100`} />
          <PassportDatum icon={Compass} label="Best for" value={industries.slice(0, 2).join(', ')} />
          <PassportDatum icon={ShieldCheck} label="License" value={license} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-white/[0.1] pt-4 md:grid-cols-3">
        <SignalColumn title="Emotional signal" values={moods} />
        <SignalColumn title="Visual signature" values={[...styles, ...colors].slice(0, 5)} />
        <SignalColumn title="Client use" values={[...useCases, ...formats].slice(0, 5)} />
      </div>
    </section>
  );
}

function PassportDatum({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="border-t border-white/[0.12] pt-3">
      <Icon className="text-[#f7d17e]" size={18} />
      <p className="mt-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/42">{label}</p>
      <p className="mt-1 text-sm font-black leading-5 text-white">{value}</p>
    </div>
  );
}

function SignalColumn({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded border border-white/[0.12] bg-white/[0.07] px-2.5 py-1 text-xs font-bold text-white/78">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function LuxuryProof({ product }: { product: ProductDetail }) {
  const license = product.defaultLicense ?? product.licenseOptions?.[0];
  const proofItems = [
    {
      title: 'Reusable commerce model',
      text: 'This base design can be licensed by multiple customers, keeping the price accessible without hiding the license terms.',
    },
    {
      title: 'Protected preview',
      text: 'The public preview is watermarked, while final files stay behind account, payment, and download checks.',
    },
    {
      title: 'Commercial clarity',
      text: license?.allowsCommercialUse
        ? `${license.name} allows commercial use and brand modification.`
        : 'License details are shown before checkout so the customer knows exactly what is included.',
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:bg-[#121816]">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-pine/10 text-pine">
          <BadgeCheck size={16} />
        </span>
        <div>
          <h2 className="text-base font-black text-ink">Luxury proof</h2>
          <p className="text-sm text-muted">Premium does not mean vague. It means clear, protected, and easy to trust.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {proofItems.map((item) => (
          <div key={item.title} className="rounded border border-line bg-paper p-3 dark:bg-[#0f1513]">
            <p className="text-sm font-black text-ink">{item.title}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValueCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm dark:bg-[#121816]">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-pine/10 text-pine">
        <Icon size={16} />
      </span>
      <h2 className="mt-2 text-sm font-black text-ink">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}

function SignalList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded border border-line bg-paper p-3 dark:bg-[#0f1513]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded bg-white px-2 py-1 text-xs font-bold text-ink dark:bg-[#121816]">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded border border-line bg-paper p-3 dark:bg-[#0f1513]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <ul className="mt-3 grid gap-2 text-sm text-ink">
        {values.map((value) => (
          <li key={value} className="flex items-center gap-2">
            <BadgeCheck className="shrink-0 text-pine" size={15} />
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LicenseCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded border border-line bg-paper p-3 dark:bg-[#0f1513]">
      <div className="flex items-center gap-2">
        <Icon className="text-saffron" size={17} />
        <p className="text-sm font-black text-ink">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}
