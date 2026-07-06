export const designDnaKeys = [
  'dna.industry',
  'dna.style',
  'dna.mood',
  'dna.color',
  'dna.platform',
  'dna.format',
  'dna.occasion',
  'dna.audience',
] as const;

export type DesignDnaKey = (typeof designDnaKeys)[number];

export type DesignDna = {
  industries: string[];
  styles: string[];
  moods: string[];
  colors: string[];
  platforms: string[];
  formats: string[];
  occasions: string[];
  audiences: string[];
};

export type QualitySignal = {
  key: string;
  label: string;
  passed: boolean;
  weight: number;
  message: string;
};

export function createEmptyDesignDna(): DesignDna {
  return {
    industries: [],
    styles: [],
    moods: [],
    colors: [],
    platforms: [],
    formats: [],
    occasions: [],
    audiences: [],
  };
}

export function designDnaFromAttributes(attributes: Array<{ key: string; value: string }>): DesignDna {
  const dna = createEmptyDesignDna();

  for (const attribute of attributes) {
    const value = attribute.value.trim();
    if (!value) {
      continue;
    }

    switch (attribute.key) {
      case 'dna.industry':
        dna.industries.push(value);
        break;
      case 'dna.style':
        dna.styles.push(value);
        break;
      case 'dna.mood':
        dna.moods.push(value);
        break;
      case 'dna.color':
        dna.colors.push(value);
        break;
      case 'dna.platform':
        dna.platforms.push(value);
        break;
      case 'dna.format':
        dna.formats.push(value);
        break;
      case 'dna.occasion':
        dna.occasions.push(value);
        break;
      case 'dna.audience':
        dna.audiences.push(value);
        break;
    }
  }

  return {
    industries: uniqueSorted(dna.industries),
    styles: uniqueSorted(dna.styles),
    moods: uniqueSorted(dna.moods),
    colors: uniqueSorted(dna.colors),
    platforms: uniqueSorted(dna.platforms),
    formats: uniqueSorted(dna.formats),
    occasions: uniqueSorted(dna.occasions),
    audiences: uniqueSorted(dna.audiences),
  };
}

export function flattenDesignDna(dna: DesignDna) {
  return [
    ...dna.industries,
    ...dna.styles,
    ...dna.moods,
    ...dna.colors,
    ...dna.platforms,
    ...dna.formats,
    ...dna.occasions,
    ...dna.audiences,
  ];
}

export function scoreProductQuality(input: {
  title: string;
  slug: string;
  description: string;
  basePrice: string;
  hasLicensePrice: boolean;
  hasWatermarkedPreview: boolean;
  hasDeliveryAsset: boolean;
  hasCategory: boolean;
  hasTags: boolean;
  hasDesignDna: boolean;
}) {
  const signals: QualitySignal[] = [
    {
      key: 'title',
      label: 'Title',
      passed: input.title.trim().length >= 3,
      weight: 8,
      message: 'Product title should be clear and searchable.',
    },
    {
      key: 'slug',
      label: 'Slug',
      passed: input.slug.trim().length >= 3,
      weight: 6,
      message: 'Product slug should be stable and readable.',
    },
    {
      key: 'description',
      label: 'Description',
      passed: input.description.trim().length >= 80,
      weight: 14,
      message: 'Use a richer description so search and AI can understand the design.',
    },
    {
      key: 'price',
      label: 'Price',
      passed: Number(input.basePrice) > 0,
      weight: 8,
      message: 'Product base price must be greater than zero.',
    },
    {
      key: 'license_price',
      label: 'License price',
      passed: input.hasLicensePrice,
      weight: 12,
      message: 'At least one license price is required.',
    },
    {
      key: 'watermarked_preview',
      label: 'Watermarked preview',
      passed: input.hasWatermarkedPreview,
      weight: 16,
      message: 'A ready primary public watermarked preview protects and sells the design.',
    },
    {
      key: 'delivery_asset',
      label: 'Delivery asset',
      passed: input.hasDeliveryAsset,
      weight: 14,
      message: 'At least one safe delivery file is required.',
    },
    {
      key: 'category',
      label: 'Category',
      passed: input.hasCategory,
      weight: 8,
      message: 'At least one category helps customers browse.',
    },
    {
      key: 'tags',
      label: 'Tags',
      passed: input.hasTags,
      weight: 6,
      message: 'Tags improve discovery and recommendations.',
    },
    {
      key: 'design_dna',
      label: 'Design DNA',
      passed: input.hasDesignDna,
      weight: 8,
      message: 'Design DNA powers smarter AI matching.',
    },
  ];

  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const earned = signals.filter((signal) => signal.passed).reduce((sum, signal) => sum + signal.weight, 0);
  const score = Math.round((earned / totalWeight) * 100);

  return {
    score,
    grade: score >= 90 ? 'excellent' : score >= 75 ? 'strong' : score >= 55 ? 'needs_work' : 'not_ready',
    signals,
  };
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
