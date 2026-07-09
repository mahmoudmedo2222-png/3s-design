'use client';

import {
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  CreditCard,
  Eye,
  FileCheck2,
  FolderTree,
  Gauge,
  Loader2,
  Lock,
  LogOut,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { fetchAiDiscoveryStatus, type AiDiscoveryStatus } from '../lib/api';
import { ThemeToggle } from './theme-toggle';
import {
  AdminPaymentRow,
  AdminPaymentProviderReadiness,
  AdminAnalyticsSummary,
  AdminProduct,
  AdminProductAnalyticsSummary,
  AdminRefundRow,
  AdminUser,
  CatalogResponse,
  approveAdminRefund,
  createAdminProduct,
  createAssetUploadUrl,
  fetchAdminPaymentProviderReadiness,
  fetchAdminPayments,
  fetchAdminRefunds,
  createProductAsset,
  createProductAttribute,
  fetchAdminAnalyticsSummary,
  fetchAdminProductAnalyticsSummary,
  fetchAdminProducts,
  fetchCatalog,
  fetchPublishingChecks,
  loginAdmin,
  markAdminPaymentFailed,
  markAdminPaymentPaid,
  publishProduct,
  reconcileStaleAdminPayments,
  rejectAdminRefund,
  PublishingChecksResponse,
  setProductCategories,
  setProductLicensePrices,
  setProductTags,
  unpublishProduct,
  updateAdminProduct,
} from '../lib/admin-api';

type AdminSession = {
  user: AdminUser;
  token: string;
};

type ProductForm = {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  basePrice: string;
  currency: string;
  isFeatured: boolean;
};

type AssetForm = {
  assetType: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  assetStatus: string;
  scanStatus: string;
  altText: string;
  isPrimary: boolean;
  isPublicPreview: boolean;
};

type AttributeForm = {
  key: string;
  value: string;
  label: string;
};

const emptyProductForm: ProductForm = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  basePrice: '25.00',
  currency: 'USD',
  isFeatured: false,
};

const emptyAssetForm: AssetForm = {
  assetType: 'watermarked_preview',
  storageKey: '',
  fileName: '',
  mimeType: 'image/png',
  fileSize: '2048',
  assetStatus: 'ready',
  scanStatus: 'skipped',
  altText: '',
  isPrimary: true,
  isPublicPreview: true,
};

const emptyAttributeForm: AttributeForm = {
  key: 'dna.industry',
  value: '',
  label: '',
};

const sessionStorageKey = '3s-design-admin-session';

export function AdminDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [checks, setChecks] = useState<PublishingChecksResponse | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [paymentReadiness, setPaymentReadiness] = useState<AdminPaymentProviderReadiness[]>([]);
  const [adminPayments, setAdminPayments] = useState<AdminPaymentRow[]>([]);
  const [adminRefunds, setAdminRefunds] = useState<AdminRefundRow[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AdminAnalyticsSummary | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<AdminProductAnalyticsSummary | null>(null);
  const [aiStatus, setAiStatus] = useState<AiDiscoveryStatus | null>(null);
  const [catalogCounts, setCatalogCounts] = useState({ categories: 0, tags: 0, licenses: 0 });
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [editForm, setEditForm] = useState<ProductForm>(emptyProductForm);
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [attributeForm, setAttributeForm] = useState<AttributeForm>(emptyAttributeForm);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [licensePrices, setLicensePrices] = useState<Record<string, string>>({});
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});
  const [paymentAdminPasswords, setPaymentAdminPasswords] = useState<Record<string, string>>({});
  const [paymentReconcilePassword, setPaymentReconcilePassword] = useState('');
  const [refundAdminPasswords, setRefundAdminPasswords] = useState<Record<string, string>>({});
  const [refundNotes, setRefundNotes] = useState<Record<string, string>>({});
  const [refundProviderRefs, setRefundProviderRefs] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = window.localStorage.getItem(sessionStorageKey);
    if (!stored) {
      return;
    }

    try {
      setSession(JSON.parse(stored) as AdminSession);
    } catch {
      window.localStorage.removeItem(sessionStorageKey);
    }
  }, []);

  useEffect(() => {
    if (session) {
      void refreshAdminData(session.token);
    }
    // refreshAdminData reads the current selected product state during the same render.
    // Re-running this effect for every table selection would trigger unnecessary API refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? products[0] ?? null,
    [products, selectedProductId],
  );

  useEffect(() => {
    if (!selectedProduct) {
      setEditForm(emptyProductForm);
      return;
    }

    setEditForm({
      title: selectedProduct.title,
      slug: selectedProduct.slug,
      subtitle: selectedProduct.subtitle ?? '',
      description: selectedProduct.description,
      basePrice: selectedProduct.basePrice,
      currency: selectedProduct.currency,
      isFeatured: selectedProduct.isFeatured,
    });
  }, [selectedProduct]);

  useEffect(() => {
    if (!checks?.current) {
      return;
    }

    setSelectedCategoryIds(checks.current.categoryIds);
    setSelectedTagIds(checks.current.tagIds);
    setLicensePrices(Object.fromEntries(checks.current.licensePrices.map((price) => [price.licenseId, price.price])));
  }, [checks]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return products;
    }

    return products.filter((product) =>
      [product.title, product.slug, product.status, product.currency].join(' ').toLowerCase().includes(normalized),
    );
  }, [products, query]);

  const stats = useMemo(() => {
    const published = products.filter((product) => product.status === 'published').length;
    const draft = products.filter((product) => product.status === 'draft').length;
    const featured = products.filter((product) => product.isFeatured).length;

    return { total: products.length, published, draft, featured };
  }, [products]);

  const launchReadiness = useMemo(() => {
    const livePayments = paymentReadiness.filter((provider) => provider.provider !== 'manual');
    const configuredLivePayments = livePayments.filter((provider) => provider.configured);
    const selectedCanPublish = checks?.canPublish ?? false;
    const selectedQualityScore = checks?.quality.score ?? 0;
    const hasDeliveryAsset = Boolean(
      checks?.current.assets.some((asset) => asset.assetType === 'delivery_zip' || asset.assetType === 'source_file'),
    );
    const hasPreviewAsset = Boolean(
      checks?.current.assets.some(
        (asset) => asset.isPublicPreview || asset.assetType === 'watermarked_preview' || asset.assetType === 'preview',
      ),
    );

    return [
      {
        key: 'published-products',
        label: 'Published catalog',
        passed: stats.published > 0,
        value: `${stats.published} live`,
        detail: stats.published > 0 ? 'Customers have sellable designs to browse.' : 'Publish at least one production-ready design.',
      },
      {
        key: 'selected-product',
        label: 'Selected product readiness',
        passed: selectedCanPublish && selectedQualityScore >= 70,
        value: selectedProduct ? `${selectedQualityScore}/100` : 'No product',
        detail: selectedProduct
          ? selectedCanPublish
            ? 'The selected product passes publishing checks.'
            : 'Fix the selected product checks before relying on it in launch demos.'
          : 'Create or select a product to inspect launch quality.',
      },
      {
        key: 'delivery-assets',
        label: 'Preview and delivery assets',
        passed: hasPreviewAsset && hasDeliveryAsset,
        value: `${checks?.current.assets.length ?? 0} assets`,
        detail:
          hasPreviewAsset && hasDeliveryAsset
            ? 'Preview and delivery files are represented.'
            : 'Each sellable design needs a watermarked preview and a delivery/source asset.',
      },
      {
        key: 'ai-discovery',
        label: 'AI discovery',
        passed: Boolean(aiStatus),
        value: aiStatus ? aiStatus.mode : 'Unknown',
        detail: aiStatus
          ? aiStatus.mode === 'openai'
            ? 'OpenAI-backed matching is active.'
            : 'Rule fallback is active; enable OpenAI billing for smarter matching.'
          : 'AI status could not be loaded.',
      },
      {
        key: 'payments',
        label: 'Real payment providers',
        passed: configuredLivePayments.length > 0,
        value: `${configuredLivePayments.length}/${livePayments.length || 3} ready`,
        detail:
          configuredLivePayments.length > 0
            ? 'At least one live checkout provider is configured.'
            : 'Manual review works, but Paymob/Fawry/PayPal need keys before real checkout.',
      },
    ];
  }, [aiStatus, checks, paymentReadiness, selectedProduct, stats.published]);

  async function refreshAdminData(token = session?.token) {
    if (!token) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const [
        productsResponse,
        catalogResponse,
        paymentResponse,
        adminPaymentsResponse,
        adminRefundsResponse,
        analyticsResponse,
        aiResponse,
      ] = await Promise.all([
        fetchAdminProducts(token),
        fetchCatalog(token),
        fetchAdminPaymentProviderReadiness(token),
        fetchAdminPayments(token),
        fetchAdminRefunds(token),
        fetchAdminAnalyticsSummary(token).catch(() => null),
        fetchAiDiscoveryStatus().catch(() => null),
      ]);

      setProducts(productsResponse.items);
      setCatalog(catalogResponse);
      setPaymentReadiness(paymentResponse.items);
      setAdminPayments(adminPaymentsResponse.items);
      setAdminRefunds(adminRefundsResponse.items);
      setAnalyticsSummary(analyticsResponse);
      setAiStatus(aiResponse);
      setCatalogCounts({
        categories: catalogResponse.categories.items.length,
        tags: catalogResponse.tags.items.length,
        licenses: catalogResponse.licenses.items.length,
      });

      const nextSelectedId =
        selectedProductId && productsResponse.items.some((product) => product.id === selectedProductId)
          ? selectedProductId
          : (productsResponse.items[0]?.id ?? null);

      setSelectedProductId(nextSelectedId);

      if (nextSelectedId) {
        setChecks(await fetchPublishingChecks(token, nextSelectedId));
        const nextProduct = productsResponse.items.find((product) => product.id === nextSelectedId);
        setProductAnalytics(nextProduct ? await fetchAdminProductAnalyticsSummary(token, nextProduct).catch(() => null) : null);
      } else {
        setChecks(null);
        setProductAnalytics(null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Admin data refresh failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    try {
      const response = await loginAdmin({ email, password });
      if (response.user.role !== 'admin') {
        throw new Error('This account does not have admin access');
      }

      const nextSession = { user: response.user, token: response.accessToken };
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
      setSession(nextSession);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const created = await createAdminProduct(session.token, {
        ...form,
        status: 'draft',
      });

      setForm(emptyProductForm);
      setSelectedProductId(created.id);
      setMessage('Product draft created');
      await refreshAdminData(session.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Product creation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckProduct(productId: string) {
    if (!session) {
      return;
    }

    const product = products.find((item) => item.id === productId);
    setSelectedProductId(productId);
    const [nextChecks, nextAnalytics] = await Promise.all([
      fetchPublishingChecks(session.token, productId),
      product ? fetchAdminProductAnalyticsSummary(session.token, product).catch(() => null) : Promise.resolve(null),
    ]);
    setChecks(nextChecks);
    setProductAnalytics(nextAnalytics);
  }

  async function handlePublish(product: AdminProduct) {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (product.status === 'published') {
        await unpublishProduct(session.token, product.id);
        setMessage('Product moved back to draft');
      } else {
        await publishProduct(session.token, product.id);
        setMessage('Product published');
      }

      await refreshAdminData(session.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Publish action failed');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(sessionStorageKey);
    setSession(null);
    setProducts([]);
    setChecks(null);
  }

  function updateForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateEditForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function updateAssetForm<K extends keyof AssetForm>(key: K, value: AssetForm[K]) {
    setAssetForm((current) => ({ ...current, [key]: value }));
  }

  function updateAttributeForm<K extends keyof AttributeForm>(key: K, value: AttributeForm[K]) {
    setAttributeForm((current) => ({ ...current, [key]: value }));
  }

  async function handleUpdateSelectedProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedProduct) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await updateAdminProduct(session.token, selectedProduct.id, {
        ...editForm,
        status: selectedProduct.status,
      });
      setMessage('Product details updated');
      await refreshAdminData(session.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Product update failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLicensePrices() {
    if (!session || !selectedProduct || !catalog) {
      return;
    }

    const prices = catalog.licenses.items
      .map((license) => ({
        licenseId: license.id,
        price: licensePrices[license.id] || selectedProduct.basePrice,
        currency: selectedProduct.currency,
      }))
      .filter((price) => Number(price.price) > 0);

    setLoading(true);
    setMessage(null);

    try {
      await setProductLicensePrices(session.token, selectedProduct.id, prices);
      setMessage('License prices saved');
      await handleCheckProduct(selectedProduct.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'License prices failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDiscoveryLinks() {
    if (!session || !selectedProduct) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await Promise.all([
        setProductCategories(session.token, selectedProduct.id, selectedCategoryIds),
        setProductTags(session.token, selectedProduct.id, selectedTagIds),
      ]);
      setMessage('Categories and tags saved');
      await handleCheckProduct(selectedProduct.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Discovery links failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedProduct) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      let uploadStorageKey = assetForm.storageKey;
      let assetStatus = assetForm.assetStatus;
      let scanStatus = assetForm.scanStatus;
      let mimeType = assetForm.mimeType;
      let fileSize = Number(assetForm.fileSize);
      let fileName = assetForm.fileName;

      if (assetFile) {
        fileName = assetFile.name;
        mimeType = assetFile.type || assetForm.mimeType;
        fileSize = assetFile.size;

        const upload = await createAssetUploadUrl(session.token, {
          productId: selectedProduct.id,
          assetType: assetForm.assetType,
          fileName,
          mimeType,
          fileSize,
        });

        const uploadResponse = await fetch(upload.uploadUrl, {
          method: upload.method,
          headers: upload.headers,
          body: assetFile,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed with ${uploadResponse.status}`);
        }

        uploadStorageKey = upload.storageKey;
        assetStatus = upload.suggestedAssetStatus;
        scanStatus = upload.suggestedScanStatus;
      }

      if (!uploadStorageKey) {
        throw new Error('Storage key is required when no file upload is available.');
      }

      await createProductAsset(session.token, selectedProduct.id, {
        ...assetForm,
        storageKey: uploadStorageKey,
        fileName,
        mimeType,
        fileSize,
        assetStatus,
        scanStatus,
        sortOrder: 0,
        altText: assetForm.altText || undefined,
      });
      setAssetForm(emptyAssetForm);
      setAssetFile(null);
      setMessage('Asset metadata attached');
      await handleCheckProduct(selectedProduct.id);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message}. If storage is not configured locally, leave file empty and enter a known dev storageKey manually.`
          : 'Asset creation failed',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAttribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedProduct) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await createProductAttribute(session.token, selectedProduct.id, {
        key: attributeForm.key,
        value: attributeForm.value,
        label: attributeForm.label || undefined,
        sortOrder: 0,
      });
      setAttributeForm(emptyAttributeForm);
      setMessage('Design DNA attribute added');
      await handleCheckProduct(selectedProduct.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Attribute creation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaymentPaid(paymentId: string) {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await markAdminPaymentPaid(session.token, paymentId, {
        adminPassword: paymentAdminPasswords[paymentId] ?? '',
        providerPaymentId: paymentRefs[paymentId]?.trim() || undefined,
      });
      setMessage('Payment approved. Delivery vault access is now unlocked for the customer.');
      setPaymentRefs((current) => {
        const next = { ...current };
        delete next[paymentId];
        return next;
      });
      setPaymentAdminPasswords((current) => {
        const next = { ...current };
        delete next[paymentId];
        return next;
      });
      await refreshAdminData(session.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment approval failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaymentFailed(paymentId: string) {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await markAdminPaymentFailed(session.token, paymentId);
      setMessage('Payment marked as failed. Customer downloads remain locked.');
      await refreshAdminData(session.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment failure update failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleReconcileStalePayments() {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await reconcileStaleAdminPayments(session.token, {
        adminPassword: paymentReconcilePassword,
      });
      setPaymentReconcilePassword('');
      setMessage(
        result.expired
          ? `${result.expired} stale payment session${result.expired === 1 ? '' : 's'} expired.`
          : 'No stale pending payments found.',
      );
      await refreshAdminData(session.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment reconciliation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveRefund(refundRequestId: string) {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await approveAdminRefund(session.token, refundRequestId, {
        adminPassword: refundAdminPasswords[refundRequestId] ?? '',
        adminNote: refundNotes[refundRequestId]?.trim() || undefined,
        providerRefundId: refundProviderRefs[refundRequestId]?.trim() || undefined,
      });
      clearRefundResolutionInputs(refundRequestId);
      setMessage('Refund approved. Order access has been revoked and the request is closed.');
      await refreshAdminData(session.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Refund approval failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRejectRefund(refundRequestId: string) {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await rejectAdminRefund(session.token, refundRequestId, {
        adminPassword: refundAdminPasswords[refundRequestId] ?? '',
        adminNote: refundNotes[refundRequestId]?.trim() || undefined,
      });
      clearRefundResolutionInputs(refundRequestId);
      setMessage('Refund request rejected and kept on record.');
      await refreshAdminData(session.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Refund rejection failed');
    } finally {
      setLoading(false);
    }
  }

  function clearRefundResolutionInputs(refundRequestId: string) {
    setRefundAdminPasswords((current) => {
      const next = { ...current };
      delete next[refundRequestId];
      return next;
    });
    setRefundNotes((current) => {
      const next = { ...current };
      delete next[refundRequestId];
      return next;
    });
    setRefundProviderRefs((current) => {
      const next = { ...current };
      delete next[refundRequestId];
      return next;
    });
  }

  if (!session) {
    return (
      <main className="admin-dashboard min-h-screen bg-[#f5f7f5] dark:bg-[#0b0f0e]">
        <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
          <div className="premium-panel overflow-hidden">
            <div className="border-b border-white/10 bg-ink p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded bg-white/10">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase text-white/60">3S Design</p>
                  <h1 className="text-xl font-semibold">Admin access</h1>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded bg-pine/10 text-pine">
                  <Lock size={20} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted">Secure session</p>
                  <h2 className="text-base font-semibold text-ink">Control workspace</h2>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Email</span>
                  <input
                    name="email"
                    type="email"
                    placeholder="admin@yourdomain.com"
                    className="premium-control mt-1 h-11 w-full bg-white px-3 text-sm text-ink"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Password</span>
                  <input
                    name="password"
                    type="password"
                    placeholder="Enter admin password"
                    className="premium-control mt-1 h-11 w-full bg-white px-3 text-sm text-ink"
                  />
                </label>

                {message ? <p className="rounded border border-berry/25 bg-berry/10 p-3 text-sm text-berry">{message}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="premium-control premium-action inline-flex h-11 w-full items-center justify-center gap-2 bg-ink px-4 text-sm font-semibold text-white hover:bg-pine disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                  Sign in
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard min-h-screen bg-[#f5f7f5] dark:bg-[#0b0f0e]">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur dark:bg-[#0b0f0e]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-ink text-white shadow-sm">
              <Gauge size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase text-muted">Admin workspace</p>
              <h1 className="truncate text-lg font-bold text-ink">3S Design Control</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => refreshAdminData()}
              className="premium-control premium-action inline-flex h-10 w-10 items-center justify-center bg-white text-ink hover:border-pine hover:text-pine"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={17} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="premium-control premium-action inline-flex h-10 w-10 items-center justify-center bg-white text-ink hover:border-berry hover:text-berry"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4">
          <section className="rounded-lg bg-ink p-4 text-white shadow-panel">
            <p className="text-xs font-semibold uppercase text-white/55">Signed in</p>
            <p className="mt-1 truncate text-sm font-semibold">{session.user.email}</p>
            <p className="text-xs text-white/55">{session.user.role}</p>
            <div className="mt-4 grid gap-2">
              <NavChip icon={Gauge} label="Overview" active />
              <NavChip icon={Boxes} label="Products" />
              <NavChip icon={FileCheck2} label="Publishing" />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Metric icon={Boxes} label="Products" value={stats.total} />
            <Metric icon={BadgeCheck} label="Published" value={stats.published} />
            <Metric icon={FileCheck2} label="Drafts" value={stats.draft} />
            <Metric icon={Sparkles} label="Featured" value={stats.featured} />
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Launch readiness</p>
                <h2 className="mt-1 text-sm font-semibold text-ink">Production blockers</h2>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-saffron/15 text-saffron">
                <AlertTriangle size={17} />
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {launchReadiness.map((item) => (
                <LaunchReadinessRow key={item.key} item={item} />
              ))}
            </div>
          </section>

          {selectedProduct ? <SelectedProductAnalyticsPanel product={selectedProduct} summary={productAnalytics} /> : null}

          {selectedProduct ? (
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={handleUpdateSelectedProduct}>
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-pine/10 text-pine">
                    <PackagePlus size={17} />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-ink">Product editor</h2>
                    <p className="text-sm text-muted">Update the core selling copy before publishing.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <AdminField label="Title">
                    <input
                      value={editForm.title}
                      onChange={(event) => updateEditForm('title', event.target.value)}
                      required
                      minLength={3}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <AdminField label="Slug">
                    <input
                      value={editForm.slug}
                      onChange={(event) => updateEditForm('slug', slugify(event.target.value))}
                      required
                      minLength={3}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <AdminField label="Subtitle" wide>
                    <input
                      value={editForm.subtitle}
                      onChange={(event) => updateEditForm('subtitle', event.target.value)}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <AdminField label="Description" wide>
                    <textarea
                      value={editForm.description}
                      onChange={(event) => updateEditForm('description', event.target.value)}
                      required
                      minLength={10}
                      rows={4}
                      className="mt-1 w-full resize-y rounded border border-line bg-white px-3 py-2 text-sm"
                    />
                  </AdminField>
                  <AdminField label="Base price">
                    <input
                      value={editForm.basePrice}
                      onChange={(event) => updateEditForm('basePrice', event.target.value)}
                      inputMode="decimal"
                      required
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <AdminField label="Currency">
                      <select
                        value={editForm.currency}
                        onChange={(event) => updateEditForm('currency', event.target.value)}
                        className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                      >
                        <option value="USD">USD</option>
                        <option value="EGP">EGP</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </AdminField>
                    <label className="mt-6 inline-flex h-10 items-center gap-2 rounded border border-line bg-paper px-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={editForm.isFeatured}
                        onChange={(event) => updateEditForm('isFeatured', event.target.checked)}
                      />
                      Featured
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white hover:bg-pine disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <BadgeCheck size={16} />}
                  Save product
                </button>
              </form>

              <section className="space-y-4">
                <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
                  <h2 className="text-base font-semibold text-ink">License pricing</h2>
                  <p className="mt-1 text-sm text-muted">Set one price per license. Missing prices block publishing.</p>
                  <div className="mt-3 grid gap-2">
                    {catalog?.licenses.items.length ? (
                      catalog.licenses.items.map((license) => (
                        <label
                          key={license.id}
                          className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 rounded border border-line bg-paper p-3"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink">{license.name}</span>
                            <span className="block truncate text-xs text-muted">{license.licenseType}</span>
                          </span>
                          <input
                            value={licensePrices[license.id] ?? selectedProduct.basePrice}
                            onChange={(event) => setLicensePrices((current) => ({ ...current, [license.id]: event.target.value }))}
                            inputMode="decimal"
                            className="h-9 rounded border border-line bg-white px-2 text-sm"
                          />
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-muted">No licenses found. Create licenses first.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveLicensePrices()}
                    disabled={loading || !catalog?.licenses.items.length}
                    className="mt-3 h-10 rounded bg-pine px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Save license prices
                  </button>
                </div>

                <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
                  <h2 className="text-base font-semibold text-ink">Discovery links</h2>
                  <div className="mt-3 grid gap-3">
                    <MultiCheck
                      label="Categories"
                      items={catalog?.categories.items ?? []}
                      selected={selectedCategoryIds}
                      onChange={setSelectedCategoryIds}
                    />
                    <MultiCheck label="Tags" items={catalog?.tags.items ?? []} selected={selectedTagIds} onChange={setSelectedTagIds} />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveDiscoveryLinks()}
                    disabled={loading}
                    className="mt-3 h-10 rounded bg-pine px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Save discovery links
                  </button>
                </div>
              </section>
            </section>
          ) : null}

          {selectedProduct ? (
            <section className="grid gap-5 xl:grid-cols-2">
              <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={handleCreateAsset}>
                <h2 className="text-base font-semibold text-ink">Attach asset metadata</h2>
                <p className="mt-1 text-sm text-muted">
                  Upload when R2 is configured, or register a known dev storage key when working locally.
                </p>

                {checks?.current.assets.length ? (
                  <div className="mt-4 rounded border border-line bg-paper p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted">Current assets</p>
                    <div className="grid gap-2">
                      {checks.current.assets.map((asset) => (
                        <div key={asset.id} className="rounded bg-white p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-ink">{asset.fileName}</span>
                            <span className="shrink-0 rounded bg-pine/10 px-2 py-0.5 font-semibold text-pine">{asset.assetType}</span>
                          </div>
                          <p className="mt-1 truncate text-muted">{asset.storageKey}</p>
                          <p className="mt-1 text-muted">
                            {asset.assetStatus} / {asset.scanStatus}
                            {asset.isPrimary ? ' / primary' : ''}
                            {asset.isPublicPreview ? ' / public' : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="mt-4 block rounded border border-dashed border-line bg-paper p-3">
                  <span className="text-sm font-medium text-ink">Upload file</span>
                  <input
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setAssetFile(file);
                      if (file) {
                        updateAssetForm('fileName', file.name);
                        updateAssetForm('mimeType', file.type || assetForm.mimeType);
                        updateAssetForm('fileSize', String(file.size));
                      }
                    }}
                    className="mt-2 block w-full text-sm text-muted"
                  />
                  <span className="mt-2 block text-xs leading-5 text-muted">
                    If upload fails because storage is not configured, clear the file and enter storage key metadata manually.
                  </span>
                </label>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <AdminField label="Asset type">
                    <select
                      value={assetForm.assetType}
                      onChange={(event) => {
                        const assetType = event.target.value;
                        updateAssetForm('assetType', assetType);
                        updateAssetForm('isPublicPreview', assetType === 'preview' || assetType === 'watermarked_preview');
                        updateAssetForm('mimeType', assetType === 'delivery_zip' ? 'application/zip' : 'image/png');
                      }}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    >
                      <option value="watermarked_preview">watermarked preview</option>
                      <option value="preview">preview</option>
                      <option value="delivery_zip">delivery zip</option>
                      <option value="source_file">source file</option>
                    </select>
                  </AdminField>
                  <AdminField label="File name">
                    <input
                      value={assetForm.fileName}
                      onChange={(event) => updateAssetForm('fileName', event.target.value)}
                      required={!assetFile}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <AdminField label="Storage key" wide>
                    <input
                      value={assetForm.storageKey}
                      onChange={(event) => updateAssetForm('storageKey', event.target.value)}
                      required={!assetFile}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <AdminField label="Mime type">
                    <input
                      value={assetForm.mimeType}
                      onChange={(event) => updateAssetForm('mimeType', event.target.value)}
                      required
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <AdminField label="File size bytes">
                    <input
                      value={assetForm.fileSize}
                      onChange={(event) => updateAssetForm('fileSize', event.target.value)}
                      inputMode="numeric"
                      required={!assetFile}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <AdminField label="Alt text" wide>
                    <input
                      value={assetForm.altText}
                      onChange={(event) => updateAssetForm('altText', event.target.value)}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={assetForm.isPrimary}
                      onChange={(event) => updateAssetForm('isPrimary', event.target.checked)}
                    />
                    Primary
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={assetForm.isPublicPreview}
                      onChange={(event) => updateAssetForm('isPublicPreview', event.target.checked)}
                    />
                    Public preview
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 h-10 rounded bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Attach asset
                </button>
              </form>

              <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={handleCreateAttribute}>
                <h2 className="text-base font-semibold text-ink">Design DNA attribute</h2>
                <p className="mt-1 text-sm text-muted">Add AI/search signals like industry, style, mood, color, platform, format.</p>
                <div className="mt-4 grid gap-3">
                  <AdminField label="Key">
                    <select
                      value={attributeForm.key}
                      onChange={(event) => updateAttributeForm('key', event.target.value)}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    >
                      {[
                        'dna.industry',
                        'dna.style',
                        'dna.mood',
                        'dna.color',
                        'dna.platform',
                        'dna.format',
                        'dna.occasion',
                        'dna.audience',
                      ].map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </AdminField>
                  <AdminField label="Value">
                    <input
                      value={attributeForm.value}
                      onChange={(event) => updateAttributeForm('value', event.target.value)}
                      required
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                  <AdminField label="Label">
                    <input
                      value={attributeForm.label}
                      onChange={(event) => updateAttributeForm('label', event.target.value)}
                      className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                    />
                  </AdminField>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 h-10 rounded bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Add DNA signal
                </button>
              </form>
            </section>
          ) : null}

          <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Catalog readiness</h2>
            <div className="mt-3 space-y-2 text-sm">
              <CatalogRow icon={FolderTree} label="Categories" value={catalogCounts.categories} />
              <CatalogRow icon={Tag} label="Tags" value={catalogCounts.tags} />
              <CatalogRow icon={ShieldCheck} label="Licenses" value={catalogCounts.licenses} />
            </div>
          </section>
        </aside>

        <div className="space-y-5">
          {message ? <div className="rounded-lg border border-line bg-white p-3 text-sm text-ink shadow-sm">{message}</div> : null}

          <AdminAnalyticsPanel summary={analyticsSummary} />

          <PaymentDesk
            loading={loading}
            payments={adminPayments}
            adminPasswords={paymentAdminPasswords}
            paymentRefs={paymentRefs}
            reconcilePassword={paymentReconcilePassword}
            onChangeAdminPassword={(paymentId, value) => setPaymentAdminPasswords((current) => ({ ...current, [paymentId]: value }))}
            onChangePaymentRef={(paymentId, value) => setPaymentRefs((current) => ({ ...current, [paymentId]: value }))}
            onChangeReconcilePassword={setPaymentReconcilePassword}
            onMarkFailed={(paymentId) => void handleMarkPaymentFailed(paymentId)}
            onMarkPaid={(paymentId) => void handleMarkPaymentPaid(paymentId)}
            onReconcileStale={() => void handleReconcileStalePayments()}
          />

          <RefundDesk
            loading={loading}
            refunds={adminRefunds}
            adminPasswords={refundAdminPasswords}
            notes={refundNotes}
            providerRefs={refundProviderRefs}
            onChangeAdminPassword={(refundRequestId, value) =>
              setRefundAdminPasswords((current) => ({ ...current, [refundRequestId]: value }))
            }
            onChangeNote={(refundRequestId, value) => setRefundNotes((current) => ({ ...current, [refundRequestId]: value }))}
            onChangeProviderRef={(refundRequestId, value) => setRefundProviderRefs((current) => ({ ...current, [refundRequestId]: value }))}
            onApprove={(refundRequestId) => void handleApproveRefund(refundRequestId)}
            onReject={(refundRequestId) => void handleRejectRefund(refundRequestId)}
          />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">Products</h2>
                  <p className="text-sm text-muted">Create drafts, inspect readiness, publish when assets are safe.</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search products"
                    className="h-10 w-full rounded border border-line bg-paper pl-9 pr-3 text-sm text-ink"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-[#f8faf8] text-xs uppercase text-muted dark:bg-[#151b18]">
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Price</th>
                      <th className="px-4 py-3 font-semibold">Updated</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-line transition hover:bg-[#fbfcfb] dark:hover:bg-[#17211d] last:border-0"
                      >
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => handleCheckProduct(product.id)} className="max-w-[320px] text-left">
                            <span className="block truncate font-semibold text-ink">{product.title}</span>
                            <span className="block truncate text-xs text-muted">{product.slug}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={product.status} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-pine">
                          {product.currency} {product.basePrice}
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDate(product.updatedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleCheckProduct(product.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded border border-line bg-white text-ink hover:border-pine hover:text-pine"
                              title="Inspect"
                              aria-label="Inspect"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePublish(product)}
                              disabled={loading}
                              className="inline-flex h-9 w-9 items-center justify-center rounded border border-ink bg-ink text-white hover:bg-pine disabled:opacity-60"
                              title={product.status === 'published' ? 'Unpublish' : 'Publish'}
                              aria-label={product.status === 'published' ? 'Unpublish' : 'Publish'}
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!filteredProducts.length ? <div className="p-8 text-center text-sm text-muted">No products match this view.</div> : null}
            </div>

            <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-ink">Publishing checks</h2>
              {selectedProduct ? (
                <>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{selectedProduct.title}</p>
                  {checks?.quality ? (
                    <div className="mt-4 rounded-lg border border-line bg-paper p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted">Quality score</p>
                          <p className="text-sm font-semibold text-ink">{checks.quality.grade.replaceAll('_', ' ')}</p>
                        </div>
                        <span className="text-2xl font-bold text-pine">{checks.quality.score}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded bg-white dark:bg-[#0f1513]">
                        <div className="h-full rounded bg-pine transition-all" style={{ width: `${checks.quality.score}%` }} />
                      </div>
                      <div className="mt-3 space-y-1">
                        {checks.quality.signals
                          .filter((signal) => !signal.passed)
                          .slice(0, 3)
                          .map((signal) => (
                            <p key={signal.key} className="text-xs leading-5 text-muted">
                              {signal.label}: {signal.message}
                            </p>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  {checks?.designDnaReadiness ? (
                    <div className="mt-3 rounded-lg border border-line bg-paper p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted">Smart matching DNA</p>
                          <p className="text-sm font-semibold text-ink">
                            {checks.designDnaReadiness.ready ? 'ready' : 'needs product signals'}
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-pine">{checks.designDnaReadiness.score}</span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {checks.designDnaReadiness.groups.map((group) => (
                          <div key={group.key} className="flex items-start gap-2 text-xs leading-5 text-muted">
                            {group.passed ? (
                              <CheckCircle2 className="mt-0.5 shrink-0 text-pine" size={15} />
                            ) : (
                              <XCircle className="mt-0.5 shrink-0 text-berry" size={15} />
                            )}
                            <span>
                              <strong className="text-ink">{group.label}:</strong>{' '}
                              {group.values.length ? group.values.slice(0, 3).join(', ') : group.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-2">
                    {checks?.checks.map((check) => (
                      <div key={check.key} className="flex gap-2 rounded border border-line bg-[#f8faf8] p-3 dark:bg-[#151b18]">
                        {check.passed ? (
                          <CheckCircle2 className="mt-0.5 shrink-0 text-pine" size={17} />
                        ) : (
                          <XCircle className="mt-0.5 shrink-0 text-berry" size={17} />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-ink">{check.key.replaceAll('_', ' ')}</p>
                          <p className="text-xs leading-5 text-muted">{check.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted">Create a product draft to see checks.</p>
              )}
            </section>
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-saffron text-ink">
                <PackagePlus size={17} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink">New product draft</h2>
                <p className="text-sm text-muted">Create the sellable record first, then attach variants, files, and license prices.</p>
              </div>
            </div>

            <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleCreateProduct}>
              <label className="block">
                <span className="text-sm font-medium text-ink">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    updateForm('title', title);
                    if (!form.slug) {
                      updateForm('slug', slugify(title));
                    }
                  }}
                  required
                  minLength={3}
                  className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink">Slug</span>
                <input
                  value={form.slug}
                  onChange={(event) => updateForm('slug', slugify(event.target.value))}
                  required
                  minLength={3}
                  className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-ink">Subtitle</span>
                <input
                  value={form.subtitle}
                  onChange={(event) => updateForm('subtitle', event.target.value)}
                  className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-ink">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  required
                  minLength={10}
                  rows={4}
                  className="mt-1 w-full resize-y rounded border border-line bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink">Base price</span>
                <input
                  value={form.basePrice}
                  onChange={(event) => updateForm('basePrice', event.target.value)}
                  inputMode="decimal"
                  required
                  className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                />
              </label>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Currency</span>
                  <select
                    value={form.currency}
                    onChange={(event) => updateForm('currency', event.target.value)}
                    className="mt-1 h-10 w-full rounded border border-line bg-white px-3 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EGP">EGP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
                <label className="mt-6 inline-flex h-10 items-center gap-2 rounded border border-line bg-paper px-3 text-sm text-ink">
                  <input type="checkbox" checked={form.isFeatured} onChange={(event) => updateForm('isFeatured', event.target.checked)} />
                  Featured
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white hover:bg-pine disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <PackagePlus size={16} />}
                  Create draft
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function NavChip({ icon: Icon, label, active = false }: { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`flex h-10 items-center gap-2 rounded px-3 text-left text-sm transition ${
        active ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon size={16} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded bg-pine/10 text-pine">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function AdminAnalyticsPanel({ summary }: { summary: AdminAnalyticsSummary | null }) {
  const totals = summary?.totals;
  const conversion = summary?.conversion;
  const leak = summary ? strongestLeak(summary) : 'Collect events to reveal the first weak decision point.';

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-pine/10 text-pine">
            <Eye size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Customer funnel</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Where buyers continue or drop</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Last {summary?.window.days ?? 7} days. Use this to decide whether to improve discovery, product clarity, checkout, or
              delivery.
            </p>
          </div>
        </div>
        <span className="rounded bg-pine/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-pine">
          {totals?.events ?? 0} events
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <FunnelDatum label="Searches" value={totals?.searches ?? 0} />
        <FunnelDatum label="Views" value={totals?.productViews ?? 0} />
        <FunnelDatum label="Cart adds" value={totals?.cartAdds ?? 0} />
        <FunnelDatum label="Checkout" value={totals?.checkoutAttempts ?? 0} />
        <FunnelDatum label="Orders" value={totals?.ordersCreated ?? 0} />
        <FunnelDatum label="Downloads" value={totals?.downloadsRequested ?? 0} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
        <div className="rounded border border-line bg-paper p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Conversion health</p>
          <div className="mt-3 grid gap-2">
            <ConversionRow label="View -> cart" value={conversion?.viewToCart ?? 0} />
            <ConversionRow label="Cart -> checkout" value={conversion?.cartToCheckout ?? 0} />
            <ConversionRow label="Checkout -> order" value={conversion?.checkoutToOrder ?? 0} />
            <ConversionRow label="Order -> download" value={conversion?.orderToDownload ?? 0} />
          </div>
          <p className="mt-3 rounded border border-saffron/25 bg-saffron/10 p-2 text-xs font-bold leading-5 text-[#8a5c16]">{leak}</p>
        </div>

        <div className="rounded border border-line bg-paper p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Top searches</p>
          <div className="mt-3 grid gap-2">
            {(summary?.topSearches.length ? summary.topSearches : [{ query: 'No searches captured yet', count: 0 }])
              .slice(0, 5)
              .map((item) => (
                <RankRow key={item.query} label={item.query} value={item.count} />
              ))}
          </div>
        </div>

        <div className="rounded border border-line bg-paper p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Top product signals</p>
          <div className="mt-3 grid gap-2">
            {(summary?.topProducts.length ? summary.topProducts : [{ slug: 'No product events captured yet', title: null, count: 0 }])
              .slice(0, 5)
              .map((item) => (
                <RankRow key={item.slug} label={item.title || item.slug} value={item.count} />
              ))}
          </div>
        </div>
      </div>

      <AttributionBreakdownPanel
        title="Attribution leaders"
        emptyLabel="No attribution captured yet"
        sources={summary?.attribution.sources ?? []}
        campaigns={summary?.attribution.campaigns ?? []}
        intents={summary?.attribution.intents ?? []}
        briefs={summary?.attribution.briefs ?? []}
      />
    </section>
  );
}

function FunnelDatum({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-ink">{value}</p>
    </div>
  );
}

function FunnelMoneyDatum({ label, value, currency }: { label: string; value: string; currency: string }) {
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 truncate text-xl font-black text-ink">
        {currency} {value}
      </p>
    </div>
  );
}

function ConversionRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-line bg-white px-3 py-2">
      <span className="text-xs font-bold text-muted">{label}</span>
      <span className="text-sm font-black text-pine">{value}%</span>
    </div>
  );
}

function RankRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-line bg-white px-3 py-2">
      <span className="min-w-0 truncate text-xs font-bold text-ink">{label}</span>
      <span className="shrink-0 text-xs font-black text-pine">{value}</span>
    </div>
  );
}

function strongestLeak(summary: AdminAnalyticsSummary) {
  const entries = [
    { label: 'Product page is not convincing enough to add to cart.', value: summary.conversion.viewToCart },
    { label: 'Cart is not confident enough to start checkout.', value: summary.conversion.cartToCheckout },
    { label: 'Checkout is not clear enough to create orders.', value: summary.conversion.checkoutToOrder },
    { label: 'Post-purchase delivery needs attention.', value: summary.conversion.orderToDownload },
  ].filter((item) => item.value > 0);

  if (!summary.totals.events) {
    return 'No funnel events yet. Browse as a customer first, then refresh this dashboard.';
  }

  if (!entries.length) {
    return 'Not enough conversion movement yet. Focus on driving product views and cart adds.';
  }

  return entries.sort((left, right) => left.value - right.value)[0]?.label ?? 'Keep collecting events before deciding.';
}

function SelectedProductAnalyticsPanel({ product, summary }: { product: AdminProduct; summary: AdminProductAnalyticsSummary | null }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-saffron/15 text-saffron">
            <Sparkles size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Selected product analytics</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{product.title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Product-level readout for the last {summary?.window.days ?? 7} days. Use it to decide whether the preview, copy, license, or
              sign-in step needs work.
            </p>
          </div>
        </div>
        <span className="rounded bg-saffron/15 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#8a5c16]">
          {summary?.totals.events ?? 0} events
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <FunnelDatum label="Result clicks" value={summary?.totals.resultClicks ?? 0} />
        <FunnelDatum label="Views" value={summary?.totals.productViews ?? 0} />
        <FunnelDatum label="License picks" value={summary?.totals.licenseSelections ?? 0} />
        <FunnelDatum label="Cart attempts" value={summary?.totals.cartAttempts ?? 0} />
        <FunnelDatum label="Cart adds" value={summary?.totals.cartAdds ?? 0} />
        <FunnelDatum label="Signals" value={summary?.counts.length ?? 0} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <FunnelDatum label="Orders" value={summary?.totals.ordersCreated ?? 0} />
        <FunnelDatum label="Paid" value={summary?.totals.paidOrders ?? 0} />
        <FunnelDatum label="Sold qty" value={summary?.totals.quantitySold ?? 0} />
        <FunnelMoneyDatum label="Revenue" value={summary?.totals.revenue ?? '0'} currency={product.currency} />
        <FunnelDatum label="Entitlements" value={summary?.totals.entitlements ?? 0} />
        <FunnelDatum label="Downloads" value={summary?.totals.downloads ?? 0} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
        <div className="rounded border border-line bg-paper p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Product conversion</p>
          <div className="mt-3 grid gap-2">
            <ConversionRow label="Click -> view" value={summary?.conversion.clickToView ?? 0} />
            <ConversionRow label="View -> license" value={summary?.conversion.viewToLicenseSelection ?? 0} />
            <ConversionRow label="View -> cart" value={summary?.conversion.viewToCart ?? 0} />
            <ConversionRow label="Attempt -> cart" value={summary?.conversion.cartAttemptSuccess ?? 0} />
            <ConversionRow label="Cart -> order" value={summary?.conversion.cartToOrder ?? 0} />
            <ConversionRow label="Order -> paid" value={summary?.conversion.orderToPaid ?? 0} />
            <ConversionRow label="Paid -> vault" value={summary?.conversion.paidToDownload ?? 0} />
          </div>
          <p className="mt-3 rounded border border-pine/20 bg-pine/10 p-2 text-xs font-bold leading-5 text-pine">
            {summary?.recommendation ?? 'No product-level events yet. Open this product as a customer and refresh admin.'}
          </p>
        </div>

        <div className="rounded border border-line bg-paper p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Search terms that led here</p>
          <div className="mt-3 grid gap-2">
            {(summary?.searchTerms.length ? summary.searchTerms : [{ query: 'No search-result clicks captured yet', count: 0 }])
              .slice(0, 5)
              .map((item) => (
                <RankRow key={item.query} label={item.query} value={item.count} />
              ))}
          </div>
        </div>

        <div className="rounded border border-line bg-paper p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">License demand</p>
          <div className="mt-3 grid gap-2">
            {(summary?.licensePicks.length
              ? summary.licensePicks
              : [{ licenseId: 'empty', licenseName: 'No license choices captured yet', count: 0 }]
            )
              .slice(0, 5)
              .map((item) => (
                <RankRow key={item.licenseId} label={item.licenseName || item.licenseId} value={item.count} />
              ))}
          </div>
        </div>
      </div>

      <AttributionBreakdownPanel
        title="Where this product came from"
        emptyLabel="No product attribution captured yet"
        sources={summary?.attribution.sources ?? []}
        campaigns={summary?.attribution.campaigns ?? []}
        intents={summary?.attribution.intents ?? []}
        briefs={summary?.attribution.briefs ?? []}
      />
    </section>
  );
}

function AttributionBreakdownPanel({
  title,
  emptyLabel,
  sources,
  campaigns,
  intents,
  briefs,
}: {
  title: string;
  emptyLabel: string;
  sources: Array<{ value: string; count: number }>;
  campaigns: Array<{ value: string; count: number }>;
  intents: Array<{ value: string; count: number }>;
  briefs: Array<{ value: string; count: number }>;
}) {
  return (
    <div className="mt-4 rounded border border-line bg-paper p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AttributionColumn title="Sources" rows={sources} emptyLabel={emptyLabel} />
        <AttributionColumn title="Campaigns" rows={campaigns} emptyLabel={emptyLabel} />
        <AttributionColumn title="Intents" rows={intents} emptyLabel={emptyLabel} />
        <AttributionColumn title="Briefs" rows={briefs} emptyLabel={emptyLabel} />
      </div>
    </div>
  );
}

function AttributionColumn({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ value: string; count: number }>;
  emptyLabel: string;
}) {
  const visible = rows.length ? rows.slice(0, 4) : [{ value: emptyLabel, count: 0 }];

  return (
    <div className="rounded border border-line bg-white p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-muted">{title}</p>
      <div className="mt-2 grid gap-2">
        {visible.map((item) => (
          <RankRow key={`${title}-${item.value}`} label={item.value} value={item.count} />
        ))}
      </div>
    </div>
  );
}

function PaymentDesk({
  payments,
  loading,
  adminPasswords,
  paymentRefs,
  reconcilePassword,
  onChangeAdminPassword,
  onChangePaymentRef,
  onChangeReconcilePassword,
  onMarkPaid,
  onMarkFailed,
  onReconcileStale,
}: {
  payments: AdminPaymentRow[];
  loading: boolean;
  adminPasswords: Record<string, string>;
  paymentRefs: Record<string, string>;
  reconcilePassword: string;
  onChangeAdminPassword: (paymentId: string, value: string) => void;
  onChangePaymentRef: (paymentId: string, value: string) => void;
  onChangeReconcilePassword: (value: string) => void;
  onMarkPaid: (paymentId: string) => void;
  onMarkFailed: (paymentId: string) => void;
  onReconcileStale: () => void;
}) {
  const pending = payments.filter((row) => row.payment.status === 'pending');
  const visible = pending.length ? pending : payments.slice(0, 5);

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-pine/10 text-pine">
            <CreditCard size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Payment desk</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Manual payment approvals</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Approving a payment marks the order as paid and unlocks the customer delivery vault. Failed payments keep downloads locked.
            </p>
          </div>
        </div>
        <span className="rounded bg-saffron/15 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#8a5c16]">
          {pending.length} pending
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-saffron/30 bg-saffron/10 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-end">
          <div>
            <p className="text-sm font-black text-ink">Reconcile stale sessions</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Expire old pending payment sessions without touching paid, refunded, or already failed payments.
            </p>
          </div>
          <input
            type="password"
            value={reconcilePassword}
            onChange={(event) => onChangeReconcilePassword(event.target.value)}
            placeholder="Admin password required"
            className="h-10 rounded border border-line bg-white px-3 text-sm text-ink"
          />
          <button
            type="button"
            disabled={loading || reconcilePassword.length < 8}
            onClick={onReconcileStale}
            className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#8a5c16]/30 bg-white px-4 text-sm font-semibold text-[#8a5c16] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} />
            Reconcile
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {visible.length ? (
          visible.map((row) => (
            <div key={row.payment.id} className="rounded-lg border border-line bg-paper p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-ink">{row.order.orderNumber}</span>
                    <StatusPill status={row.payment.status} />
                    <StatusPill status={row.order.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {row.customer.fullName || row.customer.email} / {row.payment.provider} / {row.payment.mode.replaceAll('_', ' ')}
                  </p>
                  <p className="text-xs text-muted">
                    Created {formatDate(row.order.createdAt)} / Payment ref {row.payment.providerPaymentId ?? 'not supplied'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Latest webhook:{' '}
                    {row.latestWebhook
                      ? `${row.latestWebhook.eventType} / ${row.latestWebhook.processedAt ? 'processed' : 'not processed'}`
                      : 'not received'}
                  </p>
                  <PaymentAttributionLine attribution={row.order.billingSnapshot?.attribution ?? null} />
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xs font-semibold uppercase text-muted">Amount</p>
                  <p className="text-2xl font-black text-pine">
                    {row.payment.currency} {row.payment.amount}
                  </p>
                </div>
              </div>

              {row.payment.status === 'pending' ? (
                <div className="mt-3 grid gap-2">
                  <div className="grid gap-2 lg:grid-cols-2">
                    <input
                      value={paymentRefs[row.payment.id] ?? ''}
                      onChange={(event) => onChangePaymentRef(row.payment.id, event.target.value)}
                      placeholder="Optional bank/Fawry/Paymob reference"
                      className="h-10 rounded border border-line bg-white px-3 text-sm text-ink"
                    />
                    <input
                      type="password"
                      value={adminPasswords[row.payment.id] ?? ''}
                      onChange={(event) => onChangeAdminPassword(row.payment.id, event.target.value)}
                      placeholder="Admin password required to unlock delivery"
                      className="h-10 rounded border border-line bg-white px-3 text-sm text-ink"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loading || (adminPasswords[row.payment.id] ?? '').length < 8}
                      onClick={() => onMarkPaid(row.payment.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      Mark paid
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onMarkFailed(row.payment.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded border border-berry/30 bg-white px-4 text-sm font-semibold text-berry disabled:opacity-60"
                    >
                      <XCircle size={16} />
                      Fail
                    </button>
                    <span className="inline-flex items-center text-xs font-bold text-muted">
                      Password is verified by the API before files unlock.
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded border border-line bg-white p-3 text-sm text-muted">
                  This payment is {row.payment.status}. Downloads are{' '}
                  {row.order.status === 'paid' ? 'available from the vault' : 'still locked'}.
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="rounded border border-line bg-paper p-4 text-sm text-muted">
            No payment sessions yet. Create a checkout from a customer account to see manual approvals here.
          </p>
        )}
      </div>
    </section>
  );
}

function RefundDesk({
  refunds,
  loading,
  adminPasswords,
  notes,
  providerRefs,
  onChangeAdminPassword,
  onChangeNote,
  onChangeProviderRef,
  onApprove,
  onReject,
}: {
  refunds: AdminRefundRow[];
  loading: boolean;
  adminPasswords: Record<string, string>;
  notes: Record<string, string>;
  providerRefs: Record<string, string>;
  onChangeAdminPassword: (refundRequestId: string, value: string) => void;
  onChangeNote: (refundRequestId: string, value: string) => void;
  onChangeProviderRef: (refundRequestId: string, value: string) => void;
  onApprove: (refundRequestId: string) => void;
  onReject: (refundRequestId: string) => void;
}) {
  const pending = refunds.filter((row) => row.refundRequest.status === 'requested' || row.refundRequest.status === 'under_review');
  const visible = pending.length ? pending : refunds.slice(0, 5);

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-saffron/15 text-[#8a5c16]">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Refund desk</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Customer refund reviews</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Resolve requests with an admin password. Approved refunds close the request and revoke the order delivery access.
            </p>
          </div>
        </div>
        <span className="rounded bg-saffron/15 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#8a5c16]">
          {pending.length} pending
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {visible.length ? (
          visible.map((row) => {
            const isOpen = row.refundRequest.status === 'requested' || row.refundRequest.status === 'under_review';
            const passwordReady = (adminPasswords[row.refundRequest.id] ?? '').length >= 8;

            return (
              <div key={row.refundRequest.id} className="rounded-lg border border-line bg-paper p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-ink">{row.order.orderNumber}</span>
                      <StatusPill status={row.refundRequest.status} />
                      <StatusPill status={row.order.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {row.customer.fullName || row.customer.email} / requested {formatDate(row.refundRequest.requestedAt)}
                    </p>
                    <p className="mt-2 rounded border border-line bg-white p-3 text-sm leading-6 text-ink">{row.refundRequest.reason}</p>
                    {row.refundRequest.adminNote ? (
                      <p className="mt-2 text-xs leading-5 text-muted">Admin note: {row.refundRequest.adminNote}</p>
                    ) : null}
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-xs font-semibold uppercase text-muted">Order value</p>
                    <p className="text-2xl font-black text-pine">
                      {row.order.currency} {row.order.total}
                    </p>
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-3 grid gap-2">
                    <textarea
                      value={notes[row.refundRequest.id] ?? ''}
                      onChange={(event) => onChangeNote(row.refundRequest.id, event.target.value)}
                      rows={2}
                      placeholder="Optional internal note for the customer record"
                      className="w-full resize-y rounded border border-line bg-white px-3 py-2 text-sm text-ink"
                    />
                    <div className="grid gap-2 lg:grid-cols-2">
                      <input
                        value={providerRefs[row.refundRequest.id] ?? ''}
                        onChange={(event) => onChangeProviderRef(row.refundRequest.id, event.target.value)}
                        placeholder="Optional Paymob/Fawry/PayPal refund reference"
                        className="h-10 rounded border border-line bg-white px-3 text-sm text-ink"
                      />
                      <input
                        type="password"
                        value={adminPasswords[row.refundRequest.id] ?? ''}
                        onChange={(event) => onChangeAdminPassword(row.refundRequest.id, event.target.value)}
                        placeholder="Admin password required"
                        className="h-10 rounded border border-line bg-white px-3 text-sm text-ink"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={loading || !passwordReady}
                        onClick={() => onApprove(row.refundRequest.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 size={16} />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={loading || !passwordReady}
                        onClick={() => onReject(row.refundRequest.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded border border-berry/30 bg-white px-4 text-sm font-semibold text-berry disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 rounded border border-line bg-white p-3 text-sm text-muted">
                    This request is {row.refundRequest.status.replaceAll('_', ' ')}
                    {row.refundRequest.resolvedAt ? ` since ${formatDate(row.refundRequest.resolvedAt)}` : ''}.
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <p className="rounded border border-line bg-paper p-4 text-sm text-muted">
            No refund requests yet. Customer account requests will appear here for review.
          </p>
        )}
      </div>
    </section>
  );
}

function PaymentAttributionLine({
  attribution,
}: {
  attribution?: {
    source?: string | null;
    campaign?: string | null;
    intent?: string | null;
    brief?: string | null;
  } | null;
}) {
  const parts = [
    attribution?.source ? `Source ${attribution.source}` : null,
    attribution?.campaign ? `Campaign ${attribution.campaign}` : null,
    attribution?.intent ? `Intent ${attribution.intent}` : null,
    attribution?.brief ? `Brief ${attribution.brief}` : null,
  ].filter(Boolean);

  return <p className="mt-1 text-xs text-muted">Attribution: {parts.length ? parts.join(' / ') : 'not captured'}</p>;
}

function LaunchReadinessRow({
  item,
}: {
  item: {
    label: string;
    passed: boolean;
    value: string;
    detail: string;
  };
}) {
  return (
    <div className="rounded border border-line bg-paper p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] ${
            item.passed ? 'bg-pine/10 text-pine' : 'bg-saffron/15 text-[#8a5c16]'
          }`}
        >
          {item.passed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          {item.value}
        </span>
      </div>
    </div>
  );
}

function CatalogRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-2 text-muted">
        <Icon size={15} />
        <span className="truncate">{label}</span>
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function AdminField({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? 'lg:col-span-2' : ''}`}>
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function MultiCheck({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: Array<{ id: string; name: string; slug?: string }>;
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      {items.length ? (
        <div className="grid max-h-44 gap-2 overflow-auto rounded border border-line bg-paper p-2">
          {items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 rounded bg-white px-2 py-1.5 text-sm text-ink">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{item.name}</span>
                {item.slug ? <span className="block truncate text-xs text-muted">{item.slug}</span> : null}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="rounded border border-line bg-paper p-3 text-sm text-muted">No {label.toLowerCase()} found.</p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const published = status === 'published';

  return (
    <span
      className={`inline-flex h-7 items-center rounded px-2 text-xs font-semibold ${
        published ? 'bg-pine/10 text-pine' : 'bg-saffron/15 text-[#7a5018]'
      }`}
    >
      {status}
    </span>
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
