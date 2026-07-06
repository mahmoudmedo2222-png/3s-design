import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  aiDiscoveryMessages,
  aiDiscoverySessions,
  categories,
  licenses,
  productAssets,
  productAttributes,
  productCategories,
  productLicensePrices,
  products,
  productTags,
  searchEvents,
  tags,
} from '@3s-design/db/schema';
import { and, asc, desc, eq, ilike, or, sql, SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { designDnaFromAttributes, type DesignDna } from '../products/design-dna';
import { AiDiscoveryQueryDto } from './dto/ai-discovery-query.dto';
import { CreateAiDiscoverySessionDto } from './dto/create-ai-discovery-session.dto';
import { SendAiDiscoveryMessageDto } from './dto/send-ai-discovery-message.dto';

type DiscoveryIntent = {
  originalMessage: string;
  keywords: string[];
  colors: string[];
  styles: string[];
  useCases: string[];
  platforms: string[];
  budgetSignals: string[];
  confidence: number;
  source: 'rules' | 'openai';
};

type LicenseOption = {
  id: string;
  type: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  allowsCommercialUse: boolean;
  allowsModification: boolean;
  allowsResale: boolean;
};

type MatchInsight = {
  score: number;
  decisionTag: 'Best fit' | 'Strong fit' | 'Creative alternative';
  reason: string;
  matchedSignals: string[];
  reuseModel: string;
  nextAction: string;
  confidenceLabel: 'High confidence' | 'Good confidence' | 'Needs refinement';
};

type DiscoveryProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description?: string;
  basePrice: string;
  currency: string;
  isFeatured?: boolean;
  previewStorageKey: string | null;
  previewAltText: string | null;
  matchScore?: number | string;
  designDna?: DesignDna;
  licenseOptions?: LicenseOption[];
  defaultLicense?: LicenseOption | null;
  match?: MatchInsight;
};

const colorDictionary: Record<string, string[]> = {
  black: ['black', 'dark', 'aswad', 'eswed', 'اسود', 'أسود', 'غامق'],
  white: ['white', 'clean', 'abyad', 'ابيض', 'أبيض', 'نظيف'],
  blue: ['blue', 'navy', 'azraq', 'kahly', 'ازرق', 'أزرق', 'كحلي'],
  red: ['red', 'ahmar', 'احمر', 'أحمر'],
  green: ['green', 'akhdar', 'اخضر', 'أخضر'],
  gold: ['gold', 'golden', 'zahaby', 'dahaby', 'دهبي', 'ذهبي', 'ذهب'],
  pink: ['pink', 'rose', 'wardy', 'pemby', 'وردي', 'بمبي'],
  purple: ['purple', 'violet', 'mauve', 'mov', 'بنفسجي', 'موف'],
  orange: ['orange', 'برتقالي'],
  yellow: ['yellow', 'اصفر', 'أصفر'],
  beige: ['beige', 'cream', 'كريمي', 'بيج'],
};

const styleDictionary: Record<string, string[]> = {
  luxury: ['luxury', 'premium', 'elegant', 'fancy', 'fakhamah', 'expensive', 'high end', 'فاخر', 'فخم', 'برستيج', 'راقي'],
  minimal: ['minimal', 'simple', 'clean', 'calm', 'هادئ', 'بسيط', 'نضيف', 'نظيف'],
  modern: ['modern', 'trendy', 'contemporary', 'مودرن', 'عصري'],
  playful: ['playful', 'fun', 'cute', 'مرح', 'لطيف'],
  corporate: ['corporate', 'business', 'formal', 'professional', 'رسمي', 'احترافي'],
  social: ['social', 'instagram', 'facebook', 'post', 'story'],
  print: ['print', 'flyer', 'poster', 'brochure'],
};

const emotionDictionary: Record<string, string[]> = {
  trust: ['trust', 'trusted', 'confidence', 'safe', 'secure', 'credible', 'ثقة', 'موثوق', 'امان', 'أمان'],
  desire: ['desire', 'crave', 'want', 'tempting', 'appetite', 'يشتهي', 'اشتهاء', 'رغبة', 'مغري'],
  urgency: ['urgent', 'limited', 'scarcity', 'now', 'fast', 'launch', 'sale', 'offer', 'عرض', 'خصم', 'مستعجل', 'سرعة'],
  prestige: ['prestige', 'exclusive', 'elite', 'signature', 'unique', 'exclusive', 'مميز', 'حصري', 'مش اي موقع', 'راقي'],
  calm: ['calm', 'soft', 'peaceful', 'relaxed', 'هادئ', 'مريح', 'راقي'],
  excitement: ['exciting', 'bold', 'wow', 'impact', 'energetic', 'اكشن', 'مبهر', 'جريء'],
};

const useCaseDictionary: Record<string, string[]> = {
  restaurant: ['restaurant', 'cafe', 'food', 'menu', 'pizza', 'burger', 'مطعم', 'كافيه', 'منيو', 'اكل', 'أكل'],
  fashion: ['fashion', 'clothes', 'beauty', 'makeup', 'brand', 'موضة', 'ازياء', 'أزياء', 'ملابس', 'براند'],
  realEstate: ['real estate', 'property', 'apartment', 'broker', 'عقار', 'عقارات', 'شقة', 'كمبوند'],
  event: ['event', 'wedding', 'party', 'invitation', 'فرح', 'زفاف', 'دعوة', 'حفلة'],
  ecommerce: ['ecommerce', 'store', 'shop', 'sale', 'offer', 'متجر', 'بيع', 'عرض', 'خصم'],
  education: ['course', 'school', 'training', 'academy', 'كورس', 'تعليم', 'اكاديمية', 'أكاديمية'],
};

const platformDictionary: Record<string, string[]> = {
  instagram: ['instagram', 'post', 'story', 'reel', 'social'],
  facebook: ['facebook', 'fb'],
  print: ['print', 'flyer', 'poster', 'menu'],
  web: ['web', 'website', 'banner', 'landing'],
};

extendDictionary(colorDictionary, {
  black: ['اسود', 'أسود', 'غامق', 'داكن'],
  white: ['ابيض', 'أبيض', 'نظيف', 'نضيف', 'فاتح'],
  blue: ['ازرق', 'أزرق', 'كحلي'],
  red: ['احمر', 'أحمر'],
  green: ['اخضر', 'أخضر'],
  gold: ['دهبي', 'ذهبي', 'ذهب'],
  pink: ['وردي', 'بمبي'],
  purple: ['بنفسجي', 'موف'],
  orange: ['برتقالي'],
  yellow: ['اصفر', 'أصفر'],
  beige: ['كريمي', 'بيج'],
});

extendDictionary(styleDictionary, {
  luxury: ['فاخر', 'فخم', 'برستيج', 'راقي'],
  minimal: ['هادئ', 'بسيط', 'نظيف', 'نضيف'],
  modern: ['مودرن', 'عصري'],
  playful: ['مرح', 'لطيف'],
  corporate: ['رسمي', 'احترافي'],
});

extendDictionary(emotionDictionary, {
  trust: ['ثقة', 'موثوق', 'امان', 'أمان'],
  desire: ['يشتهي', 'اشتهاء', 'رغبة', 'مغري'],
  urgency: ['عرض', 'خصم', 'مستعجل', 'سرعة', 'اطلاق', 'إطلاق'],
  prestige: ['مميز', 'حصري', 'مش اي موقع', 'راقي'],
  calm: ['هادئ', 'مريح', 'راقي'],
  excitement: ['اكشن', 'مبهر', 'جريء'],
});

extendDictionary(useCaseDictionary, {
  restaurant: ['مطعم', 'كافيه', 'منيو', 'اكل', 'أكل'],
  fashion: ['موضة', 'ازياء', 'أزياء', 'ملابس', 'براند'],
  realEstate: ['عقار', 'عقارات', 'شقة', 'كمبوند'],
  event: ['فرح', 'زفاف', 'دعوة', 'حفلة'],
  ecommerce: ['متجر', 'بيع', 'عرض', 'خصم'],
  education: ['كورس', 'تعليم', 'اكاديمية', 'أكاديمية'],
});

extendDictionary(platformDictionary, {
  instagram: ['instagram', 'insta', 'انستجرام', 'انستغرام', 'بوست', 'ستوري', 'ريلز'],
  facebook: ['facebook', 'فيسبوك', 'فيس', 'فيس بوك'],
  print: ['print', 'طباعه', 'طباعة', 'فلاير', 'بوستر', 'منيو'],
  web: ['website', 'web', 'موقع', 'بانر', 'لاندنج'],
});

const stopWords = new Set([
  'the',
  'and',
  'for',
  'with',
  'design',
  'template',
  'want',
  'need',
  'looking',
  'please',
  'idea',
  'ideas',
  'color',
  'colors',
  'customer',
  'feel',
  'feeling',
]);

const aiIntentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['keywords', 'colors', 'styles', 'useCases', 'platforms', 'budgetSignals', 'confidence'],
  properties: {
    keywords: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 12,
    },
    colors: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 6,
    },
    styles: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 6,
    },
    useCases: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 6,
    },
    platforms: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 6,
    },
    budgetSignals: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 4,
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
  },
};

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

function extendDictionary(dictionary: Record<string, string[]>, extensions: Record<string, string[]>) {
  for (const [key, aliases] of Object.entries(extensions)) {
    dictionary[key] = Array.from(new Set([...(dictionary[key] ?? []), ...aliases]));
  }
}

@Injectable()
export class AiDiscoveryService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  getStatus() {
    const openAiConfigured = Boolean(this.config.get<string>('OPENAI_API_KEY'));
    const model = this.config.get<string>('OPENAI_AI_DISCOVERY_MODEL') ?? 'gpt-5.4-mini';

    return {
      openAiConfigured,
      mode: openAiConfigured ? 'openai' : 'rules',
      model: openAiConfigured ? model : null,
      privacy: openAiConfigured ? 'OpenAI requests are sent with store=false.' : 'Local smart matching only.',
      capabilities: {
        arabicIntent: true,
        emotionalSearch: true,
        paginatedResults: true,
        savedSessionContext: true,
      },
    };
  }

  async createSession(input: CreateAiDiscoverySessionDto) {
    const [session] = await this.database
      .requireDb()
      .insert(aiDiscoverySessions)
      .values({
        title: input.title,
      })
      .returning();

    if (!session) {
      throw new BadRequestException('AI discovery session creation failed');
    }

    return session;
  }

  async getSession(sessionId: string) {
    const db = this.database.requireDb();
    const [session] = await db.select().from(aiDiscoverySessions).where(eq(aiDiscoverySessions.id, sessionId)).limit(1);

    if (!session) {
      throw new NotFoundException('AI discovery session not found');
    }

    const messages = await db
      .select()
      .from(aiDiscoveryMessages)
      .where(eq(aiDiscoveryMessages.sessionId, session.id))
      .orderBy(asc(aiDiscoveryMessages.createdAt));

    return { session, messages };
  }

  async suggest(input: AiDiscoveryQueryDto) {
    const sessionId = input.sessionId ?? (await this.createSession({})).id;
    return this.sendMessage(sessionId, {
      message: input.message,
      limit: this.safeLimit(input.limit),
      page: this.safePage(input.page),
    });
  }

  async sendMessage(sessionId: string, input: SendAiDiscoveryMessageDto) {
    const session = await this.assertSession(sessionId);
    const limit = this.safeLimit(input.limit);
    const page = this.safePage(input.page);
    const previousMessages = await this.getRecentMessages(sessionId);
    const intent = await this.extractIntent(input.message, previousMessages);
    const mergedIntent = this.mergeIntent(session.context, intent);
    const searchTerms = this.searchTerms(mergedIntent);
    const result = await this.searchProducts(searchTerms, limit, page);
    const matchedItems = this.attachMatchInsights(result.items, mergedIntent, result.usedFallback);
    const assistantMessage = this.createAssistantMessage(
      mergedIntent,
      matchedItems.length,
      result.pagination.page,
      result.usedFallback,
      matchedItems,
    );
    const brief = this.createBrief(mergedIntent);
    const groups = this.groupResults(matchedItems);

    const db = this.database.requireDb();
    await db.transaction(async (tx) => {
      await tx.insert(aiDiscoveryMessages).values({
        sessionId,
        role: 'user',
        content: input.message,
        intent,
        productIds: [],
        resultCount: 0,
      });

      await tx.insert(aiDiscoveryMessages).values({
        sessionId,
        role: 'assistant',
        content: assistantMessage,
        intent: mergedIntent,
        productIds: matchedItems.map((item) => item.id),
        resultCount: matchedItems.length,
      });

      await tx
        .update(aiDiscoverySessions)
        .set({
          context: mergedIntent,
          title: session.title ?? this.createSessionTitle(input.message),
          updatedAt: new Date(),
        })
        .where(eq(aiDiscoverySessions.id, sessionId));

      await tx.insert(searchEvents).values({
        query: input.message,
        filters: {
          ...mergedIntent,
          brief,
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          usedFallback: result.usedFallback,
        },
        resultCount: result.items.length,
      });
    });

    return {
      sessionId,
      assistantMessage,
      intent: mergedIntent,
      brief,
      items: matchedItems,
      groups,
      pagination: result.pagination,
      nextQuestions: this.nextQuestions(mergedIntent),
    };
  }

  private async assertSession(sessionId: string) {
    const [session] = await this.database
      .requireDb()
      .select()
      .from(aiDiscoverySessions)
      .where(eq(aiDiscoverySessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new NotFoundException('AI discovery session not found');
    }

    return session;
  }

  private async getRecentMessages(sessionId: string) {
    return this.database
      .requireDb()
      .select({
        role: aiDiscoveryMessages.role,
        content: aiDiscoveryMessages.content,
      })
      .from(aiDiscoveryMessages)
      .where(eq(aiDiscoveryMessages.sessionId, sessionId))
      .orderBy(desc(aiDiscoveryMessages.createdAt))
      .limit(6);
  }

  private async extractIntent(message: string, previousMessages: Array<{ role: string; content: string }>): Promise<DiscoveryIntent> {
    const openAiIntent = await this.extractIntentWithOpenAi(message, previousMessages);
    if (openAiIntent) {
      return openAiIntent;
    }

    return this.extractIntentWithRules(message);
  }

  private async extractIntentWithOpenAi(
    message: string,
    previousMessages: Array<{ role: string; content: string }>,
  ): Promise<DiscoveryIntent | undefined> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      return undefined;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.get<string>('OPENAI_AI_DISCOVERY_MODEL') ?? 'gpt-5.4-mini',
          store: false,
          max_output_tokens: 500,
          input: [
            {
              role: 'system',
              content:
                'Extract ecommerce design-search intent for a premium digital design marketplace. Use English canonical labels. Preserve emotional buying intent such as trust, desire, urgency, prestige, calm, and excitement. Treat Arabic, Arabizi, and English inputs equally. Return only the structured data requested by the schema.',
            },
            ...previousMessages.reverse().map((item) => ({
              role: item.role === 'assistant' ? 'assistant' : 'user',
              content: item.content,
            })),
            { role: 'user', content: message },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'design_search_intent',
              strict: true,
              schema: aiIntentJsonSchema,
            },
          },
        }),
      });

      if (!response.ok) {
        return undefined;
      }

      const data = (await response.json()) as OpenAiResponsePayload;
      const parsed = JSON.parse(this.extractOpenAiOutputText(data) ?? '{}') as Partial<DiscoveryIntent>;

      return {
        originalMessage: message,
        keywords: this.cleanList(parsed.keywords),
        colors: this.cleanList(parsed.colors),
        styles: this.cleanList(parsed.styles),
        useCases: this.cleanList(parsed.useCases),
        platforms: this.cleanList((parsed as { platforms?: unknown }).platforms),
        budgetSignals: this.cleanList((parsed as { budgetSignals?: unknown }).budgetSignals),
        confidence: this.cleanConfidence(parsed.confidence),
        source: 'openai',
      };
    } catch {
      return undefined;
    }
  }

  private extractIntentWithRules(message: string): DiscoveryIntent {
    const normalized = this.normalizeMessage(message);
    const tokens = normalized
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !stopWords.has(token));

    return {
      originalMessage: message,
      keywords: Array.from(new Set(tokens.filter((token) => token.length >= 3))).slice(0, 10),
      colors: this.findDictionaryMatches(normalized, colorDictionary),
      styles: this.mergeUnique(
        this.findDictionaryMatches(normalized, styleDictionary),
        this.findDictionaryMatches(normalized, emotionDictionary),
      ),
      useCases: this.findDictionaryMatches(normalized, useCaseDictionary),
      platforms: this.findDictionaryMatches(normalized, platformDictionary),
      budgetSignals: this.findBudgetSignals(normalized),
      confidence: 0.55,
      source: 'rules',
    };
  }

  private extractOpenAiOutputText(data: OpenAiResponsePayload) {
    if (data.output_text) {
      return data.output_text;
    }

    return data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .find((text): text is string => Boolean(text?.trim()));
  }

  private normalizeMessage(message: string) {
    return message
      .trim()
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه');
  }

  private mergeIntent(
    context: {
      colors?: string[];
      styles?: string[];
      keywords?: string[];
      useCases?: string[];
      platforms?: string[];
      budgetSignals?: string[];
    },
    intent: DiscoveryIntent,
  ): DiscoveryIntent {
    return {
      originalMessage: intent.originalMessage,
      keywords: this.mergeUnique(context.keywords, intent.keywords).slice(0, 12),
      colors: this.mergeUnique(context.colors, intent.colors).slice(0, 6),
      styles: this.mergeUnique(context.styles, intent.styles).slice(0, 6),
      useCases: this.mergeUnique(context.useCases, intent.useCases).slice(0, 6),
      platforms: this.mergeUnique(context.platforms, intent.platforms).slice(0, 6),
      budgetSignals: this.mergeUnique(context.budgetSignals, intent.budgetSignals).slice(0, 4),
      confidence: intent.confidence,
      source: intent.source,
    };
  }

  private searchTerms(intent: DiscoveryIntent) {
    return [
      ...intent.keywords,
      ...intent.colors.flatMap((color) => colorDictionary[color] ?? [color]),
      ...intent.styles.flatMap((style) => styleDictionary[style] ?? [style]),
      ...intent.styles.flatMap((style) => emotionDictionary[style] ?? [style]),
      ...intent.useCases.flatMap((useCase) => useCaseDictionary[useCase] ?? [useCase]),
      ...intent.platforms.flatMap((platform) => platformDictionary[platform] ?? [platform]),
    ].slice(0, 20);
  }

  private async searchProducts(searchTerms: string[], limit: number, page: number) {
    const pageSize = Math.min(Math.max(limit, 1), 24);
    const safePage = Math.min(Math.max(page, 1), 100);
    const strict = await this.searchProductsPage(searchTerms, pageSize, safePage);

    if (strict.items.length || !searchTerms.length || safePage > 1) {
      return strict;
    }

    const fallback = await this.searchProductsPage([], pageSize, safePage);
    return {
      ...fallback,
      usedFallback: true,
    };
  }

  private async searchProductsPage(searchTerms: string[], pageSize: number, page: number) {
    const db = this.database.requireDb();
    const filters: SQL[] = [eq(products.status, 'published')];
    const offset = (page - 1) * pageSize;

    if (searchTerms.length) {
      filters.push(
        or(
          ...searchTerms.flatMap((term) => {
            const pattern = `%${term}%`;
            return [
              ilike(products.title, pattern),
              ilike(products.subtitle, pattern),
              ilike(products.description, pattern),
              ilike(categories.name, pattern),
              ilike(categories.slug, pattern),
              ilike(tags.name, pattern),
              ilike(tags.slug, pattern),
              ilike(productAttributes.key, pattern),
              ilike(productAttributes.value, pattern),
            ];
          }),
        )!,
      );
    }

    const matchScore = this.matchScoreSql(searchTerms).as('match_score');

    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        subtitle: products.subtitle,
        description: products.description,
        basePrice: products.basePrice,
        currency: products.currency,
        isFeatured: products.isFeatured,
        publishedAt: products.publishedAt,
        previewStorageKey: productAssets.storageKey,
        previewAltText: productAssets.altText,
        matchScore,
      })
      .from(products)
      .leftJoin(
        productAssets,
        and(
          eq(productAssets.productId, products.id),
          eq(productAssets.assetType, 'watermarked_preview'),
          eq(productAssets.isPrimary, true),
          eq(productAssets.isPublicPreview, true),
        ),
      )
      .leftJoin(productCategories, eq(productCategories.productId, products.id))
      .leftJoin(categories, eq(categories.id, productCategories.categoryId))
      .leftJoin(productTags, eq(productTags.productId, products.id))
      .leftJoin(tags, eq(tags.id, productTags.tagId))
      .leftJoin(productAttributes, eq(productAttributes.productId, products.id))
      .where(and(...filters))
      .groupBy(
        products.id,
        products.slug,
        products.title,
        products.subtitle,
        products.description,
        products.basePrice,
        products.currency,
        products.isFeatured,
        products.publishedAt,
        productAssets.storageKey,
        productAssets.altText,
      )
      .orderBy(sql`match_score desc`, desc(products.isFeatured), desc(products.publishedAt), asc(products.title))
      .limit(pageSize + 1)
      .offset(offset);

    return {
      items: await this.attachDiscoveryProductData(rows.slice(0, pageSize)),
      usedFallback: false,
      pagination: {
        page,
        pageSize,
        hasMore: rows.length > pageSize,
        returned: Math.min(rows.length, pageSize),
      },
    };
  }

  private findDictionaryMatches(message: string, dictionary: Record<string, string[]>) {
    return Object.entries(dictionary)
      .filter(
        ([key, aliases]) =>
          message.includes(this.normalizeMessage(key)) || aliases.some((alias) => message.includes(this.normalizeMessage(alias))),
      )
      .map(([key]) => key);
  }

  private matchScoreSql(terms: string[]) {
    if (!terms.length) {
      return sql<number>`0`;
    }

    const fragments = terms.map((term) => {
      const pattern = `%${term}%`;
      return sql<number>`max(case
        when ${products.title} ilike ${pattern} then 5
        when ${products.subtitle} ilike ${pattern} then 4
        when ${categories.name} ilike ${pattern} then 3
        when ${tags.name} ilike ${pattern} then 3
        when ${productAttributes.key} ilike 'dna.%' and ${productAttributes.value} ilike ${pattern} then 6
        when ${products.description} ilike ${pattern} then 2
        when ${productAttributes.value} ilike ${pattern} then 3
        else 0
      end)`;
    });

    return sql<number>`${sql.join(fragments, sql` + `)}`;
  }

  private createAssistantMessage(
    intent: DiscoveryIntent,
    count: number,
    page: number,
    usedFallback: boolean,
    items: DiscoveryProduct[] = [],
  ) {
    const parts = [
      intent.colors.length ? `colors: ${intent.colors.join(', ')}` : undefined,
      intent.styles.length ? `feeling/style: ${intent.styles.join(', ')}` : undefined,
      intent.useCases.length ? `use: ${intent.useCases.join(', ')}` : undefined,
      intent.platforms.length ? `platform: ${intent.platforms.join(', ')}` : undefined,
      intent.keywords.length ? `keywords: ${intent.keywords.slice(0, 5).join(', ')}` : undefined,
    ].filter(Boolean);

    if (!count) {
      return `I could not find a strong match yet. ${parts.length ? `I understood ${parts.join(' - ')}.` : ''} Tell me the business type, colors, and where you will use the design.`;
    }

    if (usedFallback) {
      return `I could not find an exact match, so I opened a broader set of published designs. ${parts.length ? `I still used ${parts.join(' - ')} as guidance.` : ''}`;
    }

    const topPick = items[0];
    const topReason = topPick?.match ? ` Top pick: ${topPick.title} (${topPick.match.score}%) because ${topPick.match.reason}` : '';

    return `I found ${count} close matches on page ${page}. ${parts.length ? `I matched by ${parts.join(' - ')}.` : ''}${topReason}`;
  }

  private nextQuestions(intent: DiscoveryIntent) {
    const questions: string[] = [];

    if (!intent.colors.length) {
      questions.push('Which colors should the design use?');
    }

    if (!intent.styles.length) {
      questions.push('Should it feel luxury, trusted, urgent, calm, playful, or corporate?');
    }

    if (!intent.useCases.length) {
      questions.push('Will you use it for social media, print, branding, or ecommerce?');
    }

    if (!intent.platforms.length) {
      questions.push('Which platform should it fit: Instagram, web, print, or ads?');
    }

    return questions.slice(0, 3);
  }

  private createBrief(intent: DiscoveryIntent) {
    return {
      summary: [
        intent.useCases[0] ? `${intent.useCases[0]} design` : 'Design search',
        intent.styles[0] ? `${intent.styles[0]} feeling` : undefined,
        intent.colors.length ? `${intent.colors.join(' and ')} palette` : undefined,
        intent.platforms[0] ? `for ${intent.platforms[0]}` : undefined,
      ]
        .filter(Boolean)
        .join(' - '),
      colors: intent.colors,
      styles: intent.styles,
      useCases: intent.useCases,
      platforms: intent.platforms,
      keywords: intent.keywords,
      confidence: intent.confidence,
    };
  }

  private groupResults<T extends { basePrice: string; designDna?: { moods: string[]; styles: string[] }; match?: MatchInsight }>(
    items: T[],
  ) {
    return {
      bestMatches: [...items].sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0)).slice(0, 3),
      similarMood: items.filter((item) => item.designDna?.moods.length || item.designDna?.styles.length).slice(0, 3),
      budgetPicks: [...items].sort((a, b) => Number(a.basePrice) - Number(b.basePrice)).slice(0, 3),
      premiumPicks: [...items].sort((a, b) => Number(b.basePrice) - Number(a.basePrice)).slice(0, 3),
    };
  }

  private async attachDiscoveryProductData<T extends { id: string }>(rows: T[]) {
    if (!rows.length) {
      return [];
    }

    const [attributes, licenseRows] = await Promise.all([
      this.database
        .requireDb()
        .select({
          productId: productAttributes.productId,
          key: productAttributes.key,
          value: productAttributes.value,
        })
        .from(productAttributes)
        .where(or(...rows.map((row) => eq(productAttributes.productId, row.id)))!),
      this.getLicenseRows(rows.map((row) => row.id)),
    ]);

    return rows.map((row) => ({
      ...row,
      designDna: designDnaFromAttributes(attributes.filter((attribute) => attribute.productId === row.id)),
      ...this.serializeLicenseOptions(licenseRows.filter((item) => item.productId === row.id)),
    }));
  }

  private attachMatchInsights<T extends DiscoveryProduct>(items: T[], intent: DiscoveryIntent, usedFallback: boolean) {
    return items
      .map((item, index) => ({
        ...item,
        match: this.createMatchInsight(item, intent, index, usedFallback),
      }))
      .sort((left, right) => (right.match?.score ?? 0) - (left.match?.score ?? 0));
  }

  private createMatchInsight(product: DiscoveryProduct, intent: DiscoveryIntent, index: number, usedFallback: boolean): MatchInsight {
    const dna = product.designDna;
    const colorHits = this.overlap(intent.colors, dna?.colors ?? []);
    const styleHits = this.overlap(intent.styles, [...(dna?.styles ?? []), ...(dna?.moods ?? [])]);
    const useHits = this.overlap(intent.useCases, [...(dna?.industries ?? []), ...(dna?.occasions ?? [])]);
    const platformHits = this.overlap(intent.platforms, [...(dna?.platforms ?? []), ...(dna?.formats ?? [])]);
    const keywordHits = this.keywordHits(product, intent.keywords);
    const directScore = Number(product.matchScore ?? 0);
    const license = product.defaultLicense;
    const matchedSignals = this.mergeUnique(undefined, [...useHits, ...styleHits, ...colorHits, ...platformHits, ...keywordHits]).slice(
      0,
      8,
    );
    const industryMiss = intent.useCases.length > 0 && useHits.length === 0;
    const colorMiss = intent.colors.length > 0 && colorHits.length === 0;
    const platformMiss = intent.platforms.length > 0 && platformHits.length === 0;
    const rawScore =
      54 +
      colorHits.length * 8 +
      styleHits.length * 10 +
      useHits.length * 16 +
      platformHits.length * 8 +
      keywordHits.length * 3 +
      Math.min(directScore * 1.25, 8) +
      (product.isFeatured ? 3 : 0) -
      (industryMiss ? 20 : 0) -
      (colorMiss ? 8 : 0) -
      (platformMiss ? 6 : 0) -
      (usedFallback ? 6 : 0) -
      index;
    const cappedScore = industryMiss ? Math.min(rawScore, 82) : rawScore;
    const score = Math.min(98, Math.max(usedFallback ? 56 : 62, cappedScore));
    const reason = this.matchReason({ colorHits, styleHits, useHits, platformHits, keywordHits, product });
    const confidenceLabel = score >= 86 ? 'High confidence' : score >= 72 ? 'Good confidence' : 'Needs refinement';
    const decisionTag = score >= 86 ? 'Best fit' : score >= 72 ? 'Strong fit' : 'Creative alternative';

    return {
      score: Math.round(score),
      decisionTag,
      reason,
      matchedSignals,
      reuseModel:
        license?.allowsCommercialUse && !license.allowsResale
          ? 'Reusable commercial license. The base design can be sold to multiple customers; private tailoring creates a custom version.'
          : 'Review the license before checkout. Use private tailoring if the brand needs a custom direction.',
      nextAction:
        score >= 86
          ? 'Open the product and choose the commercial license.'
          : 'Open the product, compare the preview, then refine the brief if the tone is not exact.',
      confidenceLabel,
    };
  }

  private matchReason(input: {
    colorHits: string[];
    styleHits: string[];
    useHits: string[];
    platformHits: string[];
    keywordHits: string[];
    product: DiscoveryProduct;
  }) {
    const parts = [
      input.useHits.length ? `it fits ${input.useHits.slice(0, 2).join(' and ')}` : undefined,
      input.styleHits.length ? `carries a ${input.styleHits.slice(0, 2).join(' and ')} feeling` : undefined,
      input.colorHits.length ? `uses ${input.colorHits.slice(0, 2).join(' and ')} signals` : undefined,
      input.platformHits.length ? `works for ${input.platformHits.slice(0, 2).join(' and ')}` : undefined,
      input.keywordHits.length ? `matches the words ${input.keywordHits.slice(0, 2).join(' and ')}` : undefined,
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(', ') + '.';
    }

    return `${input.product.title} is a broader premium option while the brief needs more color, industry, or platform detail.`;
  }

  private keywordHits(product: DiscoveryProduct, keywords: string[]) {
    const haystack = this.normalizeMessage(
      [product.title, product.subtitle, product.description, ...(product.designDna ? this.flattenDna(product.designDna) : [])]
        .filter(Boolean)
        .join(' '),
    );

    return keywords.filter((keyword) => haystack.includes(this.normalizeMessage(keyword))).slice(0, 5);
  }

  private overlap(left: string[], right: string[]) {
    const normalizedRight = new Set(right.map((value) => this.normalizeMessage(value)));
    return left.filter((value) => normalizedRight.has(this.normalizeMessage(value)));
  }

  private flattenDna(dna: DesignDna) {
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

  private async getLicenseRows(productIds: string[]) {
    if (!productIds.length) {
      return [];
    }

    return this.database
      .requireDb()
      .select({
        productId: productLicensePrices.productId,
        price: productLicensePrices.price,
        currency: productLicensePrices.currency,
        license: licenses,
      })
      .from(productLicensePrices)
      .innerJoin(licenses, eq(licenses.id, productLicensePrices.licenseId))
      .where(or(...productIds.map((productId) => eq(productLicensePrices.productId, productId)))!)
      .orderBy(asc(productLicensePrices.price), asc(licenses.name));
  }

  private serializeLicenseOptions(
    rows: Array<{
      price: string;
      currency: string;
      license: typeof licenses.$inferSelect;
    }>,
  ) {
    const licenseOptions = rows.map((row) => ({
      id: row.license.id,
      type: row.license.licenseType,
      name: row.license.name,
      description: row.license.description,
      price: row.price,
      currency: row.currency,
      allowsCommercialUse: row.license.allowsCommercialUse,
      allowsModification: row.license.allowsModification,
      allowsResale: row.license.allowsResale,
    }));
    const defaultLicense =
      licenseOptions.find((license) => license.type === 'full_commercial') ??
      licenseOptions.find((license) => license.allowsCommercialUse) ??
      licenseOptions[0] ??
      null;

    return { licenseOptions, defaultLicense };
  }

  private findBudgetSignals(message: string) {
    const signals: string[] = [];
    if (['cheap', 'budget', 'affordable', 'low price'].some((term) => message.includes(term))) {
      signals.push('budget');
    }
    if (['premium', 'exclusive', 'luxury', 'high end'].some((term) => message.includes(term))) {
      signals.push('premium');
    }
    return signals;
  }

  private safeLimit(value: unknown) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 8;
    }

    return Math.min(Math.max(Math.trunc(value), 1), 24);
  }

  private safePage(value: unknown) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 1;
    }

    return Math.min(Math.max(Math.trunc(value), 1), 100);
  }

  private createSessionTitle(message: string) {
    return message.trim().slice(0, 80);
  }

  private mergeUnique(existing: string[] | undefined, incoming: string[]) {
    return Array.from(new Set([...(existing ?? []), ...incoming].filter(Boolean)));
  }

  private cleanList(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    ).slice(0, 12);
  }

  private cleanConfidence(value: unknown) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0.75;
    }

    return Math.min(Math.max(value, 0), 1);
  }
}
