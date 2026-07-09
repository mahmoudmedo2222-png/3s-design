import type { CSSProperties } from 'react';
import type { ProductSummary } from '../lib/api';

type PreviewKind = 'wedding' | 'food' | 'sale' | 'cafe' | 'property' | 'premium';

const themes: Record<
  PreviewKind,
  {
    bg: string;
    glow: string;
    ink: string;
    paper: string;
    accent: string;
    soft: string;
    kicker: string;
    headline: string;
    supporting: string;
  }
> = {
  wedding: {
    bg: '#17121a',
    glow: '#f6b9cf',
    ink: '#2b1420',
    paper: '#fff4f8',
    accent: '#c45180',
    soft: '#f6d8e4',
    kicker: 'Invitation Suite',
    headline: 'Elegant Ceremony',
    supporting: 'Soft romance, premium print feel',
  },
  food: {
    bg: '#20130d',
    glow: '#ffb45c',
    ink: '#2a140b',
    paper: '#fff0d8',
    accent: '#d9552b',
    soft: '#f7c27c',
    kicker: 'Menu Campaign',
    headline: 'Taste First',
    supporting: 'Appetite, offer, social proof',
  },
  sale: {
    bg: '#090807',
    glow: '#c8a45d',
    ink: '#17130f',
    paper: '#f2eadc',
    accent: '#c8a45d',
    soft: '#f7d17e',
    kicker: 'Private Capsule',
    headline: 'Selected Edit',
    supporting: 'Urgency without cheapness',
  },
  cafe: {
    bg: '#10201c',
    glow: '#7bd8bd',
    ink: '#10201c',
    paper: '#f1efe4',
    accent: '#c68a2d',
    soft: '#b8d8ca',
    kicker: 'Story Bundle',
    headline: 'Cafe Mood',
    supporting: 'Calm, warm, ready to post',
  },
  property: {
    bg: '#0e2030',
    glow: '#96d3ff',
    ink: '#102033',
    paper: '#f4f8fb',
    accent: '#2b74a8',
    soft: '#c7e5f6',
    kicker: 'Property Kit',
    headline: 'Clean Listing',
    supporting: 'Trust, space, calm premium',
  },
  premium: {
    bg: '#0b2420',
    glow: '#f7d17e',
    ink: '#101513',
    paper: '#fff8e8',
    accent: '#22594b',
    soft: '#e8d8bd',
    kicker: 'Brand System',
    headline: 'Premium Launch',
    supporting: 'Polished, confident, memorable',
  },
};

function previewKind(product: ProductSummary): PreviewKind {
  const haystack = `${product.slug} ${product.title} ${product.subtitle ?? ''}`.toLowerCase();

  if (haystack.includes('wedding') || haystack.includes('invitation')) return 'wedding';
  if (haystack.includes('burger') || haystack.includes('restaurant') || haystack.includes('food')) return 'food';
  if (haystack.includes('black') || haystack.includes('sale') || haystack.includes('offer')) return 'sale';
  if (haystack.includes('cafe') || haystack.includes('coffee')) return 'cafe';
  if (haystack.includes('estate') || haystack.includes('property')) return 'property';

  return 'premium';
}

function shortTitle(product: ProductSummary) {
  return product.title.replace(/\b(Set|Bundle|Kit|Banners|Offer)\b/gi, '').trim();
}

export function DesignPreview({ product, variant = 'card' }: { product: ProductSummary; variant?: 'card' | 'hero' | 'mini' }) {
  const kind = previewKind(product);
  const theme = themes[kind];
  const style = {
    '--mock-bg': theme.bg,
    '--mock-glow': theme.glow,
    '--mock-ink': theme.ink,
    '--mock-paper': theme.paper,
    '--mock-accent': theme.accent,
    '--mock-soft': theme.soft,
  } as CSSProperties;

  return (
    <div className={`design-preview design-preview--${variant} design-preview--${kind}`} style={style} aria-hidden="true">
      <div className="design-preview__light" />
      <div className="design-preview__rail" />

      <div className="mockup mockup--banner">
        <span>{theme.kicker}</span>
        <strong>{theme.headline}</strong>
      </div>

      <div className="mockup mockup--story">
        <div className="mockup__topline" />
        <div className="mockup__visual">
          <span className="mockup__symbol" />
        </div>
        <div className="mockup__copy">
          <span>{theme.kicker}</span>
          <strong>{shortTitle(product)}</strong>
          <em>{theme.supporting}</em>
        </div>
      </div>

      <div className="mockup mockup--post">
        <div className="mockup__badge">3S</div>
        <div className="mockup__motif" />
        <strong>{theme.headline}</strong>
        <span>
          {product.currency} {product.basePrice}
        </span>
      </div>

      <div className="design-preview__seal">3S</div>
    </div>
  );
}
