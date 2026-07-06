'use client';

import { Gem, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ProductDetail } from '../lib/api';
import { DesignPreview } from './design-preview';

const colorOptions = [
  { label: 'Gold', value: '#f7d17e' },
  { label: 'Pine', value: '#22594b' },
  { label: 'Berry', value: '#9f315f' },
  { label: 'Ivory', value: '#fff8e8' },
];
const defaultAccentColor = '#f7d17e';

const feelingOptions = ['premium', 'trusted', 'urgent', 'calm'] as const;

export function BrandMirror({ product }: { product: ProductDetail }) {
  const [brandName, setBrandName] = useState('Your Brand');
  const [color, setColor] = useState(defaultAccentColor);
  const [feeling, setFeeling] = useState<(typeof feelingOptions)[number]>('premium');
  const line = useMemo(() => mirrorLine(feeling, product.title), [feeling, product.title]);

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm dark:bg-[#121816]">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-saffron/15 text-saffron">
          <Gem size={16} />
        </span>
        <div>
          <h2 className="text-base font-black text-ink">Brand mirror</h2>
          <p className="text-sm text-muted">See the direction wearing your brand signal.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <label className="grid gap-2 text-sm font-bold text-ink">
            Brand name
            <input
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              className="h-11 rounded border border-line bg-paper px-3 text-sm text-ink outline-none transition focus:border-pine focus:bg-white"
              placeholder="Your Brand"
            />
          </label>

          <div>
            <p className="text-sm font-bold text-ink">Accent</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={`h-9 w-9 rounded border transition hover:-translate-y-0.5 ${
                    color === option.value ? 'border-ink ring-2 ring-saffron/40' : 'border-line'
                  }`}
                  style={{ backgroundColor: option.value }}
                  aria-label={option.label}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-ink">Feeling</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {feelingOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFeeling(option)}
                  className={`h-9 rounded border px-3 text-xs font-black capitalize transition ${
                    feeling === option ? 'border-pine bg-pine text-white' : 'border-line bg-paper text-ink hover:border-pine'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-line bg-ink">
          <DesignPreview product={product} variant="card" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.68))]" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] backdrop-blur">
              <Wand2 size={13} style={{ color }} />
              Mirror preview
            </div>
            <h3 className="text-2xl font-black leading-tight" style={{ color }}>
              {brandName.trim() || 'Your Brand'}
            </h3>
            <p className="mt-2 max-w-md text-sm font-bold leading-6 text-white/78">{line}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function mirrorLine(feeling: string, title: string) {
  if (feeling === 'trusted') {
    return `${title} becomes a calm, credible first impression for customers who need confidence before they buy.`;
  }

  if (feeling === 'urgent') {
    return `${title} becomes a sharp campaign moment built for fast attention without making the brand feel cheap.`;
  }

  if (feeling === 'calm') {
    return `${title} becomes a softer visual direction with space, clarity, and a composed customer promise.`;
  }

  return `${title} becomes a premium brand moment that feels selected, polished, and ready to charge more.`;
}
