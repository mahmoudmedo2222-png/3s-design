import {
  BadgeCheck,
  Compass,
  Crown,
  Download,
  Eye,
  FileArchive,
  FileCheck2,
  Fingerprint,
  Gem,
  HelpCircle,
  LockKeyhole,
  PackageCheck,
  Palette,
  ReceiptText,
  Ruler,
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
import {
  BuyerDecisionCard,
  ConfidenceBadge,
  CustomerJourneyRail,
  CustomerTrustStrip,
  SectionHeading,
} from '../../../components/customer-experience';
import { DesignPreview } from '../../../components/design-preview';
import { ProductDetailActions } from '../../../components/product-detail-actions';
import { ProductViewTracker } from '../../../components/product-view-tracker';
import { ProductCard } from '../../../components/product-card';
import { ThemeToggle } from '../../../components/theme-toggle';
import { fetchProductBySlug, fetchProducts, type ProductDetail } from '../../../lib/api';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ brief?: string; signals?: string }>;
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

function parseSearchFit(searchParams?: { brief?: string; signals?: string }) {
  const brief = searchParams?.brief?.trim();
  const signals = (searchParams?.signals ?? '')
    .split('|')
    .map((signal) => signal.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    brief: brief && brief.length <= 280 ? brief : '',
    signals,
  };
}

function attributeValues(product: ProductDetail, key: string) {
  return product.attributes
    .filter((attribute) => attribute.key === key)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((attribute) => attribute.value.trim())
    .filter(Boolean);
}

function attributeValue(product: ProductDetail, key: string) {
  return attributeValues(product, key)[0];
}

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const searchFit = parseSearchFit(await searchParams);
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

  const deliveryAssets = product.assets.filter((asset) => !asset.isPublicPreview);
  const primaryLicense = product.defaultLicense ?? product.licenseOptions?.[0] ?? null;

  return (
    <main className="product-detail-page min-h-screen bg-paper">
      <ProductViewTracker product={product} />
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
          <CustomerJourneyRail current="inspect" />

          <div className="product-detail-hero grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="product-detail-preview">
              <DesignPreview product={product} variant="hero" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(6,11,10,0.72))]" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <ConfidenceBadge>Protected preview</ConfidenceBadge>
                <ConfidenceBadge>{passportCode(product)}</ConfidenceBadge>
              </div>
              <div className="absolute inset-x-4 bottom-4 rounded-lg border border-white/[0.14] bg-black/[0.38] p-4 text-white shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gold/15 text-gold">
                    <Eye size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black">{product.previewAltText ?? product.title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/66">
                      Preview the commercial mood before checkout. Final editable files unlock only after payment approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="product-detail-copy flex flex-col justify-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Design with a feeling</p>
              <h1 className="product-detail-title mt-2">{product.title}</h1>
              {product.subtitle ? <p className="mt-3 text-base leading-7 text-muted">{product.subtitle}</p> : null}
              <p className="product-detail-promise mt-4 text-sm font-bold leading-6">{emotionalPromise(product)}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...moods, ...styles].slice(0, 6).map((item, index) => (
                  <span key={`${item}-${index}`} className="rounded border border-pine/25 bg-pine/10 px-3 py-1 text-xs font-bold text-pine">
                    {item}
                  </span>
                ))}
              </div>

              <PurchaseSnapshot product={product} formats={formats} software={software} />
              <ProductDecisionReadout
                license={primaryLicense?.name ?? 'License selected before checkout'}
                delivery={
                  deliveryAssets.length
                    ? `${deliveryAssets.length} vault file${deliveryAssets.length === 1 ? '' : 's'}`
                    : formats.length
                      ? formats.slice(0, 2).join(', ')
                      : 'Vault delivery after payment review'
                }
                bestFor={[...industries, ...useCases].slice(0, 2).join(' / ')}
              />
            </div>
          </div>

          <CustomerTrustStrip />

          <StoryLedProductSection product={product} />

          <CustomerDecisionStack product={product} formats={formats} software={software} />

          <section className="grid gap-3 md:grid-cols-3">
            <BuyerDecisionCard
              icon={Sparkles}
              title="Why it sells"
              text="It helps the customer feel the offer is polished, intentional, and worth paying attention to."
            />
            <BuyerDecisionCard icon={Wand2} title="AI match reason" text={aiReason(product)} />
            <BuyerDecisionCard
              icon={ShieldCheck}
              title="Safe to buy"
              text="Preview is protected, files are checked, and support covers broken downloads within 24 hours."
            />
          </section>

          {searchFit.brief ? <SearchBriefFit product={product} brief={searchFit.brief} signals={searchFit.signals} /> : null}

          <DesignPassport
            product={product}
            moods={moods}
            styles={styles}
            colors={colors}
            industries={industries}
            useCases={useCases}
            formats={formats}
          />

          <BuyerFitChecklist product={product} industries={industries} useCases={useCases} />

          <BrandMirror product={product} />

          <LuxuryProof product={product} />

          <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-saffron/15 text-saffron">
                <Palette size={18} />
              </span>
              <SectionHeading
                kicker="Brand emotion map"
                title="Buy it when these signals match the customer moment."
                text="A clear emotional map helps the client choose by outcome, not only by visual taste."
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <SignalList title="Feeling" values={moods} />
              <SignalList title="Visual style" values={styles} />
              <SignalList title="Best use" values={useCases} />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <h2 className="text-base font-black text-ink">What you get</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoList title="Formats" values={formats.length ? formats : ['Editable source files', 'Ready-to-export previews']} />
              <InfoList title="Software" values={software.length ? software : ['Design editor compatible', 'Export-ready workflow']} />
            </div>
            <DeliveryAssetList product={product} />
          </section>

          <ProductDataReadiness product={product} formats={formats} software={software} />

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
          <ProductDetailActions product={product} fitContext={searchFit.brief ? searchFit : null} />

          <section className="rounded-lg border border-line bg-surface p-3 shadow-sm">
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

function ProductDecisionReadout({ license, delivery, bestFor }: { license: string; delivery: string; bestFor: string }) {
  return (
    <div className="decision-readout mt-4">
      <DecisionReadoutItem label="Best-fit moment" value={bestFor || 'Brand-ready launch'} />
      <DecisionReadoutItem label="License confidence" value={license} />
      <DecisionReadoutItem label="Delivery expectation" value={delivery} />
    </div>
  );
}

function DecisionReadoutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="decision-readout__item">
      <p className="decision-readout__label">{label}</p>
      <p className="decision-readout__value">{value}</p>
    </div>
  );
}

function StoryLedProductSection({ product }: { product: ProductDetail }) {
  const customerMoment = attributeValue(product, 'story.customer_moment');
  const beforeState = attributeValue(product, 'story.before_state');
  const afterState = attributeValue(product, 'story.after_state');
  const promise = attributeValue(product, 'story.buyer_promise');
  const scenes = attributeValues(product, 'story.scene');
  const proof = attributeValues(product, 'story.visual_proof');

  if (!customerMoment && !beforeState && !afterState && !promise && !scenes.length && !proof.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <SectionHeading
            kicker="Story-led package"
            title="This design sells a customer moment, not only a style."
            text={promise ?? product.description}
          />
          <div className="mt-4 grid gap-3">
            {customerMoment ? <StoryProofCard title="Customer moment" text={customerMoment} /> : null}
            {beforeState || afterState ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {beforeState ? <StoryProofCard title="Before" text={beforeState} /> : null}
                {afterState ? <StoryProofCard title="After" text={afterState} /> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3">
          {scenes.length ? (
            <div className="rounded border border-line bg-paper p-3">
              <div className="flex items-center gap-2">
                <Compass className="text-pine" size={17} />
                <p className="text-sm font-black text-ink">Campaign journey</p>
              </div>
              <ol className="mt-3 grid gap-2">
                {scenes.slice(0, 6).map((scene, index) => (
                  <li key={`${scene}-${index}`} className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 text-sm leading-6">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-pine/10 text-xs font-black text-pine">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-bold text-ink">{scene}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {proof.length ? (
            <div className="rounded border border-saffron/30 bg-saffron/10 p-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="text-saffron" size={17} />
                <p className="text-sm font-black text-ink">Visual proof needed</p>
              </div>
              <ul className="mt-3 grid gap-2">
                {proof.slice(0, 5).map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2 text-xs font-bold leading-5 text-muted">
                    <BadgeCheck className="mt-0.5 shrink-0 text-pine" size={14} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StoryProofCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{title}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-ink">{text}</p>
    </div>
  );
}

function PurchaseSnapshot({ product, formats, software }: { product: ProductDetail; formats: string[]; software: string[] }) {
  const license = product.defaultLicense ?? product.licenseOptions?.[0];
  const price = license?.price ?? product.basePrice;
  const currency = license?.currency ?? product.currency;
  const deliverables = formats.length ? formats.slice(0, 2).join(', ') : software.length ? software.slice(0, 2).join(', ') : 'Ready files';

  return (
    <div className="mt-5 grid gap-3 rounded-lg border border-line bg-surface p-3 shadow-sm md:grid-cols-3">
      <SnapshotDatum label="Price" value={`${currency} ${price}`} />
      <SnapshotDatum label="License" value={license?.name ?? 'Commercial license'} />
      <SnapshotDatum label="Files" value={deliverables} />
    </div>
  );
}

function SearchBriefFit({ product, brief, signals }: { product: ProductDetail; brief: string; signals: string[] }) {
  const dnaSignals = [
    ...(product.designDna?.industries ?? []),
    ...(product.designDna?.moods ?? []),
    ...(product.designDna?.styles ?? []),
    ...(product.designDna?.colors ?? []),
    ...(product.designDna?.platforms ?? []),
  ].slice(0, 8);
  const visibleSignals = signals.length ? signals : dnaSignals;
  const license = product.defaultLicense ?? product.licenseOptions?.[0];
  const nextDecision = license?.allowsCommercialUse
    ? `If these signals match the customer moment, ${license.name} is the cleanest next step before checkout.`
    : 'Confirm the license terms before checkout because this fit may need a stronger commercial option.';

  return (
    <section className="overflow-hidden rounded-lg border border-saffron/35 bg-cream p-4 shadow-sm dark:bg-saffron/10">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-saffron">Personal decision layer</p>
          <h2 className="mt-2 text-xl font-black text-ink">Why this product is worth inspecting before cart.</h2>
          <p className="mt-3 rounded border border-saffron/30 bg-white/60 p-3 text-sm font-bold leading-6 text-ink dark:bg-black/20">
            &quot;{brief}&quot;
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-muted">{nextDecision}</p>
        </div>
        <div className="grid gap-3">
          <div className="rounded border border-saffron/30 bg-white/55 p-3 dark:bg-black/20">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Matched buying signals</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleSignals.length ? (
                visibleSignals.map((signal, index) => (
                  <span
                    key={`${signal}-${index}`}
                    className="rounded border border-saffron/30 bg-saffron/15 px-2.5 py-1 text-xs font-black text-ink"
                  >
                    {signal}
                  </span>
                ))
              ) : (
                <span className="text-sm font-bold text-muted">Open the AI search first to attach buyer intent to this product.</span>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <FitStep title="Intent" text="The buyer arrived with a specific outcome, not a generic browse." />
            <FitStep title="Evidence" text="Matched signals stay visible while reviewing price, files, and license." />
            <FitStep title="Action" text={nextDecision} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FitStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-saffron/25 bg-white/45 p-3 dark:bg-black/20">
      <BadgeCheck className="text-saffron" size={16} />
      <p className="mt-2 text-sm font-black text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}

function CustomerDecisionStack({ product, formats, software }: { product: ProductDetail; formats: string[]; software: string[] }) {
  const license = product.defaultLicense ?? product.licenseOptions?.[0];
  const publicAssets = product.assets.filter((asset) => asset.isPublicPreview);
  const deliveryAssets = product.assets.filter((asset) => !asset.isPublicPreview);
  const bestUses = listItems(product.designDna?.platforms, ['campaign launch', 'social media', 'brand presentation']);
  const bestIndustries = listItems(product.designDna?.industries, ['premium brand']);
  const decisionCards = [
    {
      icon: PackageCheck,
      title: 'Will this fit my project?',
      answer: `Best for ${bestIndustries.slice(0, 2).join(', ')} projects that need ${bestUses.slice(0, 2).join(', ')} assets.`,
    },
    {
      icon: FileArchive,
      title: 'What arrives after payment?',
      answer:
        deliveryAssets.length > 0
          ? `${deliveryAssets.length} protected delivery file${deliveryAssets.length === 1 ? '' : 's'} unlock in the account vault.`
          : formats.length > 0
            ? `Delivery includes ${formats.slice(0, 3).join(', ')} files.`
            : 'The account vault unlocks the final delivery package after payment review.',
    },
    {
      icon: ReceiptText,
      title: 'What can I do with it?',
      answer: license?.allowsCommercialUse
        ? `${license.name} covers commercial publishing and keeps the purchase attached to your account.`
        : 'Review the selected license before checkout because commercial use may need confirmation.',
    },
    {
      icon: Download,
      title: 'What happens next?',
      answer: 'Add the license to cart, create checkout, complete payment review, then download from the delivery vault.',
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          kicker="Decision stack"
          title="Everything a buyer needs before adding this design."
          text="This section reduces hesitation by answering fit, files, license, and delivery questions in one scan."
        />
        <span className="rounded bg-pine/10 px-3 py-1 text-sm font-black text-pine">
          {publicAssets.length + deliveryAssets.length || product.variants.length} proof points
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {decisionCards.map((card) => (
          <div key={card.title} className="rounded border border-line bg-paper p-3">
            <card.icon className="text-pine dark:text-gold" size={18} />
            <p className="mt-3 text-sm font-black text-ink">{card.title}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{card.answer}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <DecisionMiniPanel
          icon={Ruler}
          title="Format confidence"
          items={formats.length ? formats.slice(0, 4) : software.length ? software.slice(0, 4) : ['Export-ready package']}
        />
        <DecisionMiniPanel
          icon={ShieldCheck}
          title="Risk reducers"
          items={['Protected preview', 'Account-owned license', 'Payment review before delivery', 'Support for broken downloads']}
        />
        <DecisionMiniPanel
          icon={HelpCircle}
          title="Ask before checkout if"
          items={['You need exclusivity', 'You need custom copywriting', 'You need a private brand version', 'Your use case is resale']}
        />
      </div>
    </section>
  );
}

function DecisionMiniPanel({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <div className="rounded border border-line bg-paper p-3">
      <div className="flex items-center gap-2">
        <Icon className="text-saffron" size={17} />
        <p className="text-sm font-black text-ink">{title}</p>
      </div>
      <ul className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-center gap-2 text-xs font-bold leading-5 text-muted">
            <BadgeCheck className="shrink-0 text-pine" size={14} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeliveryAssetList({ product }: { product: ProductDetail }) {
  const deliveryAssets = product.assets.filter((asset) => !asset.isPublicPreview).sort((left, right) => left.sortOrder - right.sortOrder);

  if (!deliveryAssets.length) {
    return (
      <div className="mt-3 rounded border border-saffron/35 bg-cream p-3 text-xs font-bold leading-5 text-cream-ink dark:bg-saffron/10 dark:text-gold-strong">
        Delivery package metadata is not public yet. Checkout will stay protected, but this product needs stronger asset details before a
        premium launch.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded border border-line bg-paper p-3">
      <div className="flex items-center gap-2">
        <FileArchive className="text-pine" size={17} />
        <p className="text-sm font-black text-ink">Delivery package</p>
      </div>
      <div className="mt-3 grid gap-2">
        {deliveryAssets.slice(0, 5).map((asset) => (
          <div
            key={asset.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-surface p-2"
          >
            <span className="min-w-0 truncate text-xs font-black text-ink">{asset.fileName}</span>
            <span className="shrink-0 rounded bg-pine/10 px-2 py-1 text-[0.68rem] font-black text-pine">{asset.mimeType}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SnapshotDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l-2 border-pine/30 pl-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function ProductDataReadiness({ product, formats, software }: { product: ProductDetail; formats: string[]; software: string[] }) {
  const checks = [
    {
      label: 'Preview',
      ready: Boolean(product.previewAltText || product.previewStorageKey || product.assets.some((asset) => asset.isPublicPreview)),
    },
    { label: 'License', ready: Boolean(product.defaultLicense ?? product.licenseOptions?.length) },
    { label: 'Deliverables', ready: Boolean(formats.length || software.length || product.variants.length) },
    { label: 'Design DNA', ready: Boolean(product.designDna && Object.values(product.designDna).some((values) => values.length)) },
  ];
  const readyCount = checks.filter((check) => check.ready).length;

  return (
    <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Data readiness</p>
          <h2 className="mt-2 text-base font-black text-ink">Product data that affects buyer confidence.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            A premium page needs more than layout. It needs preview, license, deliverables, and design signals filled in.
          </p>
        </div>
        <span className="rounded bg-pine/10 px-3 py-1 text-sm font-black text-pine">
          {readyCount}/{checks.length} ready
        </span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {checks.map((check) => (
          <div key={check.label} className="rounded border border-line bg-paper p-3">
            <BadgeCheck className={check.ready ? 'text-pine' : 'text-muted'} size={16} />
            <p className="mt-2 text-sm font-black text-ink">{check.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{check.ready ? 'Ready for display' : 'Needs stronger data'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BuyerFitChecklist({ product, industries, useCases }: { product: ProductDetail; industries: string[]; useCases: string[] }) {
  const license = product.defaultLicense ?? product.licenseOptions?.[0];
  const checks = [
    {
      title: 'Use case fit',
      text: `Best when the client needs ${useCases.slice(0, 3).join(', ')} without building a custom direction from zero.`,
    },
    {
      title: 'Brand fit',
      text: `Strongest for ${industries.slice(0, 2).join(', ')} projects that need a polished first impression.`,
    },
    {
      title: 'License fit',
      text: license?.allowsCommercialUse
        ? `${license.name} supports commercial publishing and brand edits.`
        : 'Check the selected license before checkout because commercial use may depend on the option.',
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <SectionHeading
        kicker="Before you buy"
        title="A quick fit check for the customer decision."
        text="This keeps the product page honest: the client should know why this design fits before adding it to the cart."
      />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {checks.map((check) => (
          <div key={check.title} className="rounded border border-line bg-paper p-3">
            <BadgeCheck className="text-pine" size={17} />
            <p className="mt-3 text-sm font-black text-ink">{check.title}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{check.text}</p>
          </div>
        ))}
      </div>
    </section>
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
            <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-gold/15 text-gold">
              <Fingerprint size={17} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Design passport</p>
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
      <Icon className="text-gold" size={18} />
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
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="rounded border border-white/[0.12] bg-white/[0.07] px-2.5 py-1 text-xs font-bold text-white/78"
          >
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
    <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
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
          <div key={item.title} className="rounded border border-line bg-paper p-3">
            <p className="text-sm font-black text-ink">{item.title}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignalList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value, index) => (
          <span key={`${value}-${index}`} className="rounded bg-surface px-2 py-1 text-xs font-bold text-ink">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <ul className="mt-3 grid gap-2 text-sm text-ink">
        {values.map((value, index) => (
          <li key={`${value}-${index}`} className="flex items-center gap-2">
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
    <div className="rounded border border-line bg-paper p-3">
      <div className="flex items-center gap-2">
        <Icon className="text-saffron" size={17} />
        <p className="text-sm font-black text-ink">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}
