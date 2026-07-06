'use client';

import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const introStorageKey = '3s-design-intro-seen';
const introDurationMs = 1600;
const introUnmountDelayMs = 2200;

const slides = [
  {
    src: '/intro/cinematic-01.png',
    alt: 'Premium design gallery',
  },
  {
    src: '/intro/cinematic-02.png',
    alt: 'Floating creative campaign designs',
  },
  {
    src: '/intro/cinematic-03.png',
    alt: 'Luxury creative showroom',
  },
  {
    src: '/intro/cinematic-04.png',
    alt: 'Premium design reveal',
  },
];

export function SiteIntro() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const introMode = new URLSearchParams(window.location.search).get('intro');
    const forcePreview = introMode === '1';
    if (introMode === '0') {
      setVisible(false);
      setMounted(false);
      return;
    }

    const alreadySeen = (() => {
      try {
        return window.sessionStorage.getItem(introStorageKey) === 'true';
      } catch {
        return false;
      }
    })();

    if (!forcePreview && alreadySeen) {
      setVisible(false);
      setMounted(false);
      return;
    }

    setMounted(true);
    setVisible(true);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      if (!forcePreview) {
        try {
          window.sessionStorage.setItem(introStorageKey, 'true');
        } catch {
          // Ignore storage restrictions; the visual intro should never block the site.
        }
      }
    }, introDurationMs);
    const unmountTimer = window.setTimeout(() => setMounted(false), introUnmountDelayMs);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(unmountTimer);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`intro-shell fixed inset-0 z-[80] overflow-hidden bg-[#070b0a] text-white transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div key={slide.src} className="intro-cinematic-slide" style={{ animationDelay: `${index * 1.08}s` }}>
            <Image src={slide.src} alt={slide.alt} fill priority={index === 0} sizes="100vw" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="intro-cinematic-vignette" />
      <div className="intro-cinematic-sheen" />
      <div className="intro-cinematic-grain" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5">
        <div className="intro-cinematic-lockup text-center">
          <div className="intro-cinematic-mark mx-auto mb-5">
            <span className="intro-cinematic-stroke intro-cinematic-stroke-one" />
            <span className="intro-cinematic-stroke intro-cinematic-stroke-two" />
            <span className="intro-cinematic-spark" />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded border border-white/15 bg-black/25 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-[#f7d17e] shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <Sparkles size={14} />
            Curated Creative Marketplace
          </div>

          <h2 className="intro-cinematic-title text-4xl font-black tracking-[0.08em] sm:text-5xl">3S DESIGN</h2>
          <p className="intro-cinematic-copy mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-white/78 sm:text-base">
            Enter a marketplace where every design is chosen to make the brand feel impossible to ignore.
          </p>

          <div className="mx-auto mt-6 max-w-md">
            <div className="mb-2 flex items-center justify-between text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/55">
              <span>Opening the vault</span>
              <span>2s</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-white/10">
              <div className="intro-cinematic-progress h-full rounded bg-[#f7d17e]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
