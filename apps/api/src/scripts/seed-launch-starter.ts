import {
  categories,
  licenses,
  productAttributes,
  productCategories,
  productLicensePrices,
  products,
  productTags,
  productVariants,
  tags,
} from '@3s-design/db/schema';
import dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

dotenv.config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

type LaunchProductSeed = {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  status?: 'draft' | 'published';
  isFeatured?: boolean;
  price: string;
  currency: string;
  category: { slug: string; name: string };
  tags: Array<{ slug: string; name: string }>;
  dna: Record<'industry' | 'mood' | 'style' | 'color' | 'platform' | 'format' | 'audience', string[]>;
  story?: {
    customerMoment: string;
    beforeState: string;
    afterState: string;
    buyerPromise: string;
    scenes: string[];
    visualProof: string[];
  };
  variant: {
    name: string;
    description: string;
    fileFormats: string[];
    dimensions: Array<{ label: string; width?: number; height?: number; unit?: string }>;
    softwareCompatibility: string[];
  };
};

const fullCommercialLicense = {
  licenseType: 'full_commercial',
  name: 'Full Commercial',
  description: 'Reusable commercial use with modification rights. The base design is non-exclusive and can be sold again.',
  priceMultiplier: '1.00',
  allowsCommercialUse: true,
  allowsResale: false,
  allowsModification: true,
  termsMarkdown:
    'Full commercial use is allowed. You may edit the design for your brand and publish it commercially. Reselling the raw files as-is is not allowed. This license is non-exclusive.',
};

const starterProducts: LaunchProductSeed[] = [
  {
    title: 'Noir Dining Launch Kit',
    slug: 'noir-dining-launch-kit',
    subtitle: 'Cinematic launch visuals for premium restaurants and dining brands',
    description:
      'A premium launch kit for restaurants that need to look bookable, polished, and exclusive across Instagram, stories, and menu reveal moments.',
    price: '29.00',
    currency: 'USD',
    category: { slug: 'restaurants-cafes', name: 'Restaurants and Cafes' },
    tags: [
      { slug: 'restaurant', name: 'Restaurant' },
      { slug: 'luxury', name: 'Luxury' },
      { slug: 'launch', name: 'Launch' },
      { slug: 'instagram', name: 'Instagram' },
      { slug: 'menu', name: 'Menu' },
    ],
    dna: {
      industry: ['restaurant', 'hospitality'],
      mood: ['premium', 'cinematic', 'exclusive', 'confident'],
      style: ['editorial', 'luxury', 'modern'],
      color: ['black', 'gold', 'ivory'],
      platform: ['instagram', 'social'],
      format: ['post', 'story', 'menu'],
      audience: ['restaurant owners', 'hospitality brands'],
    },
    variant: {
      name: 'Launch Pack',
      description: 'Instagram post, story, menu cover, and website preview source set.',
      fileFormats: ['figma', 'canva', 'png', 'pdf', 'zip'],
      dimensions: [
        { label: 'Instagram post', width: 1080, height: 1080, unit: 'px' },
        { label: 'Instagram story', width: 1080, height: 1920, unit: 'px' },
        { label: 'Website preview', width: 1600, height: 1200, unit: 'px' },
      ],
      softwareCompatibility: ['Figma', 'Canva'],
    },
  },
  {
    title: 'Glow Clinic Launch Kit',
    slug: 'glow-clinic-launch-kit',
    subtitle: 'Clean premium service launch visuals for beauty clinics and skincare studios',
    description:
      'A calm and credible beauty launch kit for clinics and skincare studios announcing a premium service with trust, softness, and luxury.',
    price: '39.00',
    currency: 'USD',
    category: { slug: 'beauty-wellness', name: 'Beauty and Wellness' },
    tags: [
      { slug: 'beauty', name: 'Beauty' },
      { slug: 'clinic', name: 'Clinic' },
      { slug: 'skincare', name: 'Skincare' },
      { slug: 'booking', name: 'Booking' },
      { slug: 'luxury', name: 'Luxury' },
    ],
    dna: {
      industry: ['beauty', 'wellness', 'clinic'],
      mood: ['clean', 'safe', 'luxurious', 'soft'],
      style: ['minimal', 'premium', 'clinical'],
      color: ['white', 'champagne', 'sage'],
      platform: ['instagram', 'social'],
      format: ['carousel', 'story', 'offer post'],
      audience: ['beauty clinics', 'skincare studios', 'spa owners'],
    },
    variant: {
      name: 'Clinic Launch Pack',
      description: 'Carousel cover, detail slide, offer post, and story booking frame.',
      fileFormats: ['figma', 'canva', 'png', 'zip'],
      dimensions: [
        { label: 'Carousel slide', width: 1080, height: 1080, unit: 'px' },
        { label: 'Story booking frame', width: 1080, height: 1920, unit: 'px' },
        { label: 'Website preview', width: 1600, height: 1200, unit: 'px' },
      ],
      softwareCompatibility: ['Figma', 'Canva'],
    },
  },
  {
    title: 'Signature Property Carousel',
    slug: 'signature-property-carousel',
    subtitle: 'High-ticket property carousel for agents, brokerages, and developers',
    description:
      'A premium real estate carousel that helps serious buyers inspect property value, location, amenities, and trust signals without visual noise.',
    price: '45.00',
    currency: 'USD',
    category: { slug: 'real-estate-property', name: 'Real Estate and Property' },
    tags: [
      { slug: 'real-estate', name: 'Real Estate' },
      { slug: 'property', name: 'Property' },
      { slug: 'carousel', name: 'Carousel' },
      { slug: 'premium', name: 'Premium' },
      { slug: 'listing', name: 'Listing' },
    ],
    dna: {
      industry: ['real estate', 'property'],
      mood: ['confident', 'spacious', 'trusted', 'high-ticket'],
      style: ['clean', 'corporate', 'premium'],
      color: ['white', 'deep green', 'steel blue', 'muted gold'],
      platform: ['instagram', 'social'],
      format: ['carousel', 'story', 'listing card'],
      audience: ['real estate agents', 'brokerages', 'property developers'],
    },
    variant: {
      name: 'Property Carousel Pack',
      description: 'Carousel cover, property details, amenities, and story teaser frames.',
      fileFormats: ['figma', 'canva', 'png', 'pdf', 'zip'],
      dimensions: [
        { label: 'Carousel slide', width: 1080, height: 1080, unit: 'px' },
        { label: 'Story teaser', width: 1080, height: 1920, unit: 'px' },
        { label: 'Website preview', width: 1600, height: 1200, unit: 'px' },
      ],
      softwareCompatibility: ['Figma', 'Canva'],
    },
  },
  {
    title: 'Capsule Drop Sale Kit',
    slug: 'capsule-drop-sale-kit',
    subtitle: 'A premium campaign system for boutique drops, private edits, and limited-time fashion offers',
    description:
      'A story-led campaign kit for boutique and ecommerce brands that need urgency without making the sale feel cheap. It turns a discount or limited drop into a private shopping moment across posts, stories, banners, product promos, and final reminders.',
    status: 'draft',
    isFeatured: true,
    price: '49.00',
    currency: 'USD',
    category: { slug: 'fashion-ecommerce', name: 'Fashion and Ecommerce' },
    tags: [
      { slug: 'fashion', name: 'Fashion' },
      { slug: 'ecommerce', name: 'Ecommerce' },
      { slug: 'sale', name: 'Sale' },
      { slug: 'capsule-drop', name: 'Capsule Drop' },
      { slug: 'canva', name: 'Canva' },
      { slug: 'figma', name: 'Figma' },
      { slug: 'campaign', name: 'Campaign' },
      { slug: 'premium', name: 'Premium' },
    ],
    dna: {
      industry: ['fashion', 'ecommerce'],
      mood: ['selective', 'premium', 'urgent', 'quiet luxury'],
      style: ['editorial', 'minimal', 'luxury'],
      color: ['black', 'ivory', 'champagne gold', 'taupe'],
      platform: ['instagram', 'website', 'canva', 'figma'],
      format: ['post', 'story', 'banner', 'promo card', 'reminder'],
      audience: ['boutique owners', 'premium ecommerce sellers', 'fashion marketers'],
    },
    story: {
      customerMoment:
        'A premium boutique is launching a small curated sale or capsule drop and needs customers to feel invited, not shouted at.',
      beforeState:
        'The products are worth buying, but the sale announcement risks looking generic, loud, or too close to discount-store graphics.',
      afterState:
        'The campaign feels selective and organized, so customers understand the offer, trust the brand, and act before the window closes.',
      buyerPromise: 'Turn a sale into a private shopping moment that protects the brand while still pushing customers to act.',
      scenes: [
        'Private announcement post introduces the drop without visual noise.',
        'Story reveal highlights one hero product with a quiet CTA.',
        'Website banner connects the social campaign to the shop.',
        'Product promo card pushes the strongest item with premium restraint.',
        'Final reminder creates urgency without cheap discount language.',
      ],
      visualProof: [
        'Show the five-stage campaign journey on the product page.',
        'Use watermarked previews that reveal real layouts without giving away final files.',
        'Replace abstract placeholders with licensed fashion product imagery before publishing.',
        'Keep Figma and Canva editable copy, dates, offers, and product names editable.',
        'Label the Canva V2 banner fallback until the real detail-pass conversion is ready.',
      ],
    },
    variant: {
      name: 'Premium 30-Template Campaign System',
      description:
        'Five campaign stages with Instagram posts, stories, website banners, product promos, reminders, Figma master, Canva editable copy, and export-ready previews.',
      fileFormats: ['figma', 'canva', 'png', 'webp', 'zip'],
      dimensions: [
        { label: 'Instagram post', width: 1080, height: 1080, unit: 'px' },
        { label: 'Instagram story', width: 1080, height: 1920, unit: 'px' },
        { label: 'Website banner', width: 1600, height: 900, unit: 'px' },
        { label: 'Website hero preview', width: 1600, height: 1200, unit: 'px' },
      ],
      softwareCompatibility: ['Figma', 'Canva'],
    },
  },
  {
    title: 'Elegant Wedding Invitation Suite',
    slug: 'elegant-wedding-invitation-suite',
    subtitle: 'Timeless print and digital invitation suite for weddings and private events',
    description:
      'A premium invitation suite for weddings and private events that feels ceremonial, personal, elegant, and ready for both print and social delivery.',
    price: '42.00',
    currency: 'USD',
    category: { slug: 'events-invitations', name: 'Events and Invitations' },
    tags: [
      { slug: 'wedding', name: 'Wedding' },
      { slug: 'invitation', name: 'Invitation' },
      { slug: 'event', name: 'Event' },
      { slug: 'print', name: 'Print' },
      { slug: 'elegant', name: 'Elegant' },
    ],
    dna: {
      industry: ['wedding', 'events'],
      mood: ['ceremonial', 'elegant', 'timeless', 'warm'],
      style: ['classic', 'luxury', 'romantic'],
      color: ['ivory', 'pearl', 'gold'],
      platform: ['print', 'instagram', 'social'],
      format: ['invitation', 'rsvp', 'story', 'menu'],
      audience: ['wedding planners', 'couples', 'event designers'],
    },
    variant: {
      name: 'Invitation Suite',
      description: 'Invitation front, RSVP card, story announcement, and detail card.',
      fileFormats: ['figma', 'canva', 'png', 'pdf', 'zip'],
      dimensions: [
        { label: 'Invitation front', width: 5, height: 7, unit: 'in' },
        { label: 'RSVP card', width: 5, height: 7, unit: 'in' },
        { label: 'Story announcement', width: 1080, height: 1920, unit: 'px' },
      ],
      softwareCompatibility: ['Figma', 'Canva'],
    },
  },
];

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL');
  }

  return databaseUrl;
}

async function main() {
  const pool = new pg.Pool({ connectionString: requireDatabaseUrl() });
  const db = drizzle(pool);

  try {
    await db.insert(licenses).values(fullCommercialLicense).onConflictDoNothing();
    const [license] = await db.select().from(licenses).where(eq(licenses.licenseType, fullCommercialLicense.licenseType)).limit(1);

    if (!license) {
      throw new Error('Full commercial license is missing');
    }

    for (const seed of starterProducts) {
      await db.insert(categories).values(seed.category).onConflictDoNothing();
      const [category] = await db.select().from(categories).where(eq(categories.slug, seed.category.slug)).limit(1);

      if (!category) {
        throw new Error(`Category was not created: ${seed.category.slug}`);
      }

      for (const tag of seed.tags) {
        await db.insert(tags).values(tag).onConflictDoNothing();
      }

      const [existing] = await db.select().from(products).where(eq(products.slug, seed.slug)).limit(1);
      const productValues = {
        slug: seed.slug,
        title: seed.title,
        subtitle: seed.subtitle,
        description: seed.description,
        status: seed.status ?? 'draft',
        basePrice: seed.price,
        currency: seed.currency,
        isFeatured: seed.isFeatured ?? false,
        publishedAt: seed.status === 'published' ? new Date() : null,
      };

      const product = existing ?? (await db.insert(products).values(productValues).returning())[0];

      if (!product) {
        throw new Error(`Product was not created: ${seed.slug}`);
      }

      if (existing) {
        await db
          .update(products)
          .set({ ...productValues, updatedAt: new Date() })
          .where(eq(products.id, existing.id));
      }

      await db.insert(productCategories).values({ productId: product.id, categoryId: category.id }).onConflictDoNothing();

      for (const tagSeed of seed.tags) {
        const [tag] = await db.select().from(tags).where(eq(tags.slug, tagSeed.slug)).limit(1);
        if (tag) {
          await db.insert(productTags).values({ productId: product.id, tagId: tag.id }).onConflictDoNothing();
        }
      }

      const [existingPrice] = await db
        .select({ id: productLicensePrices.id })
        .from(productLicensePrices)
        .where(and(eq(productLicensePrices.productId, product.id), eq(productLicensePrices.licenseId, license.id)))
        .limit(1);

      if (existingPrice) {
        await db
          .update(productLicensePrices)
          .set({ price: seed.price, currency: seed.currency, updatedAt: new Date() })
          .where(eq(productLicensePrices.id, existingPrice.id));
      } else {
        await db.insert(productLicensePrices).values({
          productId: product.id,
          licenseId: license.id,
          price: seed.price,
          currency: seed.currency,
        });
      }

      const [existingVariant] = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(and(eq(productVariants.productId, product.id), eq(productVariants.name, seed.variant.name)))
        .limit(1);

      if (existingVariant) {
        await db
          .update(productVariants)
          .set({
            description: seed.variant.description,
            fileFormats: seed.variant.fileFormats,
            dimensions: seed.variant.dimensions,
            softwareCompatibility: seed.variant.softwareCompatibility,
            priceDelta: '0',
            isDefault: true,
            sortOrder: 0,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, existingVariant.id));
      } else {
        await db.insert(productVariants).values({
          productId: product.id,
          name: seed.variant.name,
          description: seed.variant.description,
          fileFormats: seed.variant.fileFormats,
          dimensions: seed.variant.dimensions,
          softwareCompatibility: seed.variant.softwareCompatibility,
          priceDelta: '0',
          isDefault: true,
          sortOrder: 0,
        });
      }

      for (const [group, values] of Object.entries(seed.dna)) {
        const label = group.replace(/^\w/, (letter) => letter.toUpperCase());
        for (const value of values) {
          await db
            .insert(productAttributes)
            .values({
              productId: product.id,
              key: `dna.${group}`,
              value,
              label,
            })
            .onConflictDoNothing();
        }
      }

      if (seed.story) {
        const storyAttributes = [
          { key: 'story.customer_moment', value: seed.story.customerMoment, label: 'Customer moment', sortOrder: 0 },
          { key: 'story.before_state', value: seed.story.beforeState, label: 'Before state', sortOrder: 1 },
          { key: 'story.after_state', value: seed.story.afterState, label: 'After state', sortOrder: 2 },
          { key: 'story.buyer_promise', value: seed.story.buyerPromise, label: 'Buyer promise', sortOrder: 3 },
          ...seed.story.scenes.map((value, index) => ({
            key: 'story.scene',
            value,
            label: 'Campaign scene',
            sortOrder: 10 + index,
          })),
          ...seed.story.visualProof.map((value, index) => ({
            key: 'story.visual_proof',
            value,
            label: 'Visual proof',
            sortOrder: 30 + index,
          })),
        ];

        for (const attribute of storyAttributes) {
          await db
            .insert(productAttributes)
            .values({ productId: product.id, ...attribute })
            .onConflictDoNothing();
        }
      }
    }

    console.log(`Seeded ${starterProducts.length} launch starter draft products.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown launch starter seed error';
  console.error(message);
  process.exitCode = 1;
});
