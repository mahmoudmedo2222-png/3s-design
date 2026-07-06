'use client';

import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
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
import { ThemeToggle } from './theme-toggle';
import {
  AdminProduct,
  AdminUser,
  createAdminProduct,
  fetchAdminProducts,
  fetchCatalog,
  fetchPublishingChecks,
  loginAdmin,
  publishProduct,
  PublishingChecksResponse,
  unpublishProduct,
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

const emptyProductForm: ProductForm = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  basePrice: '25.00',
  currency: 'USD',
  isFeatured: false,
};

const sessionStorageKey = '3s-design-admin-session';

export function AdminDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [checks, setChecks] = useState<PublishingChecksResponse | null>(null);
  const [catalogCounts, setCatalogCounts] = useState({ categories: 0, tags: 0, licenses: 0 });
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);

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

  async function refreshAdminData(token = session?.token) {
    if (!token) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const [productsResponse, catalogResponse] = await Promise.all([fetchAdminProducts(token), fetchCatalog(token)]);

      setProducts(productsResponse.items);
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
      } else {
        setChecks(null);
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

    setSelectedProductId(productId);
    setChecks(await fetchPublishingChecks(session.token, productId));
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

  if (!session) {
    return (
      <main className="min-h-screen bg-[#f5f7f5] dark:bg-[#0b0f0e]">
        <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
          <div className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
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
                    className="mt-1 h-11 w-full rounded border border-line bg-white px-3 text-sm text-ink"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Password</span>
                  <input
                    name="password"
                    type="password"
                    placeholder="Enter admin password"
                    className="mt-1 h-11 w-full rounded border border-line bg-white px-3 text-sm text-ink"
                  />
                </label>

                {message ? <p className="rounded border border-berry/25 bg-berry/10 p-3 text-sm text-berry">{message}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white transition hover:bg-pine disabled:cursor-not-allowed disabled:opacity-60"
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
    <main className="min-h-screen bg-[#f5f7f5] dark:bg-[#0b0f0e]">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
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
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-line bg-white text-ink transition hover:border-pine hover:text-pine"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={17} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-line bg-white text-ink transition hover:border-berry hover:text-berry"
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
