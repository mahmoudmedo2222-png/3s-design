'use client';

import { Check, Moon, Save, Sparkles, Sun, Wand2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { StudioMood, StudioOutput, StudioPalette } from './cafe-campaign-stage';
import type { AppLocale } from '../lib/locale';
import { readStudioDirection, saveStudioDirection } from '../lib/taste-memory';
import type { StudioDirection } from '../lib/taste-memory';

type Brightness = 'light' | 'dark' | 'balanced';
type ColorFamily = 'gold' | 'green' | 'berry' | 'sand';
type ShadeDepth = 'soft' | 'base' | 'deep';

type DirectionOption = {
  id: StudioPalette;
  title: string;
  text: string;
  mood: StudioMood;
  output: StudioOutput;
  colors: string[];
};

const copy = {
  en: {
    kicker: 'Visual direction studio',
    title: 'Define a refined visual direction for the client.',
    text: 'A guided studio experience for selecting tone, color family, and campaign direction with clarity and confidence.',
    brand: 'Brand name',
    brandPlaceholder: 'North Cafe',
    steps: ['Brightness', 'Feeling', 'Color family', 'Final direction'],
    brightnessTitle: 'Select the overall light direction.',
    brightnessText: 'Start with the visual atmosphere before refining the palette.',
    moodTitle: 'Select the primary brand impression.',
    moodText: 'This connects the color direction to the customer experience.',
    familyTitle: 'Select the closest color family.',
    familyText: 'A focused set of premium palette families keeps the decision clear.',
    resultTitle: 'Select the final direction.',
    resultText: 'Review three curated directions and choose the strongest fit.',
    save: 'Save direction',
    saved: 'Direction saved',
    brief: 'Direction brief',
    continue: 'This direction will guide future recommendations and campaign previews.',
    brightness: {
      light: { title: 'Light refined', text: 'Clean, open, and quietly sophisticated.' },
      dark: { title: 'Dark premium', text: 'Cinematic, confident, and elevated.' },
      balanced: { title: 'Balanced contrast', text: 'Polished contrast with a comfortable visual rhythm.' },
    },
    moods: {
      luxury: 'Luxury',
      bold: 'Bold',
      warm: 'Warm',
      minimal: 'Minimal',
    },
    families: {
      gold: 'Gold',
      green: 'Green',
      berry: 'Berry',
      sand: 'Sand',
    },
  },
  ar: {
    kicker: 'استوديو الاتجاه البصري',
    title: 'تحديد اتجاه بصري راق للعميل.',
    text: 'تجربة إرشادية لاختيار الإحساس، وعائلة الألوان، واتجاه الحملة بوضوح وثقة.',
    brand: 'اسم البراند',
    brandPlaceholder: 'North Cafe',
    steps: ['الإضاءة', 'الإحساس', 'عائلة اللون', 'الاتجاه النهائي'],
    brightnessTitle: 'حدد اتجاه الإضاءة العام.',
    brightnessText: 'نبدأ بالأجواء البصرية قبل الوصول إلى تفاصيل اللوحة اللونية.',
    moodTitle: 'حدد الانطباع الأساسي للبراند.',
    moodText: 'هذا يربط الاختيار اللوني بتجربة العميل وانطباعه الأول.',
    familyTitle: 'حدد عائلة الألوان الأقرب.',
    familyText: 'مجموعة مركزة من العائلات اللونية الراقية تجعل القرار أوضح.',
    resultTitle: 'حدد الاتجاه النهائي.',
    resultText: 'راجع ثلاثة اتجاهات منتقاة واختر الأنسب للبراند.',
    save: 'حفظ الاتجاه',
    saved: 'تم حفظ الاتجاه',
    brief: 'ملخص الاتجاه',
    continue: 'سيتم استخدام هذا الاتجاه لتحسين الترشيحات والمعاينات القادمة.',
    brightness: {
      light: { title: 'فاتح وراق', text: 'نظيف، منفتح، وهادئ بطابع راق.' },
      dark: { title: 'غامق فاخر', text: 'سينمائي، واثق، وأكثر تميزا.' },
      balanced: { title: 'تباين متوازن', text: 'تباين مصقول مع إيقاع بصري مريح.' },
    },
    moods: {
      luxury: 'فاخر',
      bold: 'جريء',
      warm: 'دافئ',
      minimal: 'هادئ',
    },
    families: {
      gold: 'ذهبي',
      green: 'أخضر',
      berry: 'Berry',
      sand: 'رملي',
    },
  },
} as const;

const brightnessOptions: Brightness[] = ['light', 'dark', 'balanced'];
const moodOptions: StudioMood[] = ['luxury', 'bold', 'warm', 'minimal'];
const familyOptions: ColorFamily[] = ['gold', 'green', 'berry', 'sand'];

const familySwatches: Record<ColorFamily, string[]> = {
  gold: ['#101513', '#f7d17e', '#fff8e8'],
  green: ['#10231d', '#7bd8bd', '#badf9f'],
  berry: ['#180b13', '#f08bb0', '#8f3152'],
  sand: ['#17130d', '#e5c28a', '#22594b'],
};

const paletteByFamily: Record<ColorFamily, StudioPalette> = {
  gold: 'noir-gold',
  green: 'matcha-cream',
  berry: 'berry-night',
  sand: 'sand-ink',
};

const shadeByBrightness: Record<Brightness, ShadeDepth> = {
  light: 'soft',
  dark: 'deep',
  balanced: 'base',
};

const fallbackDirection: DirectionOption = {
  id: 'noir-gold',
  title: 'Premium direction',
  text: 'A clear premium starting point for the client.',
  mood: 'luxury',
  output: 'campaign',
  colors: familySwatches.gold,
};

export function ClientStudioPreview({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  const [step, setStep] = useState(0);
  const [brandName, setBrandName] = useState('North Cafe');
  const [brightness, setBrightness] = useState<Brightness>('balanced');
  const [mood, setMood] = useState<StudioMood>('luxury');
  const [family, setFamily] = useState<ColorFamily>('gold');
  const [selectedDirection, setSelectedDirection] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [lastSavedSignature, setLastSavedSignature] = useState<string | null>(null);

  useEffect(() => {
    const saved = readStudioDirectionFromUrl() ?? readStudioDirection();
    if (!saved) {
      return;
    }

    setBrandName(saved.brandName || 'North Cafe');
    if (moodOptions.includes(saved.mood as StudioMood)) {
      setMood(saved.mood as StudioMood);
    }
    const nextFamily = familyFromPalette(saved.palette);
    if (nextFamily) {
      setFamily(nextFamily);
    }
    setSavedAt(saved.savedAt);
    setLastSavedSignature(createSignature(saved.brandName, saved.mood, saved.palette, saved.output));
  }, []);

  const directions = useMemo(() => buildDirections({ brightness, family, mood, locale }), [brightness, family, locale, mood]);
  const activeDirection = directions[selectedDirection] ?? directions[0] ?? fallbackDirection;
  const brief = `${brandName || t.brandPlaceholder}. Feeling: ${t.moods[activeDirection.mood]}. Palette: ${
    activeDirection.title
  }. Output: ${activeDirection.output}.`;
  const currentSignature = createSignature(brandName, activeDirection.mood, activeDirection.id, activeDirection.output);
  const isSaved = savedAt !== null && lastSavedSignature === currentSignature;

  function saveDirection() {
    const saved = saveStudioDirection({
      brandName: brandName.trim() || t.brandPlaceholder,
      mood: activeDirection.mood,
      palette: activeDirection.id,
      output: activeDirection.output,
      prompt: brief,
    });
    setSavedAt(saved.savedAt);
    setLastSavedSignature(createSignature(saved.brandName, saved.mood, saved.palette, saved.output));
  }

  function nextStep() {
    setStep((value) => Math.min(3, value + 1));
  }

  function previousStep() {
    setStep((value) => Math.max(0, value - 1));
  }

  return (
    <section id="studio-preview" className="studio-preview mx-auto max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
      <div className="studio-preview__shell">
        <div className="studio-preview__controls">
          <div className="studio-preview__heading">
            <span>
              <Sparkles size={15} />
              {t.kicker}
            </span>
            <h2>{t.title}</h2>
            <p>{t.text}</p>
          </div>

          <label className="studio-field">
            <span>{t.brand}</span>
            <input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder={t.brandPlaceholder} />
          </label>

          <div className="studio-stepper" aria-label="Studio steps">
            {t.steps.map((label, index) => (
              <button key={label} type="button" data-active={step === index} onClick={() => setStep(index)}>
                <span>{index + 1}</span>
                {label}
              </button>
            ))}
          </div>

          {step === 0 ? (
            <StudioPanel title={t.brightnessTitle} text={t.brightnessText}>
              <div className="studio-choice-grid">
                {brightnessOptions.map((option) => {
                  const Icon = option === 'dark' ? Moon : option === 'light' ? Sun : Wand2;
                  return (
                    <button
                      key={option}
                      type="button"
                      data-active={brightness === option}
                      onClick={() => {
                        setBrightness(option);
                        setSelectedDirection(0);
                      }}
                    >
                      <Icon size={18} />
                      <strong>{t.brightness[option].title}</strong>
                      <span>{t.brightness[option].text}</span>
                    </button>
                  );
                })}
              </div>
            </StudioPanel>
          ) : null}

          {step === 1 ? (
            <StudioPanel title={t.moodTitle} text={t.moodText}>
              <div className="studio-pill-grid">
                {moodOptions.map((option) => (
                  <button key={option} type="button" data-active={mood === option} onClick={() => setMood(option)}>
                    {t.moods[option]}
                  </button>
                ))}
              </div>
            </StudioPanel>
          ) : null}

          {step === 2 ? (
            <StudioPanel title={t.familyTitle} text={t.familyText}>
              <div className="studio-family-grid">
                {familyOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    data-active={family === option}
                    onClick={() => {
                      setFamily(option);
                      setSelectedDirection(0);
                    }}
                  >
                    <span className="studio-swatch studio-swatch--large" aria-hidden="true">
                      {familySwatches[option].map((color) => (
                        <i key={color} style={{ backgroundColor: color }} />
                      ))}
                    </span>
                    <strong>{t.families[option]}</strong>
                  </button>
                ))}
              </div>
            </StudioPanel>
          ) : null}

          {step === 3 ? (
            <StudioPanel title={t.resultTitle} text={t.resultText}>
              <div className="studio-direction-list">
                {directions.map((direction, index) => (
                  <button
                    key={`${direction.id}-${direction.output}-${index}`}
                    type="button"
                    data-active={selectedDirection === index}
                    onClick={() => setSelectedDirection(index)}
                  >
                    <span className="studio-swatch studio-swatch--large" aria-hidden="true">
                      {direction.colors.map((color) => (
                        <i key={color} style={{ backgroundColor: color }} />
                      ))}
                    </span>
                    <strong>{direction.title}</strong>
                    <small>{direction.text}</small>
                  </button>
                ))}
              </div>
            </StudioPanel>
          ) : null}

          <div className="studio-flow-actions">
            <button type="button" onClick={previousStep} disabled={step === 0}>
              {locale === 'ar' ? 'السابق' : 'Back'}
            </button>
            {step < 3 ? (
              <button type="button" data-primary onClick={nextStep}>
                {locale === 'ar' ? 'التالي' : 'Next'}
              </button>
            ) : (
              <button type="button" data-primary onClick={saveDirection}>
                {isSaved ? <Check size={17} /> : <Save size={17} />}
                {isSaved ? t.saved : t.save}
              </button>
            )}
          </div>

          <div className="studio-brief">
            <p>{t.brief}</p>
            <strong>{brief}</strong>
            <span>{t.continue}</span>
          </div>
        </div>

        <div className="studio-preview__stage studio-preview__stage--compact">
          <DirectionPreview brandName={brandName || t.brandPlaceholder} direction={activeDirection} locale={locale} />
        </div>
      </div>
    </section>
  );
}

function StudioPanel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="studio-flow-panel">
      <div>
        <p>{title}</p>
        <span>{text}</span>
      </div>
      {children}
    </div>
  );
}

function buildDirections({
  brightness,
  family,
  mood,
  locale,
}: {
  brightness: Brightness;
  family: ColorFamily;
  mood: StudioMood;
  locale: AppLocale;
}): DirectionOption[] {
  const basePalette = paletteByFamily[family];
  const shade = shadeByBrightness[brightness];
  const colors = familySwatches[family];
  const primaryColor = colors[0] ?? '#101513';
  const secondaryColor = colors[1] ?? primaryColor;
  const accentColor = colors[2] ?? primaryColor;
  const labels =
    locale === 'ar'
      ? {
          calm: 'اتجاه هادي',
          premium: 'اتجاه فاخر',
          simple: 'اتجاه بسيط',
          calmText: 'اتجاه واضح ومتزن كبداية راقية.',
          premiumText: 'أقوى بصريا ومناسب لإحساس أكثر فخامة.',
          simpleText: 'خفيف ومصقول لمن يفضل حضورا بصريا أقل.',
        }
      : {
          calm: 'Calm direction',
          premium: 'Premium direction',
          simple: 'Simple direction',
          calmText: 'A clear, composed, and refined starting point.',
          premiumText: 'A stronger visual treatment for a more elevated feel.',
          simpleText: 'A polished lighter option with a quieter presence.',
        };

  return [
    {
      id: basePalette,
      title: labels.calm,
      text: labels.calmText,
      mood,
      output: 'campaign',
      colors,
    },
    {
      id: basePalette,
      title: labels.premium,
      text: labels.premiumText,
      mood: shade === 'soft' ? 'minimal' : 'luxury',
      output: 'banner',
      colors: shade === 'deep' ? [...colors].reverse() : colors,
    },
    {
      id: basePalette,
      title: labels.simple,
      text: labels.simpleText,
      mood: shade === 'deep' ? 'bold' : 'minimal',
      output: 'post',
      colors: [accentColor, secondaryColor, primaryColor],
    },
  ];
}

function DirectionPreview({ brandName, direction, locale }: { brandName: string; direction: DirectionOption; locale: AppLocale }) {
  const [primary, secondary, accent] = direction.colors;
  const primaryColor = primary ?? '#101513';
  const secondaryColor = secondary ?? '#f7d17e';
  const accentColor = accent ?? '#fff8e8';

  return (
    <div
      className="studio-direction-preview"
      style={{ '--preview-primary': primaryColor, '--preview-secondary': secondaryColor, '--preview-accent': accentColor } as CSSProperties}
    >
      <div className="studio-direction-preview__header">
        <div>
          <p>{locale === 'ar' ? 'معاينة الاتجاه' : 'Direction preview'}</p>
          <strong>{brandName}</strong>
        </div>
        <span>{direction.output}</span>
      </div>

      <div className="studio-direction-preview__hero">
        <div className="studio-direction-preview__poster">
          <span>{locale === 'ar' ? 'حملة' : 'Campaign'}</span>
          <strong>{brandName}</strong>
          <em>{direction.title}</em>
        </div>
        <div className="studio-direction-preview__copy">
          <span>{locale === 'ar' ? 'الاتجاه المختار' : 'Selected direction'}</span>
          <strong>{direction.title}</strong>
          <p>{direction.text}</p>
        </div>
      </div>

      <div className="studio-direction-preview__swatches">
        {direction.colors.map((color) => (
          <i key={color} style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}

function familyFromPalette(palette: string) {
  return (Object.entries(paletteByFamily).find(([, value]) => value === palette)?.[0] as ColorFamily | undefined) ?? undefined;
}

function readStudioDirectionFromUrl(): StudioDirection | null {
  try {
    const raw = new URL(window.location.href).searchParams.get('studio');
    return raw ? (JSON.parse(raw) as StudioDirection) : null;
  } catch {
    return null;
  }
}

function createSignature(brandName: string, mood: string, palette: string, output: string) {
  return [brandName.trim(), mood, palette, output].join('|');
}
