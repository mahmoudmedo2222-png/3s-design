type ApiBaseUrlInput = {
  configuredUrl?: string;
  windowLocation?: Pick<Location, 'hostname' | 'protocol'>;
};

export function resolveApiBaseUrl(input: ApiBaseUrlInput = {}) {
  const configuredUrl = input.configuredUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (input.windowLocation) {
    return `${input.windowLocation.protocol}//${input.windowLocation.hostname}:4000/api`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }

  return 'http://localhost:4000/api';
}

export const apiBaseUrl = resolveApiBaseUrl();

export type LicenseOption = {
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

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  basePrice: string;
  currency: string;
  isFeatured?: boolean;
  previewStorageKey: string | null;
  previewAltText: string | null;
  licenseOptions?: LicenseOption[];
  defaultLicense?: LicenseOption | null;
  designDna?: {
    industries: string[];
    styles: string[];
    moods: string[];
    colors: string[];
    platforms: string[];
    formats: string[];
    occasions: string[];
    audiences: string[];
  };
  match?: {
    score: number;
    decisionTag: 'Best fit' | 'Strong fit' | 'Creative alternative';
    reason: string;
    matchedSignals: string[];
    reuseModel: string;
    nextAction: string;
    confidenceLabel: 'High confidence' | 'Good confidence' | 'Needs refinement';
  };
};

export type ProductDetail = ProductSummary & {
  status: string;
  publishedAt: string | null;
  archivedAt: string | null;
  variants: Array<{
    id: string;
    name: string;
    description: string | null;
    fileFormats: string[];
    dimensions: Array<{ label: string; width?: number; height?: number; unit?: string }>;
    softwareCompatibility: string[];
    priceDelta: string;
    isDefault: boolean;
    sortOrder: number;
  }>;
  assets: Array<{
    id: string;
    assetType: string;
    fileName: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    altText: string | null;
    isPublicPreview: boolean;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  attributes: Array<{
    id: string;
    key: string;
    value: string;
    label: string | null;
    sortOrder: number;
  }>;
  categories: Array<{ id: string; slug: string; name: string }>;
  tags: Array<{ id: string; slug: string; name: string }>;
};

export type ProductListResponse = {
  items: ProductSummary[];
  limit: number;
  offset: number;
};

export type AiDiscoveryResponse = {
  sessionId: string;
  assistantMessage: string;
  intent: {
    keywords: string[];
    colors: string[];
    styles: string[];
    useCases: string[];
    platforms?: string[];
    budgetSignals?: string[];
    confidence?: number;
    source?: string;
  };
  brief: {
    summary: string;
    colors: string[];
    styles: string[];
    useCases: string[];
    platforms: string[];
    keywords: string[];
    confidence: number;
  };
  items: ProductSummary[];
  groups: {
    bestMatches: ProductSummary[];
    similarMood: ProductSummary[];
    budgetPicks: ProductSummary[];
    premiumPicks: ProductSummary[];
  };
  pagination: {
    page: number;
    pageSize: number;
    hasMore: boolean;
    returned: number;
  };
  nextQuestions: string[];
};

export type AiDiscoveryStatus = {
  openAiConfigured: boolean;
  mode: 'openai' | 'rules';
  model: string | null;
  privacy: string;
  capabilities: {
    arabicIntent: boolean;
    emotionalSearch: boolean;
    paginatedResults: boolean;
    savedSessionContext: boolean;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isEmailVerified?: boolean;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  emailVerificationRequired?: boolean;
  devEmailVerificationToken?: string;
};

export type PasswordResetRequestResponse = {
  sent: true;
  devPasswordResetToken?: string;
};

export type EmailVerificationRequestResponse = {
  sent: true;
  devEmailVerificationToken?: string;
};

export type CartResponse = {
  cart: {
    id: string;
    userId: string;
    currency: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    total: string;
    product: {
      id: string;
      slug: string;
      title: string;
    };
    variant: {
      id: string;
      name: string;
    } | null;
    license: {
      id: string;
      type: string;
      name: string;
    };
  }>;
  totals: {
    subtotal: string;
    discountTotal: string;
    taxTotal: string;
    total: string;
    currency: string;
  };
};

export type OrderResponse = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  items?: Array<{
    id: string;
    productSnapshot: Record<string, unknown>;
    licenseSnapshot: Record<string, unknown>;
    unitPrice: string;
    quantity: number;
    total: string;
  }>;
};

export type PaymentSession = {
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

export type PaymentProviderReadiness = {
  provider: 'manual' | 'paypal' | 'paymob' | 'fawry';
  configured: boolean;
  mode: 'manual_review' | 'provider_checkout';
  missing: string[];
};

export type UserPayment = {
  payment: PaymentSession;
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
};

export type DownloadEntitlement = {
  id: string;
  product: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
  };
  license: {
    id: string;
    type: string;
    name: string;
  };
  order: {
    id: string;
    orderNumber: string;
    paidAt: string | null;
  };
  isActive: boolean;
  expiresAt: string | null;
  maxDownloads: number;
  downloadsUsed: number;
  downloadsRemaining: number;
  hourlyDownloadsRemaining: number;
  assets: Array<{
    id: string;
    assetType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    variantId: string | null;
    sortOrder: number;
  }>;
};

export type DownloadUrlResponse = {
  assetId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
  expiresIn: number;
  method: 'GET';
  downloadsRemaining: number;
  hourlyDownloadsRemaining: number;
};

export async function fetchProducts() {
  try {
    const response = await fetch(`${apiBaseUrl}/products?limit=12&offset=0`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return { items: [], limit: 12, offset: 0 } satisfies ProductListResponse;
    }

    return (await response.json()) as ProductListResponse;
  } catch {
    return { items: [], limit: 12, offset: 0 } satisfies ProductListResponse;
  }
}

export async function fetchBestSellers() {
  try {
    const response = await fetch(`${apiBaseUrl}/products/best-sellers?limit=6`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { items: [], limit: 6 };
    }

    return (await response.json()) as { items: ProductSummary[]; limit: number };
  } catch {
    return { items: [], limit: 6 };
  }
}

export async function fetchProductBySlug(slug: string) {
  try {
    const response = await fetch(`${apiBaseUrl}/products/${slug}`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ProductDetail;
  } catch {
    return null;
  }
}

export async function sendAiDiscoveryMessage(input: { message: string; sessionId?: string; limit?: number; page?: number }) {
  const response = await fetch(`${apiBaseUrl}/ai/discovery/suggest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: input.message,
      sessionId: input.sessionId,
      limit: input.limit ?? 8,
      page: input.page ?? 1,
    }),
  });

  if (!response.ok) {
    throw new Error('AI discovery request failed');
  }

  return (await response.json()) as AiDiscoveryResponse;
}

export async function fetchAiDiscoveryStatus() {
  const response = await fetch(`${apiBaseUrl}/ai/discovery/status`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('AI discovery status request failed');
  }

  return (await response.json()) as AiDiscoveryStatus;
}

async function sendAuthRequest(path: 'login' | 'register', body: Record<string, string>) {
  const response = await fetch(`${apiBaseUrl}/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message || 'Authentication request failed';

    throw new Error(message);
  }

  return (await response.json()) as AuthResponse;
}

export function loginCustomer(input: { email: string; password: string }) {
  return sendAuthRequest('login', input);
}

export function registerCustomer(input: { fullName: string; email: string; password: string }) {
  return sendAuthRequest('register', input);
}

export async function requestPasswordReset(input: { email: string }) {
  const response = await fetch(`${apiBaseUrl}/auth/password/reset/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message || 'Password reset request failed';
    throw new Error(message);
  }

  return (await response.json()) as PasswordResetRequestResponse;
}

export async function resetPassword(input: { token: string; password: string }) {
  const response = await fetch(`${apiBaseUrl}/auth/password/reset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message || 'Password reset failed';
    throw new Error(message);
  }

  return (await response.json()) as { reset: true };
}

export function requestEmailVerification() {
  return sendCustomerRequest<EmailVerificationRequestResponse>('/auth/email/verification/request', {
    method: 'POST',
    body: {},
  });
}

export async function verifyEmail(input: { token: string }) {
  const response = await fetch(`${apiBaseUrl}/auth/email/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message || 'Email verification failed';
    throw new Error(message);
  }

  return (await response.json()) as { verified: true };
}

function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('3s-design-access-token');
}

async function sendCustomerRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    token?: string | null;
  } = {},
) {
  const token = options.token ?? getStoredAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || `Request failed with ${response.status}`;

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function fetchCart() {
  return sendCustomerRequest<CartResponse>('/cart');
}

export function addCartItem(input: { productId: string; variantId?: string; licenseId: string }) {
  return sendCustomerRequest<CartResponse['items'][number]>('/cart/items', {
    method: 'POST',
    body: input,
  });
}

export function removeCartItem(itemId: string) {
  return sendCustomerRequest<{ removed: boolean }>(`/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

export type CheckoutAttributionInput = {
  source?: string | null;
  campaign?: string | null;
  medium?: string | null;
  intent?: string | null;
  brief?: string | null;
  referrer?: string | null;
  landingPath?: string | null;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
};

export function createCheckoutOrder(input: { idempotencyKey: string; attribution?: CheckoutAttributionInput | null }) {
  return sendCustomerRequest<OrderResponse>('/checkout', {
    method: 'POST',
    body: {
      idempotencyKey: input.idempotencyKey,
      billing: {
        country: 'EG',
        preferredCurrency: 'USD',
      },
      attribution: input.attribution ?? undefined,
    },
  });
}

export function createPaymentSession(input: {
  orderId: string;
  provider?: 'manual' | 'paypal' | 'paymob' | 'fawry';
  idempotencyKey: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  return sendCustomerRequest<PaymentSession>('/payments/sessions', {
    method: 'POST',
    body: {
      provider: input.provider ?? 'manual',
      orderId: input.orderId,
      idempotencyKey: input.idempotencyKey,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    },
  });
}

export function fetchPaymentProviderReadiness() {
  return sendCustomerRequest<{ items: PaymentProviderReadiness[] }>('/payments/providers');
}

export function fetchOrders() {
  return sendCustomerRequest<{ items: OrderResponse[] }>('/orders');
}

export function fetchPayments() {
  return sendCustomerRequest<{ items: UserPayment[] }>('/payments');
}

export function fetchDownloads() {
  return sendCustomerRequest<{ items: DownloadEntitlement[] }>('/downloads');
}

export function createDownloadUrl(entitlementId: string, assetId: string) {
  return sendCustomerRequest<DownloadUrlResponse>(`/downloads/${entitlementId}/assets/${assetId}/url`, {
    method: 'POST',
    body: {},
  });
}
