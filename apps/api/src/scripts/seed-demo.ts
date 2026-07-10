import {
  categories,
  licenses,
  productAssets,
  productAttributes,
  productCategories,
  productLicensePrices,
  products,
  productTags,
  tags,
} from '@3s-design/db/schema';
import dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { assertNonProductionSeed, requireDatabaseUrl } from './seed-policy';

dotenv.config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

const demoProducts = [
  ['luxury-restaurant-black-gold-posts', 'Luxury Restaurant Black Gold Posts', 'black gold luxury restaurant instagram social menu'],
  ['modern-cafe-story-bundle', 'Modern Cafe Story Bundle', 'modern cafe food social media instagram story beige green'],
  ['premium-burger-offer-kit', 'Premium Burger Offer Kit', 'burger restaurant offer ecommerce social media red black'],
  ['elegant-wedding-invitation-set', 'Elegant Wedding Invitation Set', 'luxury wedding event invitation gold white'],
  ['minimal-real-estate-carousel', 'Minimal Real Estate Carousel', 'real estate property corporate minimal blue clean'],
  ['fashion-sale-social-pack', 'Fashion Sale Social Pack', 'fashion ecommerce sale pink modern social'],
  ['beauty-brand-launch-kit', 'Beauty Brand Launch Kit', 'beauty makeup brand luxury pink gold instagram'],
  ['course-promo-template-pack', 'Course Promo Template Pack', 'education course academy training corporate blue'],
  ['pizza-menu-poster-pack', 'Pizza Menu Poster Pack', 'pizza restaurant menu print poster red yellow'],
  ['coffee-shop-brand-posts', 'Coffee Shop Brand Posts', 'cafe coffee restaurant social brown cream modern'],
  ['luxury-spa-instagram-kit', 'Luxury Spa Instagram Kit', 'luxury spa beauty green gold social'],
  ['black-friday-store-banners', 'Black Friday Store Banners', 'ecommerce store sale black gold offer banner'],
] as const;

function designDnaForTerms(terms: string) {
  const text = terms.toLowerCase();
  const values: Array<{ key: string; value: string; label: string; sortOrder: number }> = [];

  const add = (key: string, value: string, label: string, sortOrder: number) => {
    values.push({ key, value, label, sortOrder });
  };

  for (const color of ['black', 'gold', 'green', 'blue', 'red', 'yellow', 'pink', 'white', 'brown', 'cream']) {
    if (text.includes(color)) add('dna.color', color, 'Color', 10);
  }

  for (const style of ['luxury', 'modern', 'minimal', 'corporate', 'clean', 'elegant']) {
    if (text.includes(style)) add('dna.style', style, 'Style', 20);
  }

  for (const mood of ['premium', 'bold', 'calm', 'social', 'clean']) {
    if (text.includes(mood)) add('dna.mood', mood, 'Mood', 30);
  }

  for (const industry of ['restaurant', 'cafe', 'ecommerce', 'fashion', 'beauty', 'education', 'real estate', 'wedding']) {
    if (text.includes(industry)) add('dna.industry', industry, 'Industry', 40);
  }

  for (const platform of ['instagram', 'social', 'print', 'banner', 'poster']) {
    if (text.includes(platform)) add('dna.platform', platform, 'Platform', 50);
  }

  for (const format of ['post', 'story', 'carousel', 'menu', 'poster', 'banner', 'invitation']) {
    if (text.includes(format)) add('dna.format', format, 'Format', 60);
  }

  return values;
}

async function main() {
  assertNonProductionSeed('seed:demo');

  const pool = new pg.Pool({ connectionString: requireDatabaseUrl() });
  const db = drizzle(pool);

  try {
    await db
      .insert(licenses)
      .values({
        licenseType: 'full_commercial',
        name: 'Full Commercial',
        description: 'Full commercial use with modification rights.',
        priceMultiplier: '1.00',
        allowsCommercialUse: true,
        allowsResale: false,
        allowsModification: true,
        termsMarkdown: 'Full commercial use is allowed. Reselling the raw file as-is is not allowed.',
      })
      .onConflictDoNothing();

    const [license] = await db.select().from(licenses).where(eq(licenses.licenseType, 'full_commercial')).limit(1);

    if (!license) {
      throw new Error('Demo license was not created');
    }

    for (const item of [
      ['restaurant', 'Restaurant'],
      ['social-media', 'Social Media'],
      ['branding', 'Branding'],
      ['ecommerce', 'Ecommerce'],
      ['events', 'Events'],
    ] as const) {
      await db
        .insert(categories)
        .values({ slug: item[0], name: item[1], description: `${item[1]} design templates` })
        .onConflictDoNothing();
    }

    for (const item of [
      ['luxury', 'Luxury'],
      ['modern', 'Modern'],
      ['black-gold', 'Black Gold'],
      ['instagram', 'Instagram'],
      ['restaurant', 'Restaurant'],
      ['sale', 'Sale'],
    ] as const) {
      await db.insert(tags).values({ slug: item[0], name: item[1] }).onConflictDoNothing();
    }

    const [restaurantCategory] = await db.select().from(categories).where(eq(categories.slug, 'restaurant')).limit(1);
    const [socialCategory] = await db.select().from(categories).where(eq(categories.slug, 'social-media')).limit(1);
    const tagRows = await db.select().from(tags);
    const tagBySlug = new Map(tagRows.map((tag) => [tag.slug, tag]));

    for (const [index, productSeed] of demoProducts.entries()) {
      const [slug, title, terms] = productSeed;
      await db
        .insert(products)
        .values({
          slug,
          title,
          subtitle: 'Ready-to-customize premium design pack',
          description: `${title}. Keywords: ${terms}. Includes layered source-ready visual direction for digital campaigns.`,
          status: 'published',
          basePrice: (19 + index * 3).toFixed(2),
          currency: 'USD',
          isFeatured: index < 4,
          publishedAt: new Date(),
        })
        .onConflictDoNothing();

      const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
      if (!product) {
        continue;
      }

      const [existingAsset] = await db
        .select({ id: productAssets.id })
        .from(productAssets)
        .where(and(eq(productAssets.productId, product.id), eq(productAssets.assetType, 'watermarked_preview')))
        .limit(1);

      if (!existingAsset) {
        await db.insert(productAssets).values({
          productId: product.id,
          assetType: 'watermarked_preview',
          storageKey: `demo/previews/${slug}.jpg`,
          fileName: `${slug}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: 180000,
          assetStatus: 'ready',
          scanStatus: 'skipped',
          altText: title,
          isPrimary: true,
          isPublicPreview: true,
        });
      }

      const [existingPrice] = await db
        .select({ id: productLicensePrices.id })
        .from(productLicensePrices)
        .where(and(eq(productLicensePrices.productId, product.id), eq(productLicensePrices.licenseId, license.id)))
        .limit(1);

      if (!existingPrice) {
        await db.insert(productLicensePrices).values({
          productId: product.id,
          licenseId: license.id,
          price: product.basePrice,
          currency: product.currency,
        });
      }

      for (const category of [restaurantCategory, socialCategory].filter(Boolean)) {
        await db.insert(productCategories).values({ productId: product.id, categoryId: category!.id }).onConflictDoNothing();
      }

      for (const tagSlug of ['luxury', 'modern', 'black-gold', 'instagram', 'restaurant']) {
        const tag = tagBySlug.get(tagSlug);
        if (tag) {
          await db.insert(productTags).values({ productId: product.id, tagId: tag.id }).onConflictDoNothing();
        }
      }

      for (const attribute of designDnaForTerms(terms)) {
        await db
          .insert(productAttributes)
          .values({
            productId: product.id,
            ...attribute,
          })
          .onConflictDoNothing();
      }
    }

    console.log(`Seeded ${demoProducts.length} demo products.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown demo seed error';
  console.error(message);
  process.exitCode = 1;
});
