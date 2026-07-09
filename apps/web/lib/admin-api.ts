import { apiBaseUrl } from './api';

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  status: string;
  basePrice: string;
  currency: string;
  isFeatured: boolean;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublishingCheck = {
  key: string;
  passed: boolean;
  message: string;
};

export type PublishingChecksResponse = {
  productId: string;
  canPublish: boolean;
  checks: PublishingCheck[];
  quality: {
    score: number;
    grade: string;
    signals: Array<{
      key: string;
      label: string;
      passed: boolean;
      weight: number;
      message: string;
    }>;
  };
  designDna: {
    industries: string[];
    styles: string[];
    moods: string[];
    colors: string[];
    platforms: string[];
    formats: string[];
    occasions: string[];
    audiences: string[];
  };
  designDnaReadiness: {
    ready: boolean;
    score: number;
    groups: Array<{
      key: string;
      label: string;
      passed: boolean;
      values: string[];
      message: string;
    }>;
    missing: Array<{ key: string; label: string; message: string }>;
  };
  current: {
    licensePrices: Array<{
      id: string;
      licenseId: string;
      price: string;
      currency: string;
    }>;
    categoryIds: string[];
    tagIds: string[];
    assets: Array<{
      id: string;
      assetType: string;
      storageKey: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      assetStatus: string;
      scanStatus: string;
      isPrimary: boolean;
      isPublicPreview: boolean;
      sortOrder: number;
    }>;
  };
  missing: Array<{ key: string; message: string }>;
};

export type CatalogItem = {
  id: string;
  slug?: string;
  name: string;
  description?: string | null;
  licenseType?: string;
};

export type CatalogResponse = {
  categories: { items: CatalogItem[] };
  tags: { items: CatalogItem[] };
  licenses: { items: CatalogItem[] };
};

export type LoginResponse = {
  user: AdminUser;
  accessToken: string;
};

export type AdminPaymentProviderReadiness = {
  provider: 'manual' | 'paypal' | 'paymob' | 'fawry';
  configured: boolean;
  mode: 'manual_review' | 'provider_checkout';
  missing: string[];
};

export type AdminPaymentRow = {
  payment: {
    id: string;
    orderId: string;
    provider: string;
    status: string;
    providerPaymentId: string | null;
    amount: string;
    currency: string;
    redirectUrl: string | null;
    mode: 'manual_review' | 'provider_checkout';
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: string;
    currency: string;
    billingSnapshot?: {
      attribution?: {
        source?: string | null;
        campaign?: string | null;
        medium?: string | null;
        intent?: string | null;
        brief?: string | null;
        referrer?: string | null;
        landingPath?: string | null;
        firstSeenAt?: string | null;
        lastSeenAt?: string | null;
      } | null;
    } | null;
    createdAt: string;
    paidAt: string | null;
  };
  customer: {
    id: string;
    email: string;
    fullName: string;
  };
};

export type AdminAnalyticsSummary = {
  window: {
    days: number;
    since: string;
  };
  totals: {
    events: number;
    productViews: number;
    searches: number;
    cartAdds: number;
    checkoutAttempts: number;
    ordersCreated: number;
    downloadsRequested: number;
  };
  conversion: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToOrder: number;
    orderToDownload: number;
  };
  counts: Array<{ eventName: string; count: number }>;
  topSearches: Array<{ query: string; count: number }>;
  topProducts: Array<{ slug: string; title: string | null; count: number }>;
  attribution: AdminAttributionBreakdown;
  recentEvents: Array<{
    id: string;
    eventName: string;
    path: string;
    payload: Record<string, string | number | boolean | null>;
    createdAt: string;
  }>;
};

export type AdminAttributionBreakdown = {
  sources: Array<{ value: string; count: number }>;
  campaigns: Array<{ value: string; count: number }>;
  intents: Array<{ value: string; count: number }>;
  briefs: Array<{ value: string; count: number }>;
};

export type AdminProductAnalyticsSummary = {
  product: {
    id: string;
    slug: string;
  };
  window: {
    days: number;
    since: string;
  };
  totals: {
    events: number;
    resultClicks: number;
    productViews: number;
    licenseSelections: number;
    cartAttempts: number;
    cartAdds: number;
    ordersCreated: number;
    paidOrders: number;
    quantitySold: number;
    revenue: string;
    entitlements: number;
    downloads: number;
  };
  conversion: {
    clickToView: number;
    viewToLicenseSelection: number;
    viewToCart: number;
    cartAttemptSuccess: number;
    cartToOrder: number;
    orderToPaid: number;
    paidToDownload: number;
  };
  counts: Array<{ eventName: string; count: number }>;
  searchTerms: Array<{ query: string; count: number }>;
  licensePicks: Array<{ licenseId: string; licenseName: string | null; count: number }>;
  attribution: AdminAttributionBreakdown;
  recentEvents: Array<{
    id: string;
    eventName: string;
    path: string;
    payload: Record<string, string | number | boolean | null>;
    createdAt: string;
  }>;
  recommendation: string;
};

type RequestOptions = {
  token?: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
};

export async function adminRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function loginAdmin(input: { email: string; password: string }) {
  return adminRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: input,
  });
}

export function fetchAdminProducts(token: string) {
  return adminRequest<{ items: AdminProduct[] }>('/admin/products', { token });
}

export function fetchAdminPaymentProviderReadiness(token: string) {
  return adminRequest<{ items: AdminPaymentProviderReadiness[] }>('/payments/providers', { token });
}

export function fetchAdminPayments(token: string) {
  return adminRequest<{ items: AdminPaymentRow[] }>('/admin/payments', { token });
}

export function fetchAdminAnalyticsSummary(token: string, days = 7) {
  return adminRequest<AdminAnalyticsSummary>(`/admin/analytics/summary?days=${days}`, { token });
}

export function fetchAdminProductAnalyticsSummary(token: string, product: { id: string; slug: string }, days = 7) {
  return adminRequest<AdminProductAnalyticsSummary>(
    `/admin/analytics/products/${product.id}/summary?slug=${encodeURIComponent(product.slug)}&days=${days}`,
    { token },
  );
}

export function markAdminPaymentPaid(token: string, paymentId: string, input: { adminPassword: string; providerPaymentId?: string }) {
  return adminRequest<unknown>(`/admin/payments/${paymentId}/mark-paid`, {
    token,
    method: 'POST',
    body: input,
  });
}

export function markAdminPaymentFailed(token: string, paymentId: string) {
  return adminRequest<unknown>(`/admin/payments/${paymentId}/mark-failed`, {
    token,
    method: 'POST',
    body: {},
  });
}

export function createAdminProduct(
  token: string,
  input: {
    title: string;
    slug: string;
    subtitle?: string;
    description: string;
    basePrice: string;
    currency: string;
    status: string;
    isFeatured: boolean;
  },
) {
  return adminRequest<AdminProduct>('/admin/products', {
    token,
    method: 'POST',
    body: input,
  });
}

export function updateAdminProduct(
  token: string,
  productId: string,
  input: Partial<Pick<AdminProduct, 'title' | 'slug' | 'subtitle' | 'description' | 'basePrice' | 'currency' | 'status' | 'isFeatured'>>,
) {
  return adminRequest<AdminProduct>(`/admin/products/${productId}`, {
    token,
    method: 'PATCH',
    body: input,
  });
}

export function fetchPublishingChecks(token: string, productId: string) {
  return adminRequest<PublishingChecksResponse>(`/admin/products/${productId}/publishing-checks`, {
    token,
  });
}

export function publishProduct(token: string, productId: string) {
  return adminRequest<AdminProduct>(`/admin/products/${productId}/publish`, {
    token,
    method: 'POST',
  });
}

export function unpublishProduct(token: string, productId: string) {
  return adminRequest<AdminProduct>(`/admin/products/${productId}/unpublish`, {
    token,
    method: 'POST',
  });
}

export function fetchCatalog(token: string) {
  return Promise.all([
    adminRequest<{ items: CatalogItem[] }>('/admin/catalog/categories', { token }),
    adminRequest<{ items: CatalogItem[] }>('/admin/catalog/tags', { token }),
    adminRequest<{ items: CatalogItem[] }>('/admin/catalog/licenses', { token }),
  ]).then(([categories, tags, licenses]) => ({ categories, tags, licenses }) satisfies CatalogResponse);
}

export function setProductLicensePrices(
  token: string,
  productId: string,
  prices: Array<{ licenseId: string; price: string; currency: string }>,
) {
  return adminRequest<{ productId: string; prices: Array<{ licenseId: string; price: string; currency: string }> }>(
    `/admin/products/${productId}/license-prices`,
    {
      token,
      method: 'PUT',
      body: { prices },
    },
  );
}

export function setProductCategories(token: string, productId: string, categoryIds: string[]) {
  return adminRequest<{ productId: string; categoryIds: string[] }>(`/admin/products/${productId}/categories`, {
    token,
    method: 'PUT',
    body: { categoryIds },
  });
}

export function setProductTags(token: string, productId: string, tagIds: string[]) {
  return adminRequest<{ productId: string; tagIds: string[] }>(`/admin/products/${productId}/tags`, {
    token,
    method: 'PUT',
    body: { tagIds },
  });
}

export function createProductAsset(
  token: string,
  productId: string,
  input: {
    assetType: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    assetStatus: string;
    scanStatus: string;
    altText?: string;
    isPrimary: boolean;
    isPublicPreview: boolean;
    sortOrder: number;
  },
) {
  return adminRequest<unknown>(`/admin/products/${productId}/assets`, {
    token,
    method: 'POST',
    body: input,
  });
}

export type AssetUploadUrlResponse = {
  storageKey: string;
  suggestedAssetStatus: string;
  suggestedScanStatus: string;
  uploadUrl: string;
  expiresIn: number;
  method: 'PUT';
  headers: Record<string, string>;
  checksum?: string;
  publicUrl?: string;
};

export function createAssetUploadUrl(
  token: string,
  input: {
    productId: string;
    assetType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    checksum?: string;
  },
) {
  return adminRequest<AssetUploadUrlResponse>('/admin/assets/upload-url', {
    token,
    method: 'POST',
    body: input,
  });
}

export function createProductAttribute(
  token: string,
  productId: string,
  input: {
    key: string;
    value: string;
    label?: string;
    sortOrder: number;
  },
) {
  return adminRequest<unknown>(`/admin/products/${productId}/attributes`, {
    token,
    method: 'POST',
    body: input,
  });
}
