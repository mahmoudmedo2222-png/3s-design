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
  missing: Array<{ key: string; message: string }>;
};

export type CatalogItem = {
  id: string;
  slug?: string;
  name: string;
  description?: string | null;
  licenseType?: string;
};

export type LoginResponse = {
  user: AdminUser;
  accessToken: string;
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
  ]).then(([categories, tags, licenses]) => ({ categories, tags, licenses }));
}
